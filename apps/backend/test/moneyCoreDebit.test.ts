import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { and, eq, inArray } from "drizzle-orm";
import { db, pgPool } from "../src/db/postgres";
import { transactions } from "../src/db/postgres/schema";
import { recheckTxnStatus } from "../src/modules/transactions/txn.service";
import { createWorld, type World } from "./helpers/world";

let w: World;

beforeAll(async () => {
  w = await createWorld(`d${Date.now().toString(36)}`);
  await w.addService("dmt");
  await w.addService("aeps");
});

beforeEach(async () => {
  await w.setBalance(w.retailerMainWalletId, "0");
  await w.setBalance(w.retailerAepsWalletId, "0");
  await db.delete(transactions).where(eq(transactions.userId, w.retailerId));
});

afterAll(async () => {
  await w.destroy();
  await pgPool.end();
});

describe("debit path — double-spend & idempotency (P1)", () => {
  it("P1.1 two concurrent full-balance debits: exactly one wins, balance floors at 0", async () => {
    await w.setBalance(w.retailerMainWalletId, "100.00");

    const results = await Promise.allSettled([
      w.runDmt("100.00", `p11-a-${w.suffix}`),
      w.runDmt("100.00", `p11-b-${w.suffix}`),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled").length;
    const rejected = results.filter((r) => r.status === "rejected").length;
    expect(fulfilled).toBe(1); // one debit went through
    expect(rejected).toBe(1); // the other hit INSUFFICIENT_BALANCE
    expect(await w.getBalance(w.retailerMainWalletId)).toBe("0.00"); // never negative, never double-spent
  });

  it("P1.2 same idempotency key twice concurrently: one txn, money moves once", async () => {
    await w.setBalance(w.retailerMainWalletId, "100.00");
    const key = `p12-${w.suffix}`;

    await Promise.allSettled([w.runDmt("50.00", key), w.runDmt("50.00", key)]);

    const rows = await db.select({ id: transactions.id }).from(transactions).where(eq(transactions.idempotencyKey, key));
    expect(rows.length).toBe(1); // unique constraint + re-read: never two rows
    expect(await w.getBalance(w.retailerMainWalletId)).toBe("50.00"); // debited once, not twice
  });

  it("P1.3 failed debit reverses exactly once; rechecking the failed txn moves no money", async () => {
    await w.setBalance(w.retailerMainWalletId, "100.00");

    const outcome = await w.runDmt("50.99", `p13-${w.suffix}`); // mock .99 => provider declines
    expect(outcome.txn.status).toBe("failed");
    expect(await w.getBalance(w.retailerMainWalletId)).toBe("100.00"); // debited then reversed => net 0

    // Rechecking a terminal (failed) txn must be a no-op — no second reversal.
    await recheckTxnStatus({ id: w.retailerId, role: "retailer" }, outcome.txn.txnRef).catch(() => undefined);
    expect(await w.getBalance(w.retailerMainWalletId)).toBe("100.00");
  });

  it("P2.4 insufficient balance is rejected and leaves the balance untouched", async () => {
    await w.setBalance(w.retailerMainWalletId, "30.00");
    await expect(w.runDmt("100.00", `p24-${w.suffix}`)).rejects.toMatchObject({ code: "INSUFFICIENT_BALANCE" });
    expect(await w.getBalance(w.retailerMainWalletId)).toBe("30.00");
  });
});

describe("AEPS credit only after provider success (P2.6)", () => {
  it("credits only the successful withdrawal, never the pending or failed one", async () => {
    await Promise.allSettled([
      w.runAeps("500.00", `p26-ok-${w.suffix}`), // success => credit
      w.runAeps("500.98", `p26-pending-${w.suffix}`), // pending => no credit
      w.runAeps("500.99", `p26-failed-${w.suffix}`), // failed => no credit
    ]);

    expect(await w.getBalance(w.retailerAepsWalletId)).toBe("500.00");

    const settled = await db
      .select({ status: transactions.status })
      .from(transactions)
      .where(and(eq(transactions.userId, w.retailerId), inArray(transactions.status, ["success"])));
    expect(settled.length).toBe(1); // exactly one success credited
  });
});
