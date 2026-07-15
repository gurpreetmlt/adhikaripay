import { Schema, model } from "mongoose";

export interface AuditLogDocument {
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

const auditLogSchema = new Schema<AuditLogDocument>(
  {
    userId: { type: String, default: null, index: true },
    action: { type: String, required: true, index: true }, // e.g. "auth.login", "auth.login_failed"
    entityType: { type: String, required: true },
    entityId: { type: String, default: null },
    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { versionKey: false },
);

export const AuditLog = model<AuditLogDocument>("AuditLog", auditLogSchema);
