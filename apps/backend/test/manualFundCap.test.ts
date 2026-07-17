import { describe, expect, it } from "vitest";
import { assertWithinManualFundCap } from "../src/modules/wallet/wallet.service";
import { HttpError } from "../src/utils/httpError";

// Medium-4 regression: a single admin manual top-up mints float from outside the system, so it
// must be bounded. Amount within the cap is accepted; over the cap is rejected.

const CAP = 500000; // ₹5,00,000

describe("assertWithinManualFundCap (Medium-4 manual-fund ceiling)", () => {
  it("accepts an amount at or below the cap and returns paise", () => {
    expect(assertWithinManualFundCap("1000.00", CAP)).toBe(100000);
    expect(assertWithinManualFundCap("500000.00", CAP)).toBe(50000000);
  });

  it("rejects an amount above the cap", () => {
    expect(() => assertWithinManualFundCap("500000.01", CAP)).toThrowError(HttpError);
    expect(() => assertWithinManualFundCap("10000000.00", CAP)).toThrowError(/exceed/i);
  });

  it("rejects zero / negative", () => {
    expect(() => assertWithinManualFundCap("0", CAP)).toThrowError(/positive/i);
  });
});
