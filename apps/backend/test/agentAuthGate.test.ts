import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db, pgPool } from "../src/db/postgres";
import { users } from "../src/db/postgres/schema";
import { assertAgentAuthFresh, AGENT_AUTH_WINDOW_MS } from "../src/modules/auth/agentAuth";

// Agent-auth = retailer proving THEIR OWN presence at the counter, separate from the customer's
// AEPS biometric. Money endpoints (AEPS + DMT) must refuse to run without a fresh one.

const SUFFIX = `aa${Date.now().toString(36)}`;
let userId: string;

beforeAll(async () => {
  const [u] = await db
    .insert(users)
    .values({ uid: `AA${SUFFIX}`, role: "retailer", name: "Agent Auth Test", mobile: `62${SUFFIX.slice(-8).padStart(8, "0")}`, passwordHash: "x" })
    .returning();
  userId = u!.id;
});

afterAll(async () => {
  await db.delete(users).where(eq(users.id, userId));
  await pgPool.end();
});

describe("assertAgentAuthFresh", () => {
  it("blocks a user who has never agent-authed", async () => {
    await expect(assertAgentAuthFresh(userId)).rejects.toMatchObject({ code: "AGENT_AUTH_REQUIRED" });
  });

  it("passes right after a fresh agent-auth", async () => {
    await db.update(users).set({ lastAgentAuthAt: new Date() }).where(eq(users.id, userId));
    await expect(assertAgentAuthFresh(userId)).resolves.toBeUndefined();
  });

  it("passes just inside the rolling window", async () => {
    const almostExpired = new Date(Date.now() - (AGENT_AUTH_WINDOW_MS - 60_000));
    await db.update(users).set({ lastAgentAuthAt: almostExpired }).where(eq(users.id, userId));
    await expect(assertAgentAuthFresh(userId)).resolves.toBeUndefined();
  });

  it("blocks once the rolling window has lapsed", async () => {
    const expired = new Date(Date.now() - (AGENT_AUTH_WINDOW_MS + 60_000));
    await db.update(users).set({ lastAgentAuthAt: expired }).where(eq(users.id, userId));
    await expect(assertAgentAuthFresh(userId)).rejects.toMatchObject({ code: "AGENT_AUTH_REQUIRED" });
  });
});
