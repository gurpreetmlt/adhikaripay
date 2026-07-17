import { afterAll, describe, expect, it } from "vitest";
import { pgPool } from "../src/db/postgres";
import { assertFreshBiometric } from "../src/modules/transactions/biometricReplay";

// UIDAI PID blocks are single-use and time-bound. This is the server-side guard that makes a
// captured fingerprint scan unusable a second time — the real mechanism behind "retry a failed
// transaction => scan again", enforced even if a client tried to resubmit stale data.

afterAll(async () => {
  await pgPool.end();
});

function withTs(offsetMs: number): string {
  const ts = new Date(Date.now() + offsetMs).toISOString();
  return `<Pid ver="2.0" ts="${ts}"><Data type="X">mockpayload-${Math.random()}</Data></Pid>`;
}

describe("assertFreshBiometric", () => {
  it("accepts a payload the first time, rejects the identical payload on replay", async () => {
    const payload = `replay-test-${Date.now()}-${Math.random()}`;
    await expect(assertFreshBiometric(payload)).resolves.toBeUndefined();
    await expect(assertFreshBiometric(payload)).rejects.toMatchObject({ code: "STALE_BIOMETRIC_RETRY_REQUIRED" });
  });

  it("accepts a payload with a fresh embedded timestamp", async () => {
    await expect(assertFreshBiometric(withTs(-5_000))).resolves.toBeUndefined(); // captured 5s ago
  });

  it("rejects a payload whose embedded timestamp is stale", async () => {
    await expect(assertFreshBiometric(withTs(-180_000))).rejects.toMatchObject({ code: "STALE_BIOMETRIC_TIMESTAMP" }); // 3 min old
  });

  it("rejects a payload timestamped implausibly in the future (clock-skew abuse)", async () => {
    await expect(assertFreshBiometric(withTs(30_000))).rejects.toMatchObject({ code: "STALE_BIOMETRIC_TIMESTAMP" });
  });

  it("still enforces hash-uniqueness on payloads without an embedded timestamp (mock/test data)", async () => {
    const payload = `no-ts-payload-${Date.now()}`;
    await expect(assertFreshBiometric(payload)).resolves.toBeUndefined();
    await expect(assertFreshBiometric(payload)).rejects.toMatchObject({ code: "STALE_BIOMETRIC_RETRY_REQUIRED" });
  });
});
