import { eq, and, desc, sql, inArray } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import { db } from "../../db/postgres";
import {
  wallets,
  walletLedgerEntries,
  walletLedgerGroups,
  users,
  transactions,
} from "../../db/postgres/schema";
import { transferBetweenWallets, fundWallet } from "./wallet.ledger";
import { toPaise } from "./decimal";
import { HttpError } from "../../utils/httpError";
import { env } from "../../config/env";
import { insertAuditLog } from "../../db/postgres/repositories/auditLog";
import type { UserRole, WalletType } from "@adhikaripay/shared-types";

/**
 * Rejects a manual top-up above the configured single-call ceiling. Pure + cap-injected so the
 * limit is unit-testable without a DB. Returns the amount in paise on success.
 */
export function assertWithinManualFundCap(amount: string, capRupees: number): number {
  const paise = toPaise(amount);
  if (paise <= 0) throw new HttpError(422, "Amount must be positive", "INVALID_AMOUNT");
  if (paise > capRupees * 100) {
    throw new HttpError(
      422,
      `Single manual top-up cannot exceed ₹${capRupees.toLocaleString("en-IN")}`,
      "MANUAL_FUND_LIMIT_EXCEEDED",
    );
  }
  return paise;
}

type Actor = { id: string; role: UserRole };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Tx = PgTransaction<any, any, any>;

// Zero-balance wallet provisioning at onboarding time. Money movement (credit/debit/transfer
// with row-locking) lives in wallet.ledger.ts — this only creates the accounts.
export async function provisionWalletsForUser(tx: Tx, userId: string, role: UserRole): Promise<void> {
  await tx.insert(wallets).values({ userId, walletType: "main" });

  if (role === "retailer") {
    await tx.insert(wallets).values({ userId, walletType: "aeps" });
  }
}

/**
 * Available balance from wallets table, plus pendingBalance = sum of open txn
 * amounts for that wallet (status pending|initiated). For debit flows money is
 * already moved to the system wallet while the provider is unsettled; pending
 * shows that reserved/in-flight total so retailers can see Locked vs Available.
 */
export async function getWalletBalances(userId: string) {
  const rows = await db.select().from(wallets).where(eq(wallets.userId, userId));

  const pendingRows = await db
    .select({
      walletType: transactions.walletType,
      pending: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
    })
    .from(transactions)
    .where(
      and(eq(transactions.userId, userId), inArray(transactions.status, ["pending", "initiated"])),
    )
    .groupBy(transactions.walletType);

  const pendingByType = new Map<string, string>();
  for (const row of pendingRows) {
    const key = row.walletType ?? "main";
    const n = Number(row.pending);
    pendingByType.set(key, Number.isFinite(n) ? n.toFixed(2) : "0.00");
  }

  return rows.map((w) => ({
    ...w,
    pendingBalance: pendingByType.get(w.walletType) ?? "0.00",
  }));
}

async function getWalletOrThrow(userId: string, walletType: WalletType) {
  const [wallet] = await db
    .select()
    .from(wallets)
    .where(and(eq(wallets.userId, userId), eq(wallets.walletType, walletType)));
  if (!wallet) throw new HttpError(404, `${walletType} wallet not found for this user`, "WALLET_NOT_FOUND");
  return wallet;
}

// A parent can only fund the wallet of a user they directly onboarded — mirrors how money
// actually flows down the distributor network (distributor -> their own retailer, not anyone else's).
export async function transferToChild(
  actor: Actor,
  targetUserId: string,
  walletType: WalletType,
  amount: string,
  description?: string,
): Promise<{ groupId: string }> {
  const [target] = await db.select().from(users).where(eq(users.id, targetUserId));
  if (!target) throw new HttpError(404, "Target user not found", "USER_NOT_FOUND");
  if (target.parentId !== actor.id) {
    throw new HttpError(403, "You can only fund users you directly onboarded", "NOT_YOUR_DOWNLINE");
  }

  const fromWallet = await getWalletOrThrow(actor.id, "main");
  const toWallet = await getWalletOrThrow(targetUserId, walletType);

  return transferBetweenWallets({
    fromWalletId: fromWallet.id,
    toWalletId: toWallet.id,
    amount,
    referenceType: "downline_transfer",
    referenceId: targetUserId,
    description,
  });
}

// Admin-only entry point for money entering the system from outside (bank reconciliation).
// Capped per call and written to the immutable audit log with the acting admin's identity.
export async function adminFundOwnWallet(
  actor: Actor,
  amount: string,
  description?: string,
): Promise<{ groupId: string }> {
  assertWithinManualFundCap(amount, env.MAX_MANUAL_FUND_RUPEES);
  const wallet = await getWalletOrThrow(actor.id, "main");
  const result = await fundWallet({ walletId: wallet.id, amount, description });
  await insertAuditLog({
    userId: actor.id,
    action: "wallet.manual_fund",
    entityType: "wallet",
    entityId: wallet.id,
    metadata: { amount, description: description ?? null, ledgerGroupId: result.groupId },
  });
  return result;
}

export interface LedgerEntryView {
  id: string;
  walletType: WalletType;
  entryType: "debit" | "credit";
  amount: string;
  balanceAfter: string;
  referenceType: string;
  referenceId: string | null;
  description: string | null;
  createdAt: Date;
}

// Powers the "Passbook" screen — every ledger line for a user, across all their wallets.
export async function getWalletLedger(
  userId: string,
  { limit, offset }: { limit: number; offset: number },
): Promise<LedgerEntryView[]> {
  const rows = await db
    .select({
      id: walletLedgerEntries.id,
      walletType: wallets.walletType,
      entryType: walletLedgerEntries.entryType,
      amount: walletLedgerEntries.amount,
      balanceAfter: walletLedgerEntries.balanceAfter,
      referenceType: walletLedgerGroups.referenceType,
      referenceId: walletLedgerGroups.referenceId,
      description: walletLedgerGroups.description,
      createdAt: walletLedgerEntries.createdAt,
    })
    .from(walletLedgerEntries)
    .innerJoin(wallets, eq(wallets.id, walletLedgerEntries.walletId))
    .innerJoin(walletLedgerGroups, eq(walletLedgerGroups.id, walletLedgerEntries.groupId))
    .where(eq(wallets.userId, userId))
    .orderBy(desc(walletLedgerEntries.createdAt))
    .limit(limit)
    .offset(offset);

  return rows;
}
