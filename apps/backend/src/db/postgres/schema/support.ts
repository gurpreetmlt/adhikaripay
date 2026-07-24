import { pgTable, uuid, varchar, text, timestamp, index } from "drizzle-orm/pg-core";
import { supportTicketStatusEnum } from "./enums";
import { users } from "./users";
import { transactions } from "./transactions";

/** Minimal ticketing — raise, list, resolve. No SLA timers or assignment routing yet. */
export const supportTickets = pgTable(
  "support_tickets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    subject: varchar("subject", { length: 150 }).notNull(),
    description: text("description").notNull(),
    // Optional link so a ticket about a specific transaction carries its context.
    transactionId: uuid("transaction_id").references(() => transactions.id, { onDelete: "set null" }),
    status: supportTicketStatusEnum("status").notNull().default("open"),
    resolutionNote: text("resolution_note"),
    resolvedBy: uuid("resolved_by").references(() => users.id, { onDelete: "set null" }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("support_tickets_user_idx").on(table.userId),
    index("support_tickets_status_idx").on(table.status),
  ],
);
