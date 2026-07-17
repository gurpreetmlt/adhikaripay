import { describe, expect, it } from "vitest";
import { canRecheckInitiated, INITIATED_RECHECK_GRACE_MS } from "../src/modules/transactions/txn.service";

// Security review (money-core): a `/recheck` on an `initiated` txn that is still mid-submit could,
// against a real provider, get "not found → failed" and reverse the up-front debit while the
// in-flight submit is about to succeed — refunding the retailer for a service that actually
// happened (a direct loss). recheck must refuse to act on `initiated` txns until the submit window
// has certainly elapsed. Pure gate — no DB.

describe("canRecheckInitiated — recheck race guard", () => {
  const created = new Date("2026-07-17T10:00:00.000Z");

  it("refuses recheck while the initiated txn is still inside the submit window", () => {
    const oneSecondLater = new Date(created.getTime() + 1_000);
    expect(canRecheckInitiated(created, oneSecondLater)).toBe(false);
  });

  it("refuses recheck just before the grace window closes", () => {
    const justBefore = new Date(created.getTime() + INITIATED_RECHECK_GRACE_MS - 1);
    expect(canRecheckInitiated(created, justBefore)).toBe(false);
  });

  it("allows recheck exactly at the grace boundary (crash-recovery becomes possible)", () => {
    const atBoundary = new Date(created.getTime() + INITIATED_RECHECK_GRACE_MS);
    expect(canRecheckInitiated(created, atBoundary)).toBe(true);
  });

  it("allows recheck well past the window (definitely no in-flight submit)", () => {
    const wellAfter = new Date(created.getTime() + INITIATED_RECHECK_GRACE_MS + 60_000);
    expect(canRecheckInitiated(created, wellAfter)).toBe(true);
  });
});
