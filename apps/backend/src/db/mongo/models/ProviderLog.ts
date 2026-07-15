import { Schema, model } from "mongoose";

// Raw provider request/response payloads. Kept in Mongo (not Postgres) because
// they're large, schemaless, and only read during support/debugging — the
// transactions table stores only the small structured fields.
export interface ProviderLogDocument {
  txnRef: string | null;
  providerCode: string;
  operation: string;
  requestPayload: Record<string, unknown>;
  responsePayload: Record<string, unknown>;
  status: string;
  durationMs: number;
  createdAt: Date;
}

const providerLogSchema = new Schema<ProviderLogDocument>(
  {
    txnRef: { type: String, default: null, index: true },
    providerCode: { type: String, required: true, index: true },
    operation: { type: String, required: true },
    requestPayload: { type: Schema.Types.Mixed, default: {} },
    responsePayload: { type: Schema.Types.Mixed, default: {} },
    status: { type: String, required: true },
    durationMs: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { versionKey: false },
);

export const ProviderLog = model<ProviderLogDocument>("ProviderLog", providerLogSchema);
