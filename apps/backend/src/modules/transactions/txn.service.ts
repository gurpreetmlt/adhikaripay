import { and, eq, isNull, desc } from "drizzle-orm";
import { db } from "../../db/postgres";
import { services, transactions, users, wallets } from "../../db/postgres/schema";
import { transferBetweenWallets } from "../wallet/wallet.ledger";
import { toPaise } from "../wallet/decimal";
import { resolveProvidersForService, callProvider, type RoutedProvider } from "../providers/provider.router";
import type { ProviderOperation, ProviderResult } from "../providers/types";
import { HttpError } from "../../utils/httpError";
import { generateTxnRef } from "../../utils/uid";
import { logger } from "../../utils/logger";
import { insertAuditLog } from "../../db/postgres/repositories/auditLog";
import type { UserRole, WalletType } from "@adhikaripay/shared-types";

type Actor = { id: string; role: UserRole };
type TxnRow = typeof transactions.$inferSelect;

// Which direction money moves for a service, from the retailer's point of view.
//  - debit  (DMT/BBPS/recharge/...): retailer wallet -> system wallet, then provider pays out.
//  - credit (AEPS withdraw/Aadhaar Pay): retailer hands cash over the counter and is
//    reimbursed system wallet -> retailer AEPS wallet — but only AFTER provider success,
//    so nothing moves up-front for credit-type services.
type MoneyDirection = "debit" | "credit" | "none";

export interface ExecuteTxnInput {
  actor: Actor;
  serviceCode: string;
  amount: string | null;
  idempotencyKey: string;
  operation: ProviderOperation;
  direction: MoneyDirection;
  /** Retailer-side wallet the money leaves from / lands in. */
  walletType: WalletType;
  metadata: Record<string, unknown>;
  invoke: (routed: RoutedProvider, txnRef: string) => Promise<ProviderResult>;
}

export interface TxnOutcome {
  txn: TxnRow;
  provider: ProviderResult | null;
}

// The platform's own settlement counterparty: the root admin's main wallet.
// Every service txn nets against it, so float usage is always visible in one place.
async function getSystemWallet(): Promise<{ walletId: string }> {
  const [rootAdmin] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, "admin"), isNull(users.parentId)))
    .limit(1);
  if (!rootAdmin) throw new HttpError(500, "System wallet not configured", "SYSTEM_WALLET_MISSING");

  const [wallet] = await db
    .select({ id: wallets.id })
    .from(wallets)
    .where(and(eq(wallets.userId, rootAdmin.id), eq(wallets.walletType, "main")));
  if (!wallet) throw new HttpError(500, "System wallet not configured", "SYSTEM_WALLET_MISSING");
  return { walletId: wallet.id };
}

async function getUserWallet(userId: string, walletType: WalletType): Promise<{ walletId: string }> {
  const [wallet] = await db
    .select({ id: wallets.id })
    .from(wallets)
    .where(and(eq(wallets.userId, userId), eq(wallets.walletType, walletType)));
  if (!wallet) throw new HttpError(404, `${walletType} wallet not found`, "WALLET_NOT_FOUND");
  return { walletId: wallet.id };
}

async function assertCanTransact(actor: Actor): Promise<void> {
  const [user] = await db.select().from(users).where(eq(users.id, actor.id));
  if (!user || !user.isActive) throw new HttpError(403, "Account is not active", "ACCOUNT_INACTIVE");
  if (user.kycStatus !== "verified") {
    throw new HttpError(403, "Complete KYC verification to transact", "KYC_NOT_VERIFIED");
  }
}

async function getServiceOrThrow(serviceCode: string) {
  const [service] = await db.select().from(services).where(eq(services.code, serviceCode));
  if (!service || !service.isActive) {
    throw new HttpError(503, "This service is currently unavailable", "SERVICE_DISABLED");
  }
  return service;
}

function assertAmountWithinLimits(
  amount: string | null,
  service: { minAmount: string | null; maxAmount: string | null; name: string },
): void {
  if (amount == null) return;
  const paise = toPaise(amount);
  if (paise <= 0) throw new HttpError(422, "Amount must be positive", "INVALID_AMOUNT");
  if (service.minAmount && paise < toPaise(service.minAmount)) {
    throw new HttpError(422, `Minimum amount for ${service.name} is ₹${service.minAmount}`, "AMOUNT_BELOW_MIN");
  }
  if (!service.maxAmount) {
    throw new HttpError(503, `${service.name} has no max amount configured`, "AMOUNT_LIMIT_MISSING");
  }
  if (paise > toPaise(service.maxAmount)) {
    throw new HttpError(422, `Maximum amount for ${service.name} is ₹${service.maxAmount}`, "AMOUNT_ABOVE_MAX");
  }
}

// ── The engine ──────────────────────────────────────────────────────────────
// Sequence: idempotency-replay -> validations -> hold money (debit services)
// -> provider call -> finalize (commit / reverse / stay pending).
export async function executeServiceTxn(input: ExecuteTxnInput): Promise<TxnOutcome> {
  const { actor, serviceCode, amount, idempotencyKey, operation, direction, walletType, metadata, invoke } = input;

  // Idempotent replay: same key for this user returns the original outcome, never re-executes.
  const [existing] = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.idempotencyKey, idempotencyKey), eq(transactions.userId, actor.id)));
  if (existing) return { txn: existing, provider: null };

  await assertCanTransact(actor);
  const service = await getServiceOrThrow(serviceCode);
  assertAmountWithinLimits(amount, service);

  const routedProviders = await resolveProvidersForService(serviceCode);
  const routed = routedProviders[0]!; // fail-over between providers is a later enhancement

  const txnRef = generateTxnRef();
  const needsMoney = direction !== "none" && amount != null;
  const systemWallet = needsMoney ? await getSystemWallet() : null;
  const userWallet = needsMoney ? await getUserWallet(actor.id, walletType) : null;

  // 1. Record intent. A unique-violation race on idempotencyKey means a parallel
  //    duplicate request — surface the original by re-reading.
  let txn: TxnRow;
  try {
    const [created] = await db
      .insert(transactions)
      .values({
        txnRef,
        idempotencyKey,
        userId: actor.id,
        serviceId: service.id,
        providerId: routed.providerId,
        amount: amount ?? "0",
        status: "initiated",
        walletType,
        metadata,
      })
      .returning();
    txn = created!;
  } catch (err) {
    const [raced] = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.idempotencyKey, idempotencyKey), eq(transactions.userId, actor.id)));
    if (raced) return { txn: raced, provider: null };
    throw err;
  }

  // 2. For debit services, move the money BEFORE calling the provider — the
  //    balance check is atomic inside the transfer, so an insufficient wallet
  //    can never reach the provider at all.
  if (needsMoney && direction === "debit") {
    try {
      await transferBetweenWallets({
        fromWalletId: userWallet!.walletId,
        toWalletId: systemWallet!.walletId,
        amount: amount!,
        referenceType: "service_txn",
        referenceId: txn.id,
        description: `${service.name} ${txnRef}`,
      });
    } catch (err) {
      await db
        .update(transactions)
        .set({ status: "failed", failureReason: "Wallet debit failed", updatedAt: new Date() })
        .where(eq(transactions.id, txn.id));
      throw err;
    }
  }

  // 3. Provider call.
  const result = await callProvider(routed, operation, txnRef, { ...metadata, amount }, (adapter) =>
    invoke({ ...routed, adapter }, txnRef),
  );

  // 4. Finalize.
  const finalized = await finalizeTxn(txn, result, { direction, walletType });
  return { txn: finalized, provider: result };
}

interface FinalizeContext {
  direction: MoneyDirection;
  walletType: WalletType;
}

// Settles a transaction exactly once. The whole thing runs in a single DB transaction that
// FIRST locks the txn row and re-checks its status: if a concurrent call (a second /recheck,
// or recheck racing the initial submit) already moved it to a terminal state, this call moves
// NO money and returns the settled row. Money movement and the status flip that authorizes it
// commit or roll back together, so a pending txn can never be credited/reversed twice.
async function finalizeTxn(txn: TxnRow, result: ProviderResult, ctx: FinalizeContext): Promise<TxnRow> {
  const needsMoney = ctx.direction !== "none" && toPaise(txn.amount) > 0;

  const { row: settled, didSettleSuccess } = await db.transaction(async (tx) => {
    const [locked] = await tx
      .select()
      .from(transactions)
      .where(eq(transactions.id, txn.id))
      .for("update");
    if (!locked) throw new HttpError(404, "Transaction not found", "TXN_NOT_FOUND");

    // Idempotency guard: only a txn still in flight may be settled. A terminal txn means a
    // concurrent finalize already ran — return it untouched, moving no money.
    if (locked.status !== "pending" && locked.status !== "initiated") {
      return { row: locked, didSettleSuccess: false };
    }

    if (result.status === "success") {
      // Credit services reimburse the retailer only now, after provider confirmation — in the
      // same tx as the status flip, so it commits atomically with "this txn is now settled".
      if (needsMoney && ctx.direction === "credit") {
        const systemWallet = await getSystemWallet();
        const userWallet = await getUserWallet(txn.userId, ctx.walletType);
        await transferBetweenWallets(
          {
            fromWalletId: systemWallet.walletId,
            toWalletId: userWallet.walletId,
            amount: locked.amount,
            referenceType: "service_txn",
            referenceId: locked.id,
            description: `Service credit ${locked.txnRef}`,
          },
          tx,
        );
      }
      const [updated] = await tx
        .update(transactions)
        .set({
          status: "success",
          providerTxnId: result.providerTxnId,
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(transactions.id, locked.id))
        .returning();
      return { row: updated!, didSettleSuccess: true };
    }

    if (result.status === "failed") {
      // Undo the up-front debit with an explicit balanced reversal group.
      if (needsMoney && ctx.direction === "debit") {
        const systemWallet = await getSystemWallet();
        const userWallet = await getUserWallet(txn.userId, ctx.walletType);
        await transferBetweenWallets(
          {
            fromWalletId: systemWallet.walletId,
            toWalletId: userWallet.walletId,
            amount: locked.amount,
            referenceType: "reversal",
            referenceId: locked.id,
            description: `Auto-reversal ${locked.txnRef}: ${result.message}`,
          },
          tx,
        );
      }
      const [updated] = await tx
        .update(transactions)
        .set({
          status: "failed",
          providerTxnId: result.providerTxnId,
          failureReason: result.message,
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(transactions.id, locked.id))
        .returning();
      return { row: updated!, didSettleSuccess: false };
    }

    // pending: money (if any) stays held with the system wallet until recheck resolves it.
    const [updated] = await tx
      .update(transactions)
      .set({ status: "pending", providerTxnId: result.providerTxnId, updatedAt: new Date() })
      .where(eq(transactions.id, locked.id))
      .returning();
    return { row: updated!, didSettleSuccess: false };
  });

  // Commission runs only for the single call that actually settled the txn to success, and only
  // after that commit — never for a concurrent no-op finalize. Fire-and-forget: a payout failure
  // must not fail the customer's transaction.
  if (didSettleSuccess) distributeCommissionSafe(settled);
  return settled;
}

// ── Status recheck (pending -> success/failed) ─────────────────────────────
export async function recheckTxnStatus(actor: Actor, txnRef: string): Promise<TxnOutcome> {
  const [txn] = await db.select().from(transactions).where(eq(transactions.txnRef, txnRef));
  if (!txn) throw new HttpError(404, "Transaction not found", "TXN_NOT_FOUND");
  if (actor.role !== "admin" && txn.userId !== actor.id) {
    throw new HttpError(403, "Not your transaction", "FORBIDDEN");
  }
  if (txn.status !== "pending" && txn.status !== "initiated") {
    return { txn, provider: null };
  }

  const [service] = await db.select().from(services).where(eq(services.id, txn.serviceId));
  if (!service) throw new HttpError(500, "Service missing for transaction", "SERVICE_MISSING");

  const routedProviders = await resolveProvidersForService(service.code);
  const routed = routedProviders[0]!;

  const result = await callProvider(routed, "check_status", txn.txnRef, { txnRef: txn.txnRef }, (adapter) =>
    adapter.checkStatus({ providerTxnId: txn.providerTxnId, clientRef: txn.txnRef }),
  );

  // Recheck context: services where money moved up-front are debit-type; AEPS
  // credit-type reimbursement happens in finalize on success.
  const direction: MoneyDirection = inferDirectionFromServiceCode(service.code);
  const walletType: WalletType = direction === "credit" ? "aeps" : "main";
  const finalized = await finalizeTxn(txn, result, { direction, walletType });

  await insertAuditLog({
    userId: actor.id,
    action: "txn.status_recheck",
    entityType: "transaction",
    entityId: txn.id,
    ipAddress: null,
    userAgent: null,
    metadata: { from: txn.status, to: finalized.status },
  });

  return { txn: finalized, provider: result };
}

export function inferDirectionFromServiceCode(code: string): MoneyDirection {
  if (code === "aeps_balance_enquiry" || code === "aeps_mini_statement") return "none";
  if (code.startsWith("aeps_") || code === "aadhaar_pay") return "credit";
  return "debit";
}

// ── History / receipt reads ─────────────────────────────────────────────────
export async function listMyTransactions(actor: Actor, limit = 50, offset = 0) {
  return db
    .select({
      id: transactions.id,
      txnRef: transactions.txnRef,
      amount: transactions.amount,
      status: transactions.status,
      walletType: transactions.walletType,
      serviceId: transactions.serviceId,
      serviceName: services.name,
      serviceCode: services.code,
      createdAt: transactions.createdAt,
      completedAt: transactions.completedAt,
    })
    .from(transactions)
    .innerJoin(services, eq(transactions.serviceId, services.id))
    .where(eq(transactions.userId, actor.id))
    .orderBy(desc(transactions.createdAt))
    .limit(Math.min(limit, 100))
    .offset(offset);
}

export async function getReceipt(actor: Actor, txnRef: string) {
  const [row] = await db
    .select({
      txnRef: transactions.txnRef,
      amount: transactions.amount,
      customerFee: transactions.customerFee,
      status: transactions.status,
      walletType: transactions.walletType,
      failureReason: transactions.failureReason,
      providerTxnId: transactions.providerTxnId,
      metadata: transactions.metadata,
      serviceName: services.name,
      serviceCode: services.code,
      userId: transactions.userId,
      initiatedAt: transactions.initiatedAt,
      completedAt: transactions.completedAt,
    })
    .from(transactions)
    .innerJoin(services, eq(transactions.serviceId, services.id))
    .where(eq(transactions.txnRef, txnRef));
  if (!row) throw new HttpError(404, "Transaction not found", "TXN_NOT_FOUND");
  if (actor.role !== "admin" && row.userId !== actor.id) {
    throw new HttpError(403, "Not your transaction", "FORBIDDEN");
  }
  return row;
}

// Placeholder until the commission engine lands (next module): logs instead of paying.
function distributeCommissionSafe(txn: TxnRow): void {
  import("../commission/commission.service")
    .then((mod) => mod.distributeCommissionForTxn(txn.id))
    .catch((err: unknown) => logger.error({ err, txnId: txn.id }, "commission distribution failed"));
}
