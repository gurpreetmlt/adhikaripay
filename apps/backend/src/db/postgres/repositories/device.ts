import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "../index";
import { devices } from "../schema";

export const MAX_DEVICE_MPIN_ATTEMPTS = 5;

export type DeviceRow = typeof devices.$inferSelect;

export async function findDevice(userId: string, deviceId: string): Promise<DeviceRow | null> {
  const [row] = await db
    .select()
    .from(devices)
    .where(and(eq(devices.userId, userId), eq(devices.deviceId, deviceId)));
  return row ?? null;
}

/** Called after a successful OTP login — (re)establishes trust for this device. */
export async function trustDevice(input: {
  userId: string;
  deviceId: string;
  label?: string | null;
}): Promise<DeviceRow> {
  const existing = await findDevice(input.userId, input.deviceId);
  const now = new Date();

  if (existing) {
    const [updated] = await db
      .update(devices)
      .set({
        label: input.label ?? existing.label,
        trustedAt: now,
        lastAuthAt: now,
        failedMpinAttempts: 0,
        revokedAt: null,
      })
      .where(eq(devices.id, existing.id))
      .returning();
    return updated!;
  }

  const [created] = await db
    .insert(devices)
    .values({
      userId: input.userId,
      deviceId: input.deviceId,
      label: input.label ?? null,
      trustedAt: now,
      lastAuthAt: now,
    })
    .returning();
  return created!;
}

/** Bumps lastAuthAt on a successful MPIN login — extends the rolling trust window. */
export async function touchDeviceAuth(id: string): Promise<void> {
  await db
    .update(devices)
    .set({ lastAuthAt: new Date(), failedMpinAttempts: 0 })
    .where(eq(devices.id, id));
}

/** Returns the new attempt count. Caller revokes the device once it hits the max. */
export async function incrementDeviceFailedAttempts(id: string): Promise<number> {
  const [updated] = await db
    .update(devices)
    .set({ failedMpinAttempts: sql`${devices.failedMpinAttempts} + 1` })
    .where(eq(devices.id, id))
    .returning({ failedMpinAttempts: devices.failedMpinAttempts });
  return updated?.failedMpinAttempts ?? MAX_DEVICE_MPIN_ATTEMPTS;
}

export async function revokeDevice(id: string): Promise<void> {
  await db.update(devices).set({ revokedAt: new Date() }).where(eq(devices.id, id));
}

/** Called on login-PIN change — every device must re-verify with OTP after this. */
export async function revokeAllDevicesForUser(userId: string): Promise<void> {
  await db
    .update(devices)
    .set({ revokedAt: new Date() })
    .where(and(eq(devices.userId, userId), isNull(devices.revokedAt)));
}

export async function listDevicesForUser(userId: string): Promise<DeviceRow[]> {
  return db
    .select()
    .from(devices)
    .where(and(eq(devices.userId, userId), isNull(devices.revokedAt)))
    .orderBy(desc(devices.lastAuthAt));
}
