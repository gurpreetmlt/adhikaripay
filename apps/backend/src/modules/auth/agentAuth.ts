import { eq } from "drizzle-orm";
import { db } from "../../db/postgres";
import { users } from "../../db/postgres/schema";
import { HttpError } from "../../utils/httpError";
import { decryptPII } from "../../utils/aes";
import { insertAuditLog } from "../../db/postgres/repositories/auditLog";
import { assertFreshBiometric } from "../transactions/biometricReplay";
import { resolveProvidersForService, callProvider } from "../providers/provider.router";

// Retailer-own-identity proof-of-presence, distinct from the customer's AEPS biometric. Money
// endpoints (AEPS + DMT) require this within a rolling window before they'll run — see
// wireAgentAuthGate in txn.controller.ts. Rolling, not calendar-day: consistent with
// DEVICE_TRUST_WINDOW_MS's reasoning (a 11:58pm/12:02am boundary is not "a new day").
export const AGENT_AUTH_WINDOW_MS = 12 * 60 * 60 * 1000;

export async function assertAgentAuthFresh(userId: string): Promise<void> {
  const [user] = await db.select({ lastAgentAuthAt: users.lastAgentAuthAt }).from(users).where(eq(users.id, userId));
  const last = user?.lastAgentAuthAt;
  if (!last || Date.now() - last.getTime() > AGENT_AUTH_WINDOW_MS) {
    throw new HttpError(
      403,
      "Scan your fingerprint to start today's session before using this service.",
      "AGENT_AUTH_REQUIRED",
    );
  }
}

/**
 * Verifies the retailer's own fingerprint against UIDAI (via the same provider used for AEPS)
 * and, on success, refreshes the rolling agent-auth window. The biometric replay-guard runs
 * first — a resubmitted/stale payload never reaches the provider call.
 */
export async function verifyAndRecordAgentAuth(
  actor: { id: string },
  biometricPayload: string,
  context: { ipAddress: string | null; userAgent: string | null },
): Promise<{ verifiedAt: Date }> {
  await assertFreshBiometric(biometricPayload);

  const [user] = await db.select().from(users).where(eq(users.id, actor.id));
  if (!user || !user.isActive) throw new HttpError(403, "Account is not active", "ACCOUNT_INACTIVE");
  if (!user.aadhaarNumberEncrypted) {
    throw new HttpError(422, "Complete KYC (Aadhaar) before agent authentication", "KYC_AADHAAR_REQUIRED");
  }
  const aadhaarNumber = decryptPII(user.aadhaarNumberEncrypted);

  // Reuses the AEPS provider mapping — agent auth is a UIDAI biometric check, same rail as AEPS,
  // so it inherits the same isStubBlocked production gate (no mock-provider trust for real auth).
  const routedProviders = await resolveProvidersForService("aeps_balance_enquiry");
  const result = await callProvider(
    routedProviders[0]!,
    "agent_auth",
    null,
    { aadhaarNumber },
    (adapter) => adapter.agentAuth({ retailerUserId: actor.id, aadhaarNumber, biometricPayload }),
  );

  if (!result.success) {
    await insertAuditLog({
      userId: actor.id,
      action: "auth.agent_auth_failed",
      entityType: "user",
      entityId: actor.id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: { message: result.message },
    });
    throw new HttpError(401, result.message || "Fingerprint did not match UIDAI records", "AGENT_AUTH_FAILED");
  }

  const verifiedAt = new Date();
  await db.update(users).set({ lastAgentAuthAt: verifiedAt, updatedAt: verifiedAt }).where(eq(users.id, actor.id));
  await insertAuditLog({
    userId: actor.id,
    action: "auth.agent_auth_verified",
    entityType: "user",
    entityId: actor.id,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    metadata: {},
  });

  return { verifiedAt };
}
