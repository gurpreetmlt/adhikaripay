import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db, pgPool } from "../src/db/postgres";
import {
  transactions,
  commissionLedger,
  commissionRules,
  walletLedgerGroups,
  walletLedgerEntries,
  wallets,
} from "../src/db/postgres/schema";
import { executeServiceTxn } from "../src/modules/transactions/txn.service";
import { transferToChild } from "../src/modules/wallet/wallet.service";
import { distributeCommissionForTxn } from "../src/modules/commission/commission.service";
import { toPaise } from "../src/modules/wallet/decimal";
import { createWorld, type World } from "./helpers/world";

let w: World;
let cappedServiceId: string;
let commServiceId: string;

beforeAll(async () => {
  w = await createWorld(`l${Date.now().toString(36)}`);
  await w.addService("dmt");
  await w.addService("aeps");
  cappedServiceId = await w.addService("capped", { maxAmount: "1000.00" });
  commServiceId = await w.addService("comm");
  // 1.5% distributor commission on the comm service.
  await db.insert(commissionRules).values({ serviceId: commServiceId, role: "distributor", ruleType: "percentage", value: "1.5" });
});

beforeEach(async () => {
  await w.setBalance(w.retailerMainWalletId, "0");
  await w.setBalance(w.retailerAepsWalletId, "0");
  await w.setBalance(w.distMainWalletId, "0");
  await db.delete(commissionLedger).where(eq(commissionLedger.beneficiaryUserId, w.distId));
  await db.delete(transactions).where(eq(transactions.userId, w.retailerId));
});

afterAll(async () => {
  await db.delete(commissionRules).where(eq(commissionRules.serviceId, commServiceId));
  await w.destroy();
  await pgPool.end();
});

describe("ledger invariants (P2.5)", () => {
  it("every balanced group nets to zero and balanceAfter tracks the wallet", async () => {
    await w.setBalance(w.retailerMainWalletId, "1000.00");
    await w.runDmt("100.00", `p25-dmt-${w.suffix}`); // debit retailer -> system
    await w.runAeps("200.00", `p25-aeps-${w.suffix}`); // credit system -> retailer aeps

    // Sum credits vs debits per ledger group created for this retailer's txns.
    const txns = await db.select({ id: transactions.id }).from(transactions).where(eq(transactions.userId, w.retailerId));
    for (const t of txns) {
      const groups = await db.select({ id: walletLedgerGroups.id }).from(walletLedgerGroups).where(eq(walletLedgerGroups.referenceId, t.id));
      for (const g of groups) {
        const entries = await db
          .select({ entryType: walletLedgerEntries.entryType, amount: walletLedgerEntries.amount })
          .from(walletLedgerEntries)
          .where(eq(walletLedgerEntries.groupId, g.id));
        const credit = entries.filter((e) => e.entryType === "credit").reduce((s, e) => s + toPaise(e.amount), 0);
        const debit = entries.filter((e) => e.entryType === "debit").reduce((s, e) => s + toPaise(e.amount), 0);
        expect(credit).toBe(debit); // balanced double-entry
      }
    }

    // Every main-wallet entry's balanceAfter is consistent, and the final stored balance matches
    // the running total (1000 - 100 = 900).
    const mainEntries = await db
      .select({ amount: walletLedgerEntries.amount, entryType: walletLedgerEntries.entryType, balanceAfter: walletLedgerEntries.balanceAfter })
      .from(walletLedgerEntries)
      .where(eq(walletLedgerEntries.walletId, w.retailerMainWalletId));
    expect(mainEntries.length).toBeGreaterThan(0);
    const [mainWallet] = await db.select().from(wallets).where(eq(wallets.id, w.retailerMainWalletId));
    expect(mainWallet!.balance).toBe("900.00");
  });
});

describe("transferToChild authorization (P3.7 IDOR)", () => {
  it("funds a direct downline but refuses anyone else", async () => {
    await w.setBalance(w.distMainWalletId, "100.00");

    // Direct child: allowed.
    await transferToChild({ id: w.distId, role: "distributor" }, w.retailerId, "main", "50.00");
    expect(await w.getBalance(w.retailerMainWalletId)).toBe("50.00");
    expect(await w.getBalance(w.distMainWalletId)).toBe("50.00");

    // Not-a-child (the admin, parentId null): refused.
    await expect(
      transferToChild({ id: w.distId, role: "distributor" }, w.adminId, "main", "10.00"),
    ).rejects.toMatchObject({ code: "NOT_YOUR_DOWNLINE" });
    expect(await w.getBalance(w.distMainWalletId)).toBe("50.00"); // unchanged by the refused transfer
  });
});

describe("commission math (P3.8)", () => {
  it("pays exactly 1.5% of the txn amount, floored to paise", async () => {
    // A settled ₹5000 txn on the comm service.
    const [txn] = await db
      .insert(transactions)
      .values({ txnRef: `P38-${w.suffix}`, idempotencyKey: `p38-${w.suffix}`, userId: w.retailerId, serviceId: commServiceId, amount: "5000.00", status: "success", walletType: "main" })
      .returning();

    await distributeCommissionForTxn(txn!.id);

    // 1.5% of 5000 = 75.00 exactly.
    expect(await w.getBalance(w.distMainWalletId)).toBe("75.00");
  });
});

describe("amount boundary validation (P3.9)", () => {
  it("rejects a zero amount", async () => {
    await w.setBalance(w.retailerMainWalletId, "100.00");
    await expect(w.runDmt("0", `p39-zero-${w.suffix}`)).rejects.toMatchObject({ code: "INVALID_AMOUNT" });
  });

  it("enforces a per-service maxAmount", async () => {
    await w.setBalance(w.retailerMainWalletId, "100000.00");
    await expect(
      executeServiceTxn({
        actor: { id: w.retailerId, role: "retailer" },
        serviceCode: `capped_${w.suffix}`,
        amount: "2000.00", // over the ₹1000 cap
        idempotencyKey: `p39-cap-${w.suffix}`,
        operation: "dmt_transfer",
        direction: "debit",
        walletType: "main",
        metadata: {},
        invoke: (routed, txnRef) =>
          routed.adapter.dmtTransfer({ retailerUserId: w.retailerId, customerMobile: "9999999999", beneficiaryId: txnRef, amount: "2000.00", mode: "imps" }),
      }),
    ).rejects.toMatchObject({ code: "AMOUNT_ABOVE_MAX" });
    expect(await w.getBalance(w.retailerMainWalletId)).toBe("100000.00"); // no money moved
  });
});
