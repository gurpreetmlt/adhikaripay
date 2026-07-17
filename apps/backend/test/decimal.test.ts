import { describe, expect, it } from "vitest";
import { toPaise, fromPaise } from "../src/modules/wallet/decimal";

// Low-5: money <-> paise must use exact integer math, never binary float.

describe("toPaise", () => {
  it("converts 2-dp rupee strings exactly", () => {
    expect(toPaise("0")).toBe(0);
    expect(toPaise("1")).toBe(100);
    expect(toPaise("100.10")).toBe(10010);
    expect(toPaise("1234.56")).toBe(123456);
    expect(toPaise("0.01")).toBe(1);
  });

  it("handles amounts that are classically float-lossy", () => {
    // parseFloat("0.29")*100 = 28.999999999999996 — integer math must give exactly 29.
    expect(toPaise("0.29")).toBe(29);
    expect(toPaise("35.35")).toBe(3535);
    expect(toPaise("8.70")).toBe(870);
  });

  it("rounds half-up beyond 2 dp (commission rule values allow 4 dp)", () => {
    expect(toPaise("10.5000")).toBe(1050);
    expect(toPaise("10.5050")).toBe(1051);
    expect(toPaise("0.999")).toBe(100);
  });

  it("stays exact for large amounts within MAX_SAFE_INTEGER", () => {
    expect(toPaise("999999999999.99")).toBe(99999999999999);
    expect(Number.isSafeInteger(toPaise("999999999999.99"))).toBe(true);
  });
});

describe("fromPaise", () => {
  it("formats integer paise back to 2-dp rupee strings", () => {
    expect(fromPaise(0)).toBe("0.00");
    expect(fromPaise(1)).toBe("0.01");
    expect(fromPaise(10010)).toBe("100.10");
    expect(fromPaise(123456)).toBe("1234.56");
    expect(fromPaise(99999999999999)).toBe("999999999999.99");
  });

  it("round-trips", () => {
    for (const v of ["0.00", "0.01", "0.29", "8.70", "1234.56", "999999999999.99"]) {
      expect(fromPaise(toPaise(v))).toBe(v);
    }
  });
});
