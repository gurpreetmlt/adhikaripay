import { eq } from "drizzle-orm";
import { db } from "../../db/postgres";
import { users } from "../../db/postgres/schema";
import { HttpError } from "../../utils/httpError";
import { decryptPII } from "../../utils/aes";
import { insertAuditLog } from "../../db/postgres/repositories/auditLog";
import { assertFreshBiometric } from "../transactions/biometricReplay";

// Retailer-own-identity proof-of-presence, distinct from the customer's AEPS biometric.
// NPCI daily 2FA is based on the Indian calendar day, not a rolling-hour window.
function indiaDayKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export async function getAgentAuthStatus(userId: string): Promise<{
  verifiedToday: boolean;
  lastVerifiedAt: Date | null;
  kycReady: boolean;
}> {
  const [user] = await db
    .select({
      lastAgentAuthAt: users.lastAgentAuthAt,
      aadhaarNumberEncrypted: users.aadhaarNumberEncrypted,
    })
    .from(users)
    .where(eq(users.id, userId));
  const last = user?.lastAgentAuthAt ?? null;
  return {
    verifiedToday: Boolean(last && indiaDayKey(last) === indiaDayKey(new Date())),
    lastVerifiedAt: last,
    kycReady: Boolean(user?.aadhaarNumberEncrypted),
  };
}

export async function assertAgentAuthFresh(userId: string): Promise<void> {
  const status = await getAgentAuthStatus(userId);
  if (!status.verifiedToday) {
    throw new HttpError(
      403,
      "Scan your fingerprint to start today's session before using this service.",
      "AGENT_AUTH_REQUIRED",
    );
  }
}

/**
 * Daily retailer 2FA before AEPS. Today: capture-only unlock after KYC Aadhaar match + fresh PID.
 * InstantPay UIDAI agent_auth will replace the capture-only path when the adapter is wired.
 */
export async function verifyAndRecordAgentAuth(
  actor: { id: string },
  enteredAadhaarNumber: string,
  biometricPayload: string,
  context: { ipAddress: string | null; userAgent: string | null },
): Promise<{ verifiedAt: Date }> {
  // Validate identity first — do not burn a PID on wrong Aadhaar / inactive account.
  const [user] = await db.select().from(users).where(eq(users.id, actor.id));
  if (!user || !user.isActive) throw new HttpError(403, "Account is not active", "ACCOUNT_INACTIVE");
  if (!user.aadhaarNumberEncrypted) {
    throw new HttpError(422, "Complete KYC (Aadhaar) before agent authentication", "KYC_AADHAAR_REQUIRED");
  }
  const aadhaarNumber = decryptPII(user.aadhaarNumberEncrypted);
  if (enteredAadhaarNumber !== aadhaarNumber) {
    throw new HttpError(
      422,
      "Entered Aadhaar does not match the retailer's KYC Aadhaar",
      "KYC_AADHAAR_MISMATCH",
    );
  }

  await assertFreshBiometric(biometricPayload);

  // TODO(instantpay): call provider agentAuth here before unlocking the day.

  const verifiedAt = new Date();
  await db.update(users).set({ lastAgentAuthAt: verifiedAt, updatedAt: verifiedAt }).where(eq(users.id, actor.id));
  await insertAuditLog({
    userId: actor.id,
    action: "auth.agent_auth_verified",
    entityType: "user",
    entityId: actor.id,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    metadata: { mode: "capture_only" },
  });

  return { verifiedAt };
}
