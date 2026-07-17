import { describe, expect, it } from "vitest";
import { isStubBlocked } from "../src/modules/providers/provider.router";

// Critical-2 regression: a stub/mock provider fabricates "success" with no real bank payout, so
// settling money on it would mint float. It must be refused in production unless explicitly opted
// in. Real (non-stub) providers are never blocked.

const stub = { isStub: true };
const real = { isStub: false };
const unmarked = {}; // adapter without the flag == real

describe("isStubBlocked (Critical-2 mock-in-prod gate)", () => {
  it("blocks a stub in production without the opt-in", () => {
    expect(isStubBlocked(stub, "production", false)).toBe(true);
  });

  it("allows a stub in production only with the explicit opt-in", () => {
    expect(isStubBlocked(stub, "production", true)).toBe(false);
  });

  it("allows a stub outside production (dev/staging)", () => {
    expect(isStubBlocked(stub, "development", false)).toBe(false);
    expect(isStubBlocked(stub, "test", false)).toBe(false);
  });

  it("never blocks a real provider", () => {
    expect(isStubBlocked(real, "production", false)).toBe(false);
    expect(isStubBlocked(unmarked, "production", false)).toBe(false);
  });
});
