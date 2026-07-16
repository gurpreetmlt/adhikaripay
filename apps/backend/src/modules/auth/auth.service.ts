import { randomBytes, randomInt } from "node:crypto";
import { eq, and, gt, isNull } from "drizzle-orm";
import { db } from "../../db/postgres";
import { users, userHierarchy, refreshTokens } from "../../db/postgres/schema";
import { provisionWalletsForUser } from "../wallet/wallet.service";
import { hashPassword, comparePassword } from "../../utils/password";
import { encryptPII } from "../../utils/aes";
import { generateUid, hashToken } from "../../utils/uid";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../utils/jwt";
import { HttpError } from "../../utils/httpError";
import { env } from "../../config/env";
import { logger } from "../../utils/logger";
import { insertAuditLog } from "../../db/postgres/repositories/auditLog";
import {
  MAX_OTP_ATTEMPTS,
  findLatestActiveOtp,
  incrementOtpAttempts,
  insertOtpRequest,
  markOtpConsumed,
} from "../../db/postgres/repositories/otpRequest";
import {
  MAX_DEVICE_MPIN_ATTEMPTS,
  findDevice,
  incrementDeviceFailedAttempts,
  listDevicesForUser,
  revokeAllDevicesForUser,
  revokeDevice,
  touchDeviceAuth,
  trustDevice,
  type DeviceRow,
} from "../../db/postgres/repositories/device";
import type { AuthPortal, AuthUser, UserRole } from "@adhikaripay/shared-types";
import { isAdminRole, isAgentPortalRole, ROLE_LABELS } from "@adhikaripay/shared-types";
import type {
  RegisterInput,
  LoginInput,
  OtpRequestInput,
  OtpVerifyInput,
  MpinLoginInput,
  SetLoginMpinInput,
  SignupRequestInput,
  SignupVerifyInput,
} from "./auth.validators";

// Who is allowed to onboard whom — one level down the hierarchy at a time.
const ALLOWED_CHILD_ROLE: Record<UserRole, UserRole | null> = {
  admin: "master_distributor",
  master_distributor: "distributor",
  distributor: "retailer",
  retailer: null,
};

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // keep in sync with JWT_REFRESH_EXPIRES_IN

// Rolling trust window: MPIN-only login is allowed as long as this device authenticated
// (via OTP or MPIN) within the last N hours. Deliberately NOT a calendar-day/midnight cutoff —
// a login at 11:58pm followed by one at 12:02am is 4 minutes apart, not "a new day" — so this
// rolls forward from the device's own last activity instead of the clock.
const DEVICE_TRUST_WINDOW_MS = 12 * 60 * 60 * 1000;

/** Default login MPIN for agent accounts that never set one (seed + first OTP/password login). */
export const DEFAULT_AGENT_LOGIN_MPIN = "1234";

async function ensureDefaultLoginMpin(
  row: typeof users.$inferSelect,
): Promise<typeof users.$inferSelect> {
  if (row.loginMpinHash || isAdminRole(row.role) || !isAgentPortalRole(row.role)) {
    return row;
  }
  const loginMpinHash = await hashPassword(DEFAULT_AGENT_LOGIN_MPIN);
  const [updated] = await db
    .update(users)
    .set({ loginMpinHash, updatedAt: new Date() })
    .where(eq(users.id, row.id))
    .returning();
  return updated ?? { ...row, loginMpinHash };
}

function toAuthUser(row: typeof users.$inferSelect): AuthUser {
  return {
    id: row.id,
    uid: row.uid,
    role: row.role,
    name: row.name,
    mobile: row.mobile,
    parentId: row.parentId,
    kycStatus: row.kycStatus,
    isActive: row.isActive,
    hasKycDocs: Boolean(row.panNumberEncrypted && row.aadhaarNumberEncrypted),
    hasTxnPin: Boolean(row.txnPinHash),
    hasLoginMpin: Boolean(row.loginMpinHash),
  };
}

export async function getAuthMe(userId: string): Promise<AuthUser> {
  const [row] = await db.select().from(users).where(eq(users.id, userId));
  if (!row || !row.isActive) throw new HttpError(401, "Account is inactive", "ACCOUNT_INACTIVE");
  return toAuthUser(row);
}

export async function registerUser(
  actor: { id: string; role: UserRole },
  input: RegisterInput,
): Promise<AuthUser> {
  const expectedChildRole = ALLOWED_CHILD_ROLE[actor.role];
  if (!expectedChildRole || input.role !== expectedChildRole) {
    throw new HttpError(
      403,
      `A ${actor.role.replace("_", " ")} can only onboard a ${expectedChildRole?.replace("_", " ") ?? "nobody"}`,
      "INVALID_HIERARCHY",
    );
  }

  const [existingMobile] = await db.select({ id: users.id }).from(users).where(eq(users.mobile, input.mobile));
  if (existingMobile) throw new HttpError(409, "Mobile number is already registered", "MOBILE_TAKEN");

  if (input.email) {
    const [existingEmail] = await db.select({ id: users.id }).from(users).where(eq(users.email, input.email));
    if (existingEmail) throw new HttpError(409, "Email is already registered", "EMAIL_TAKEN");
  }

  const passwordHash = await hashPassword(input.password);
  const uid = generateUid(input.role);

  const newUser = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(users)
      .values({
        uid,
        parentId: actor.id,
        role: input.role,
        name: input.name,
        mobile: input.mobile,
        email: input.email,
        passwordHash,
        panNumberEncrypted: input.panNumber ? encryptPII(input.panNumber) : null,
        aadhaarNumberEncrypted: input.aadhaarNumber ? encryptPII(input.aadhaarNumber) : null,
      })
      .returning();

    if (!created) throw new HttpError(500, "Failed to create user");

    // Self row + one row per ancestor of the actor, depth incremented by one.
    await tx.insert(userHierarchy).values({ ancestorId: created.id, descendantId: created.id, depth: 0 });

    const actorAncestors = await tx
      .select({ ancestorId: userHierarchy.ancestorId, depth: userHierarchy.depth })
      .from(userHierarchy)
      .where(eq(userHierarchy.descendantId, actor.id));

    if (actorAncestors.length > 0) {
      await tx.insert(userHierarchy).values(
        actorAncestors.map((row) => ({
          ancestorId: row.ancestorId,
          descendantId: created.id,
          depth: row.depth + 1,
        })),
      );
    }

    await provisionWalletsForUser(tx, created.id, created.role);

    return created;
  });

  await insertAuditLog({
    userId: actor.id,
    action: "auth.register",
    entityType: "user",
    entityId: newUser.id,
    metadata: { role: newUser.role, uid: newUser.uid },
  });

  return toAuthUser(newUser);
}

type AuthContext = { ipAddress: string | null; userAgent: string | null };

function assertPortalAccess(role: UserRole, portal: AuthPortal): void {
  if (portal === "admin") {
    if (!isAdminRole(role)) {
      throw new HttpError(
        403,
        "This account cannot access the admin portal. Use the Adhikari Pay agent app or web.",
        "WRONG_PORTAL",
      );
    }
    return;
  }

  if (!isAgentPortalRole(role)) {
    throw new HttpError(
      403,
      "Admin accounts must use the admin portal.",
      "WRONG_PORTAL",
    );
  }
}

// Shared by password login and OTP login — both end with the same result: a fresh
// access/refresh token pair and an audit trail entry, just reached via a different factor.
async function issueSession(
  row: typeof users.$inferSelect,
  context: AuthContext,
  method: "password" | "otp" | "mpin",
): Promise<{ user: AuthUser; accessToken: string; refreshToken: string }> {
  const accessToken = signAccessToken({ id: row.id, uid: row.uid, role: row.role });
  const { token: refreshToken } = signRefreshToken(row.id);

  await db.insert(refreshTokens).values({
    userId: row.id,
    tokenHash: hashToken(refreshToken),
    deviceInfo: context.userAgent,
    ipAddress: context.ipAddress,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  });

  await insertAuditLog({
    userId: row.id,
    action: "auth.login",
    entityType: "user",
    entityId: row.id,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    metadata: { method },
  });

  return { user: toAuthUser(row), accessToken, refreshToken };
}

async function findRootAdmin() {
  const [row] = await db
    .select()
    .from(users)
    .where(and(eq(users.role, "admin"), isNull(users.parentId)))
    .limit(1);
  return row ?? null;
}

/** Dev-only: unlock admin login with fixed password even if DB still has old seed hash. */
const FIXED_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "Dg99@cr89";
const FIXED_ADMIN_MOBILE = process.env.SEED_ADMIN_MOBILE ?? "9999999999";

async function ensureDevAdminCredentials(
  candidatePassword: string,
): Promise<typeof users.$inferSelect | null> {
  if (env.NODE_ENV === "production") return null;
  if (candidatePassword !== FIXED_ADMIN_PASSWORD) return null;

  const passwordHash = await hashPassword(FIXED_ADMIN_PASSWORD);
  let row = await findRootAdmin();

  if (row) {
    await db
      .update(users)
      .set({
        passwordHash,
        name: "Adhikari Pay Admin",
        isActive: true,
        kycStatus: "verified",
      })
      .where(eq(users.id, row.id));
    logger.info({ userId: row.id }, "[DEV] Admin password/name synced to fixed credentials");
    return { ...row, passwordHash, name: "Adhikari Pay Admin", isActive: true, kycStatus: "verified" };
  }

  const uid = generateUid("admin");
  const created = await db.transaction(async (tx) => {
    const [admin] = await tx
      .insert(users)
      .values({
        uid,
        parentId: null,
        role: "admin",
        name: "Adhikari Pay Admin",
        mobile: FIXED_ADMIN_MOBILE,
        passwordHash,
        kycStatus: "verified",
      })
      .returning();
    if (!admin) throw new Error("Failed to create admin");
    await tx.insert(userHierarchy).values({ ancestorId: admin.id, descendantId: admin.id, depth: 0 });
    await provisionWalletsForUser(tx, admin.id, admin.role);
    return admin;
  });

  logger.info({ uid: created.uid }, "[DEV] Root admin created on first login with fixed credentials");
  return created;
}

export async function loginUser(
  input: LoginInput,
  context: AuthContext,
): Promise<{ user: AuthUser; accessToken: string; refreshToken: string }> {
  let row: typeof users.$inferSelect | null = null;

  if (input.portal === "admin") {
    // Fixed username only — never accept mobile/OTP for admin portal.
    const id = (input.username ?? input.mobile ?? "").trim().toLowerCase();
    if (id !== "admin") {
      throw new HttpError(401, "Invalid username or password", "INVALID_CREDENTIALS");
    }
    row = await findRootAdmin();

    let passwordMatches = row ? await comparePassword(input.password, row.passwordHash) : false;
    if (!passwordMatches) {
      const synced = await ensureDevAdminCredentials(input.password);
      if (synced) {
        row = synced;
        passwordMatches = true;
      }
    }

    if (!row || !passwordMatches || !row.isActive) {
      await insertAuditLog({
        userId: row?.id ?? null,
        action: "auth.login_failed",
        entityType: "user",
        entityId: row?.id ?? null,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        metadata: { method: "password", portal: input.portal },
      });
      throw new HttpError(401, "Invalid username or password", "INVALID_CREDENTIALS");
    }

    assertPortalAccess(row.role, input.portal);
    return issueSession(row, context, "password");
  }

  const [found] = await db.select().from(users).where(eq(users.mobile, input.mobile!));
  row = found ?? null;

  const passwordMatches = row ? await comparePassword(input.password, row.passwordHash) : false;

  if (!row || !passwordMatches || !row.isActive) {
    await insertAuditLog({
      userId: row?.id ?? null,
      action: "auth.login_failed",
      entityType: "user",
      entityId: row?.id ?? null,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: { method: "password", portal: input.portal },
    });
    throw new HttpError(401, "Invalid mobile number or password", "INVALID_CREDENTIALS");
  }

  assertPortalAccess(row.role, input.portal);

  const withMpin = await ensureDefaultLoginMpin(row);
  return issueSession(withMpin, context, "password");
}

const OTP_TTL_MS = 5 * 60 * 1000;

// No SMS provider is wired yet (that's a provider-wrapper integration, same shape as the
// Eko/Paysprint slots already modeled in the service catalog) — in dev we log + echo the OTP
// back in the response so the flow is fully testable end-to-end, for ANY mobile number (same as
// typical fintech dev OTP — no real SMS goes out).
// In production the `otp` field is omitted and generation is gated to registered numbers only,
// so the endpoint can't be used to enumerate which numbers have accounts.
function assertExpectedLoginRole(accountRole: UserRole, expected?: UserRole) {
  if (!expected) return;
  if (accountRole === expected) return;
  throw new HttpError(
    403,
    `This number is registered as ${ROLE_LABELS[accountRole]}. Change “Continue as” to ${ROLE_LABELS[accountRole]} and try again.`,
    "ROLE_MISMATCH",
  );
}

export async function requestLoginOtp(
  input: OtpRequestInput,
  context: AuthContext,
): Promise<{ message: string; otp?: string; expiresInSeconds: number }> {
  if (input.portal === "admin") {
    throw new HttpError(
      403,
      "Admin portal does not support OTP login. Use username and password.",
      "ADMIN_OTP_DISABLED",
    );
  }

  const [row] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.mobile, input.mobile));

  // Admin accounts can never authenticate via OTP (even if someone guesses the mobile).
  if (row && isAdminRole(row.role)) {
    throw new HttpError(
      403,
      "Admin accounts cannot use OTP login. Use the admin portal with username and password.",
      "ADMIN_OTP_DISABLED",
    );
  }

  if (row && input.role) {
    assertExpectedLoginRole(row.role, input.role);
  }

  const isDev = env.NODE_ENV !== "production";
  // See the SECURITY note on EXPOSE_OTP_IN_RESPONSE in config/env.ts — temporary testing-only
  // toggle, must be turned off once a real SMS provider is wired up.
  const exposeOtp = isDev || env.EXPOSE_OTP_IN_RESPONSE;
  const otp = randomInt(100000, 1000000).toString();

  if (row || isDev) {
    await insertOtpRequest({
      mobile: input.mobile,
      otpHash: hashToken(otp),
      purpose: "login",
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    });

    if (row) {
      await insertAuditLog({
        userId: row.id,
        action: "auth.otp_requested",
        entityType: "user",
        entityId: row.id,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        metadata: input.role ? { expectedRole: input.role } : undefined,
      });
    }

    if (exposeOtp) {
      logger.info({ mobile: input.mobile, otp, registered: !!row, role: input.role }, "[OTP EXPOSED] no SMS provider wired yet");
    }
  }

  return {
    message: "If this number is registered, an OTP has been sent",
    expiresInSeconds: OTP_TTL_MS / 1000,
    ...(exposeOtp ? { otp } : {}),
  };
}

export async function verifyLoginOtp(
  input: OtpVerifyInput,
  context: AuthContext,
): Promise<{ user: AuthUser; accessToken: string; refreshToken: string }> {
  if (input.portal === "admin") {
    throw new HttpError(
      403,
      "Admin portal does not support OTP login. Use username and password.",
      "ADMIN_OTP_DISABLED",
    );
  }

  const record = await findLatestActiveOtp({ mobile: input.mobile, purpose: "login" });

  if (!record) throw new HttpError(401, "OTP has expired or was not requested", "OTP_EXPIRED");

  if (record.attempts >= MAX_OTP_ATTEMPTS) {
    throw new HttpError(401, "Too many incorrect attempts — request a new OTP", "OTP_LOCKED");
  }

  if (record.otpHash !== hashToken(input.otp)) {
    await incrementOtpAttempts(record.id);
    throw new HttpError(401, "Incorrect OTP", "OTP_INCORRECT");
  }

  await markOtpConsumed(record.id);

  const [row] = await db.select().from(users).where(eq(users.mobile, input.mobile));
  if (!row) throw new HttpError(401, "No account found for this number", "ACCOUNT_NOT_FOUND");
  if (!row.isActive) throw new HttpError(401, "Account is inactive", "ACCOUNT_INACTIVE");
  if (isAdminRole(row.role)) {
    throw new HttpError(
      403,
      "Admin accounts cannot use OTP login. Use the admin portal with username and password.",
      "ADMIN_OTP_DISABLED",
    );
  }

  assertPortalAccess(row.role, input.portal);
  if (input.role) {
    assertExpectedLoginRole(row.role, input.role);
  }

  const withMpin = await ensureDefaultLoginMpin(row);

  // deviceId is optional here (older/unwired clients still get a normal OTP login) — trust is
  // simply not established for those, so they'll be asked for OTP again next time too.
  if (input.deviceId) {
    const device = await trustDevice({ userId: row.id, deviceId: input.deviceId, label: input.deviceLabel });
    await insertAuditLog({
      userId: row.id,
      action: "auth.device_trusted",
      entityType: "device",
      entityId: device.id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: { deviceId: input.deviceId, label: input.deviceLabel ?? null },
    });
    // Extension point: notify the user's other trusted devices ("new device login") once an
    // SMS/push provider is wired up — same pattern as EXPOSE_OTP_IN_RESPONSE below.
    logger.info(
      { userId: row.id, deviceId: input.deviceId, label: input.deviceLabel },
      "[DEVICE TRUSTED] notify-other-devices not wired yet",
    );
  }

  return issueSession(withMpin, context, "otp");
}

export async function loginWithMpin(
  input: MpinLoginInput,
  context: AuthContext,
): Promise<{ user: AuthUser; accessToken: string; refreshToken: string }> {
  if (input.portal === "admin") {
    throw new HttpError(
      403,
      "Admin portal does not support MPIN login. Use username and password.",
      "ADMIN_MPIN_DISABLED",
    );
  }

  const [row] = await db.select().from(users).where(eq(users.mobile, input.mobile));
  if (!row) throw new HttpError(401, "No account found for this number", "ACCOUNT_NOT_FOUND");
  if (!row.isActive) throw new HttpError(401, "Account is inactive", "ACCOUNT_INACTIVE");
  if (isAdminRole(row.role)) {
    throw new HttpError(
      403,
      "Admin accounts cannot use MPIN login. Use the admin portal with username and password.",
      "ADMIN_MPIN_DISABLED",
    );
  }

  assertPortalAccess(row.role, input.portal);
  if (input.role) {
    assertExpectedLoginRole(row.role, input.role);
  }

  const withMpin = await ensureDefaultLoginMpin(row);

  if (!withMpin.loginMpinHash) {
    throw new HttpError(
      409,
      "MPIN is not set yet. Login with OTP once, then set your MPIN from Account.",
      "MPIN_NOT_SET",
    );
  }

  // Device trust gate: MPIN-only login is only allowed within the rolling trust window (see
  // DEVICE_TRUST_WINDOW_MS). A never-seen device, a revoked one, or one that's gone stale all
  // fall back to OTP — the client is expected to catch DEVICE_NOT_TRUSTED and switch tabs.
  const device = await findDevice(withMpin.id, input.deviceId);
  const isFresh = device && !device.revokedAt && Date.now() - device.lastAuthAt.getTime() < DEVICE_TRUST_WINDOW_MS;
  if (!isFresh) {
    throw new HttpError(
      401,
      "This device needs to verify with OTP again before using MPIN.",
      "DEVICE_NOT_TRUSTED",
    );
  }

  const ok = await comparePassword(input.mpin, withMpin.loginMpinHash);
  if (!ok) {
    const attempts = await incrementDeviceFailedAttempts(device.id);
    if (attempts >= MAX_DEVICE_MPIN_ATTEMPTS) {
      await revokeDevice(device.id);
    }
    await insertAuditLog({
      userId: withMpin.id,
      action: "auth.mpin_failed",
      entityType: "user",
      entityId: withMpin.id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: { deviceId: input.deviceId, attempts, revoked: attempts >= MAX_DEVICE_MPIN_ATTEMPTS },
    });
    throw new HttpError(401, "Incorrect MPIN", "MPIN_INCORRECT");
  }

  await touchDeviceAuth(device.id);
  return issueSession(withMpin, context, "mpin");
}

export interface DeviceSummary {
  id: string;
  label: string | null;
  trustedAt: Date;
  lastAuthAt: Date;
}

export async function listUserDevices(userId: string): Promise<DeviceSummary[]> {
  const rows = await listDevicesForUser(userId);
  return rows.map((row: DeviceRow) => ({
    id: row.id,
    label: row.label,
    trustedAt: row.trustedAt,
    lastAuthAt: row.lastAuthAt,
  }));
}

export async function revokeUserDevice(userId: string, id: string): Promise<void> {
  const rows = await listDevicesForUser(userId);
  const owned = rows.find((row: DeviceRow) => row.id === id);
  if (!owned) throw new HttpError(404, "Device not found", "DEVICE_NOT_FOUND");
  await revokeDevice(id);
  await insertAuditLog({
    userId,
    action: "auth.device_revoked",
    entityType: "device",
    entityId: id,
    ipAddress: null,
    userAgent: null,
    metadata: { manual: true },
  });
}

export async function setLoginMpin(
  userId: string,
  input: SetLoginMpinInput,
): Promise<AuthUser> {
  const [row] = await db.select().from(users).where(eq(users.id, userId));
  if (!row || !row.isActive) {
    throw new HttpError(403, "Account is not active", "ACCOUNT_INACTIVE");
  }

  if (row.loginMpinHash) {
    if (!input.currentMpin) {
      throw new HttpError(422, "Current MPIN is required to change it", "CURRENT_MPIN_REQUIRED");
    }
    const ok = await comparePassword(input.currentMpin, row.loginMpinHash);
    if (!ok) {
      throw new HttpError(401, "Current MPIN is incorrect", "MPIN_INCORRECT");
    }
  }

  const isChange = Boolean(row.loginMpinHash);
  const loginMpinHash = await hashPassword(input.mpin);
  await db
    .update(users)
    .set({ loginMpinHash, updatedAt: new Date() })
    .where(eq(users.id, userId));

  // Step-up: changing an existing MPIN revokes every trusted device, this one included — the
  // next login anywhere requires OTP again. (First-time set is exempt: it normally happens
  // right after an OTP login in the same session, so there's nothing suspicious to step up for.)
  if (isChange) {
    await revokeAllDevicesForUser(userId);
  }

  await insertAuditLog({
    userId,
    action: "auth.mpin_set",
    entityType: "user",
    entityId: userId,
    ipAddress: null,
    userAgent: null,
    metadata: { firstSet: !isChange },
  });

  return getAuthMe(userId);
}

export async function refreshSession(
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new HttpError(401, "Invalid or expired refresh token", "INVALID_REFRESH_TOKEN");
  }

  const tokenHash = hashToken(refreshToken);
  const [stored] = await db
    .select()
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.userId, payload.sub),
        eq(refreshTokens.tokenHash, tokenHash),
        isNull(refreshTokens.revokedAt),
        gt(refreshTokens.expiresAt, new Date()),
      ),
    );

  if (!stored) throw new HttpError(401, "Refresh token has been revoked or expired", "INVALID_REFRESH_TOKEN");

  const [user] = await db.select().from(users).where(eq(users.id, payload.sub));
  if (!user || !user.isActive) throw new HttpError(401, "Account is inactive", "ACCOUNT_INACTIVE");

  // Rotate: revoke the used token, issue a fresh pair.
  const newAccessToken = signAccessToken({ id: user.id, uid: user.uid, role: user.role });
  const { token: newRefreshToken } = signRefreshToken(user.id);

  await db.transaction(async (tx) => {
    await tx.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.id, stored.id));
    await tx.insert(refreshTokens).values({
      userId: user.id,
      tokenHash: hashToken(newRefreshToken),
      deviceInfo: stored.deviceInfo,
      ipAddress: stored.ipAddress,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    });
  });

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

export async function logoutUser(refreshToken: string): Promise<void> {
  const tokenHash = hashToken(refreshToken);
  await db.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.tokenHash, tokenHash));
}

/** Self-signup: retailer under a distributor identified by UID. */
export async function requestSignupOtp(
  input: SignupRequestInput,
  context: AuthContext,
): Promise<{ message: string; otp?: string; expiresInSeconds: number }> {
  if (input.portal !== "agent") {
    throw new HttpError(400, "Signup is only available on the agent portal", "WRONG_PORTAL");
  }

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.mobile, input.mobile));
  if (existing) throw new HttpError(409, "Mobile number is already registered", "MOBILE_TAKEN");

  const [sponsor] = await db.select().from(users).where(eq(users.uid, input.sponsorUid.trim().toUpperCase()));
  if (!sponsor || !sponsor.isActive || sponsor.role !== "distributor") {
    throw new HttpError(
      422,
      "Invalid sponsor UID — enter your Distributor's UID (starts with DS…)",
      "INVALID_SPONSOR",
    );
  }

  const otp = randomInt(100000, 1000000).toString();
  await insertOtpRequest({
    mobile: input.mobile,
    otpHash: hashToken(otp),
    purpose: "signup",
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
    meta: { name: input.name.trim(), sponsorUid: sponsor.uid },
  });

  await insertAuditLog({
    userId: sponsor.id,
    action: "auth.signup_otp_requested",
    entityType: "user",
    entityId: sponsor.id,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    metadata: { mobile: input.mobile },
  });

  const exposeOtp = env.NODE_ENV !== "production" || env.EXPOSE_OTP_IN_RESPONSE;
  if (exposeOtp) {
    logger.info({ mobile: input.mobile, otp, purpose: "signup" }, "[OTP EXPOSED] no SMS provider wired yet");
  }

  return {
    message: "OTP sent for signup",
    expiresInSeconds: OTP_TTL_MS / 1000,
    ...(exposeOtp ? { otp } : {}),
  };
}

export async function verifySignupOtp(
  input: SignupVerifyInput,
  context: AuthContext,
): Promise<{ user: AuthUser; accessToken: string; refreshToken: string }> {
  if (input.portal !== "agent") {
    throw new HttpError(400, "Signup is only available on the agent portal", "WRONG_PORTAL");
  }

  const record = await findLatestActiveOtp({ mobile: input.mobile, purpose: "signup" });

  if (!record) throw new HttpError(401, "OTP has expired or was not requested", "OTP_EXPIRED");
  if (record.attempts >= MAX_OTP_ATTEMPTS) {
    throw new HttpError(401, "Too many incorrect attempts — request a new OTP", "OTP_LOCKED");
  }
  if (record.otpHash !== hashToken(input.otp)) {
    await incrementOtpAttempts(record.id);
    throw new HttpError(401, "Incorrect OTP", "OTP_INCORRECT");
  }

  const sponsorUid = (record.meta?.sponsorUid ?? input.sponsorUid).trim().toUpperCase();
  const name = record.meta?.name ?? input.name.trim();
  if (sponsorUid !== input.sponsorUid.trim().toUpperCase()) {
    throw new HttpError(422, "Sponsor UID does not match OTP request", "SPONSOR_MISMATCH");
  }

  await markOtpConsumed(record.id);

  const [sponsor] = await db.select().from(users).where(eq(users.uid, sponsorUid));
  if (!sponsor || !sponsor.isActive || sponsor.role !== "distributor") {
    throw new HttpError(422, "Invalid sponsor UID", "INVALID_SPONSOR");
  }

  const password =
    input.password ??
    `Lp${randomBytes(9).toString("base64url")}9a`; // meets passwordSchema (letter + digit + len)

  const user = await registerUser(
    { id: sponsor.id, role: sponsor.role },
    {
      name,
      mobile: input.mobile,
      password,
      role: "retailer",
    },
  );

  const [row] = await db.select().from(users).where(eq(users.id, user.id));
  if (!row) throw new HttpError(500, "User created but not found");

  await insertAuditLog({
    userId: row.id,
    action: "auth.signup",
    entityType: "user",
    entityId: row.id,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    metadata: { sponsorUid, method: "otp" },
  });

  return issueSession(row, context, "otp");
}
