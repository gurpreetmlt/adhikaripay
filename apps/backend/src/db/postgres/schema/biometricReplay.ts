import { pgTable, uuid, varchar, timestamp, index } from "drizzle-orm/pg-core";

// UIDAI PID blocks (biometric captures) are meant to be single-use and time-bound. Without a
// server-side guard, the exact same captured payload could be resubmitted across multiple
// transaction attempts (replay). Each payload's hash is inserted here on first use — the unique
// constraint makes a second submission of the same payload fail fast, before any provider call
// or money movement. See modules/transactions/biometricReplay.ts.
export const biometricReplayGuard = pgTable(
  "biometric_replay_guard",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // sha256 hex of the raw biometricPayload string
    payloadHash: varchar("payload_hash", { length: 64 }).notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("biometric_replay_guard_created_idx").on(table.createdAt)],
);
