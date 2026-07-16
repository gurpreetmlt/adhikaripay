import { and, desc, eq } from "drizzle-orm";
import { db } from "../index";
import { auditLogs } from "../schema";

export interface InsertAuditLogInput {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}

export async function insertAuditLog(input: InsertAuditLogInput): Promise<void> {
  await db.insert(auditLogs).values({
    userId: input.userId ?? null,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
    metadata: input.metadata ?? {},
  });
}

export async function findLatestAuditLog(filter: {
  userId: string;
  action: string;
}): Promise<{ metadata: Record<string, unknown>; createdAt: Date } | null> {
  const [row] = await db
    .select({ metadata: auditLogs.metadata, createdAt: auditLogs.createdAt })
    .from(auditLogs)
    .where(and(eq(auditLogs.userId, filter.userId), eq(auditLogs.action, filter.action)))
    .orderBy(desc(auditLogs.createdAt))
    .limit(1);
  return row ?? null;
}
