import { describe, expect, it } from "vitest";
import { resolveCreditSettlementAmount } from "../src/modules/transactions/txn.service";

describe("resolveCreditSettlementAmount", () => {
  it("uses locked amount when provider amount is null/empty", () => {
    expect(resolveCreditSettlementAmount("500.00", null)).toBe("500.00");
    expect(resolveCreditSettlementAmount("500.00", "")).toBe("500.00");
  });

  it("uses provider-confirmed amount when valid and positive", () => {
    expect(resolveCreditSettlementAmount("500.00", "450.00")).toBe("450.00");
    expect(resolveCreditSettlementAmount("500.00", "500.50")).toBe("500.50");
  });

  it("falls back to locked when provider amount is zero/negative/garbage", () => {
    expect(resolveCreditSettlementAmount("500.00", "0")).toBe("500.00");
    expect(resolveCreditSettlementAmount("500.00", "0.00")).toBe("500.00");
    expect(resolveCreditSettlementAmount("500.00", "-10.00")).toBe("500.00");
    expect(resolveCreditSettlementAmount("500.00", "not-a-number")).toBe("500.00");
  });
});
