import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./users";

// Future API-reselling: a partner gets an api_clients row, calls /v1/partner-api/* with
// X-Api-Key + signed secret, scoped by IP whitelist and its own rate limits.
export const apiClients = pgTable("api_clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerUserId: uuid("owner_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  clientName: varchar("client_name", { length: 120 }).notNull(),
  apiKey: varchar("api_key", { length: 64 }).notNull().unique(),
  apiSecretHash: text("api_secret_hash").notNull(),
  requestsPerMinute: integer("requests_per_minute").notNull().default(60),
  requestsPerDay: integer("requests_per_day").notNull().default(5000),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const apiIpWhitelist = pgTable(
  "api_ip_whitelist",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    apiClientId: uuid("api_client_id")
      .notNull()
      .references(() => apiClients.id, { onDelete: "cascade" }),
    // varchar (not `inet`) so Drizzle can round-trip it without a custom type; validated at the app layer
    ipAddress: varchar("ip_address", { length: 45 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("api_ip_whitelist_client_ip_key").on(table.apiClientId, table.ipAddress)],
);
