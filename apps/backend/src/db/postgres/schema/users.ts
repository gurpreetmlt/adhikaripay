import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  index,
  primaryKey,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { userRoleEnum, kycStatusEnum } from "./enums";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    uid: varchar("uid", { length: 20 }).notNull().unique(),
    // who onboarded this user — null only for the root admin
    parentId: uuid("parent_id").references((): AnyPgColumn => users.id, { onDelete: "restrict" }),
    role: userRoleEnum("role").notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    mobile: varchar("mobile", { length: 15 }).notNull().unique(),
    email: varchar("email", { length: 150 }).unique(),
    passwordHash: text("password_hash").notNull(),
    // 4-6 digit transaction PIN (bcrypt) — required on every money-moving endpoint,
    // separate from the login password so a hijacked session alone can't move funds.
    txnPinHash: text("txn_pin_hash"),
    txnPinFailedAttempts: integer("txn_pin_failed_attempts").notNull().default(0),
    txnPinLockedUntil: timestamp("txn_pin_locked_until", { withTimezone: true }),
    // 4-digit login MPIN (bcrypt) — quick unlock on mobile Welcome-back screen.
    loginMpinHash: text("login_mpin_hash"),
    // Retailer's OWN biometric proof-of-presence at the counter — separate from the customer's
    // AEPS biometric. Money-moving AEPS/DMT ops require this within a rolling window (see
    // AGENT_AUTH_WINDOW_MS in modules/auth/agentAuth.ts). Null = never agent-authed on record.
    lastAgentAuthAt: timestamp("last_agent_auth_at", { withTimezone: true }),
    // PAN/Aadhaar stored AES-256-GCM encrypted at rest, never in plaintext
    panNumberEncrypted: text("pan_number_encrypted"),
    aadhaarNumberEncrypted: text("aadhaar_number_encrypted"),
    kycStatus: kycStatusEnum("kyc_status").notNull().default("pending"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("users_parent_id_idx").on(table.parentId),
    index("users_role_idx").on(table.role),
  ],
);

// Closure table: one row per (ancestor, descendant) pair, including depth-0 self rows.
// Lets the commission engine fetch "everyone above this retailer" in a single indexed query
// instead of walking parentId recursively on every transaction.
export const userHierarchy = pgTable(
  "user_hierarchy",
  {
    ancestorId: uuid("ancestor_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    descendantId: uuid("descendant_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    depth: integer("depth").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.ancestorId, table.descendantId] }),
    index("user_hierarchy_descendant_idx").on(table.descendantId),
  ],
);

export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    deviceInfo: varchar("device_info", { length: 255 }),
    ipAddress: varchar("ip_address", { length: 45 }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("refresh_tokens_user_idx").on(table.userId)],
);
