import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { db, pgPool } from "../src/db/postgres";
import {
  users,
  wallets,
  services,
  serviceCategories,
  transactions,
  userHierarchy,
  commissionRules,
  commissionLedger,
  walletLedgerEntries,
  walletLedgerGroups,
} from "../src/db/postgres/schema";
import { distributeCommissionForTxn } from "../src/modules/commission/commission.service";

// High-3 regression: commission distribution must pay each beneficiary exactly once per txn, even
// if the distributor runs concurrently. The racy read-then-act guard alone let concurrent runs
// double-pay; the unique (transaction_id, beneficiary_user_id) constraint + atomic transfer+insert
// close it.

const SUFFIX = Date.now().toString(36);
const PAYOUT = "10.00";
const CONCURRENCY = 8;
const SYSTEM_FLOAT = "1000000.00";

let adminId: string;
let adminWalletId: string;
let distId: string;
let distWalletId: string;
let retailerId: string;
let serviceId: string;
let categoryId: string;
let txnId: string;

beforeAll(async () => {
  const [existingAdmin] = await db.select().from(users).where(eq(users.role, "admin")).limit(1);
  adminId = existingAdmin!.id;
  const [adminWallet] = await db
    .select()
    .from(wallets)
    .where(and(eq(wallets.userId, adminId), eq(wallets.walletType, "main")));
  adminWalletId = adminWallet!.id;
  await db.update(wallets).set({ balance: SYSTEM_FLOAT }).where(eq(wallets.id, adminWalletId));

  // Distributor (the beneficiary we expect paid once).
  const [d] = await db
    .insert(users)
    .values({ uid: `DS${SUFFIX}`, role: "distributor", name: "Sec Test Dist", mobile: `7${SUFFIX.slice(-9).padStart(9, "0")}`, passwordHash: "x", parentId: adminId })
    .returning();
  distId = d!.id;
  const [dw] = await db.insert(wallets).values({ userId: distId, walletType: "main", balance: "0" }).returning();
  distWalletId = dw!.id;
  await db.insert(userHierarchy).values({ ancestorId: distId, descendantId: distId, depth: 0 });

  // Retailer under the distributor.
  const [r] = await db
    .insert(users)
    .values({ uid: `RT${SUFFIX}`, role: "retailer", name: "Sec Test Retailer", mobile: `6${SUFFIX.slice(-9).padStart(9, "0")}`, passwordHash: "x", parentId: distId, kycStatus: "verified" })
    .returning();
  retailerId = r!.id;
  await db.insert(userHierarchy).values([
    { ancestorId: retailerId, descendantId: retailerId, depth: 0 },
    { ancestorId: distId, descendantId: retailerId, depth: 1 },
    { ancestorId: adminId, descendantId: retailerId, depth: 2 },
  ]);

  const [cat] = await db.insert(serviceCategories).values({ code: `sec_${SUFFIX}`, name: "Sec Test" }).returning();
  categoryId = cat!.id;
  const [svc] = await db.insert(services).values({ categoryId, code: `sectest_comm_${SUFFIX}`, name: "Sec Test Comm" }).returning();
  serviceId = svc!.id;

  // Flat ₹10 commission for the distributor role on this service.
  await db.insert(commissionRules).values({ serviceId, role: "distributor", ruleType: "flat", value: PAYOUT });

  // A settled (success) transaction by the retailer.
  const [txn] = await db
    .insert(transactions)
    .values({ txnRef: `SECCOMM-${SUFFIX}`, idempotencyKey: `seccomm-${SUFFIX}`, userId: retailerId, serviceId, amount: "5000.00", status: "success", walletType: "main" })
    .returning();
  txnId = txn!.id;
});

afterAll(async () => {
  const groups = await db.select({ id: walletLedgerGroups.id }).from(walletLedgerGroups).where(eq(walletLedgerGroups.referenceId, txnId));
  for (const g of groups) await db.delete(walletLedgerEntries).where(eq(walletLedgerEntries.groupId, g.id));
  await db.delete(commissionLedger).where(eq(commissionLedger.transactionId, txnId));
  await db.delete(walletLedgerGroups).where(eq(walletLedgerGroups.referenceId, txnId));
  await db.delete(transactions).where(eq(transactions.id, txnId));
  await db.delete(commissionRules).where(eq(commissionRules.serviceId, serviceId));
  await db.delete(services).where(eq(services.id, serviceId));
  await db.delete(serviceCategories).where(eq(serviceCategories.id, categoryId));
  await db.delete(userHierarchy).where(eq(userHierarchy.descendantId, retailerId));
  await db.delete(userHierarchy).where(eq(userHierarchy.descendantId, distId));
  await db.delete(wallets).where(eq(wallets.userId, retailerId));
  await db.delete(wallets).where(eq(wallets.userId, distId));
  await db.delete(users).where(eq(users.id, retailerId));
  await db.delete(users).where(eq(users.id, distId));
  await pgPool.end();
});

describe("commission distribution idempotency (High-3)", () => {
  it("pays each beneficiary exactly once under concurrent distribution", async () => {
    await Promise.all(
      Array.from({ length: CONCURRENCY }, () => distributeCommissionForTxn(txnId).catch(() => undefined)),
    );

    const [distWallet] = await db.select().from(wallets).where(eq(wallets.id, distWalletId));
    expect(distWallet!.balance).toBe(PAYOUT);

    const rows = await db
      .select({ id: commissionLedger.id })
      .from(commissionLedger)
      .where(and(eq(commissionLedger.transactionId, txnId), eq(commissionLedger.beneficiaryUserId, distId)));
    expect(rows.length).toBe(1);
  });
});
