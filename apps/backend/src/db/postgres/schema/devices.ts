import { pgTable, uuid, varchar, integer, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { users } from "./users";

// Device trust for the "skip OTP on this phone" login flow: once a device completes an OTP
// login it's trusted for a rolling window (see DEVICE_TRUST_WINDOW_MS in auth.service.ts) —
// MPIN-only login is allowed until that window lapses, a PIN change revokes every device, or
// too many wrong MPIN attempts revoke this one device.
export const devices = pgTable(
  "devices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // client-generated persistent identifier (stored in app storage, not a secret by itself —
    // trust is enforced server-side against lastAuthAt/revokedAt, never by trusting this value alone)
    deviceId: varchar("device_id", { length: 100 }).notNull(),
    // e.g. "Redmi Note 12 · Android 14" — best-effort, shown in the Trusted Devices list
    label: varchar("label", { length: 150 }),
    trustedAt: timestamp("trusted_at", { withTimezone: true }).notNull().defaultNow(),
    lastAuthAt: timestamp("last_auth_at", { withTimezone: true }).notNull().defaultNow(),
    failedMpinAttempts: integer("failed_mpin_attempts").notNull().default(0),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("devices_user_device_idx").on(table.userId, table.deviceId),
    index("devices_user_id_idx").on(table.userId),
  ],
);
