import { db } from "../index";
import { providerLogs } from "../schema";

export interface InsertProviderLogInput {
  txnRef: string | null;
  providerCode: string;
  operation: string;
  requestPayload: Record<string, unknown>;
  responsePayload: Record<string, unknown>;
  status: string;
  durationMs: number;
}

export async function insertProviderLog(input: InsertProviderLogInput): Promise<void> {
  await db.insert(providerLogs).values(input);
}
