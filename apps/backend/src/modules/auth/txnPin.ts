import { eq } from "drizzle-orm";
import { db } from "../../db/postgres";
import { users } from "../../db/postgres/schema";
import { hashPassword, comparePassword } from "../../utils/password";
import { HttpError } from "../../utils/httpError";
import { insertAuditLog } from "../../db/postgres/repositories/auditLog";

const PIN_PATTERN = /^\d{4}$/;

/**
 * First-time PIN: session alone is enough (post-signup onboarding).
 * Changing an existing PIN still requires password re-proof.
 */
export async function setTxnPin(
  userId: string,
  pin: string,
  opts: { passwordOk?: boolean; isFirstSet?: boolean } = {},
): Promise<{ hasTxnPin: true }> {
  if (!PIN_PATTERN.test(pin)) {
    throw new HttpError(422, "Transaction PIN must be 4 digits", "INVALID_PIN_FORMAT");
  }

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user || !user.isActive) {
    throw new HttpError(403, "Account is not active", "ACCOUNT_INACTIVE");
  }

  const isFirstSet = !user.txnPinHash;
  if (!isFirstSet && !opts.passwordOk) {
    throw new HttpError(401, "Password verification failed", "INVALID_CREDENTIALS");
  }

  const txnPinHash = await hashPassword(pin);
  await db.update(users).set({ txnPinHash, updatedAt: new Date() }).where(eq(users.id, userId));
  await insertAuditLog({
    userId,
    action: "auth.txn_pin_set",
    entityType: "user",
    entityId: userId,
    ipAddress: null,
    userAgent: null,
    metadata: { firstSet: isFirstSet },
  });
  return { hasTxnPin: true };
}

export async function verifyTxnPinOrThrow(userId: string, pin: string | undefined): Promise<void> {
  if (!pin) {
    throw new HttpError(422, "Transaction PIN is required", "TXN_PIN_REQUIRED");
  }
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user || !user.isActive) {
    throw new HttpError(403, "Account is not active", "ACCOUNT_INACTIVE");
  }
  if (!user.txnPinHash) {
    throw new HttpError(409, "Set a transaction PIN before making transactions", "TXN_PIN_NOT_SET");
  }
  const ok = await comparePassword(pin, user.txnPinHash);
  if (!ok) {
    await insertAuditLog({
      userId,
      action: "auth.txn_pin_failed",
      entityType: "user",
      entityId: userId,
      ipAddress: null,
      userAgent: null,
      metadata: {},
    });
    throw new HttpError(401, "Incorrect transaction PIN", "TXN_PIN_INCORRECT");
  }
}
