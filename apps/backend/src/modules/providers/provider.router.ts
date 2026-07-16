import { and, eq, asc, desc } from "drizzle-orm";
import { db } from "../../db/postgres";
import { providers, providerServices, services } from "../../db/postgres/schema";
import { insertProviderLog } from "../../db/postgres/repositories/providerLog";
import { getAdapterByCode } from "./provider.registry";
import { HttpError } from "../../utils/httpError";
import { logger } from "../../utils/logger";
import type { ProviderAdapter, ProviderOperation, ProviderResult } from "./types";

export interface RoutedProvider {
  adapter: ProviderAdapter;
  providerId: string;
  providerServiceCode: string;
}

// Resolves which providers can fulfil a service, in fail-over order
// (primary first, then priority). Reads provider_services fresh each call so
// an admin toggling a provider takes effect immediately.
export async function resolveProvidersForService(serviceCode: string): Promise<RoutedProvider[]> {
  const rows = await db
    .select({
      providerId: providers.id,
      providerCode: providers.code,
      providerActive: providers.isActive,
      providerServiceCode: providerServices.providerServiceCode,
      mappingActive: providerServices.isActive,
      isPrimary: providerServices.isPrimary,
      priority: providerServices.priority,
      serviceActive: services.isActive,
    })
    .from(providerServices)
    .innerJoin(providers, eq(providerServices.providerId, providers.id))
    .innerJoin(services, eq(providerServices.serviceId, services.id))
    .where(and(eq(services.code, serviceCode)))
    .orderBy(desc(providerServices.isPrimary), asc(providerServices.priority));

  const usable: RoutedProvider[] = [];
  for (const row of rows) {
    if (!row.serviceActive) {
      throw new HttpError(503, "This service is currently disabled", "SERVICE_DISABLED");
    }
    if (!row.providerActive || !row.mappingActive) continue;
    const adapter = getAdapterByCode(row.providerCode);
    if (!adapter) {
      logger.warn({ providerCode: row.providerCode }, "provider row exists but no adapter registered");
      continue;
    }
    usable.push({ adapter, providerId: row.providerId, providerServiceCode: row.providerServiceCode });
  }

  if (usable.length === 0) {
    throw new HttpError(503, "No provider available for this service", "NO_PROVIDER_AVAILABLE");
  }
  return usable;
}

// Wraps a single adapter call with timing + raw payload logging to Mongo.
// Redact anything biometric before it ever leaves the process boundary.
export async function callProvider<T extends Record<string, unknown>>(
  routed: RoutedProvider,
  operation: ProviderOperation,
  txnRef: string | null,
  requestPayload: Record<string, unknown>,
  invoke: (adapter: ProviderAdapter) => Promise<ProviderResult<T>>,
): Promise<ProviderResult<T>> {
  const startedAt = Date.now();
  const redactedRequest = { ...requestPayload };
  if ("biometricPayload" in redactedRequest) redactedRequest.biometricPayload = "[REDACTED]";

  let result: ProviderResult<T>;
  try {
    result = await invoke(routed.adapter);
  } catch (err) {
    // Network/unexpected errors are indistinguishable from timeouts money-wise:
    // the provider may or may not have processed it. Surface as pending, never failed.
    logger.error({ err, operation, provider: routed.adapter.code }, "provider call threw");
    result = {
      success: false,
      status: "pending",
      providerTxnId: null,
      amount: null,
      message: "Provider unreachable — transaction pending, recheck status",
      data: {} as T,
      raw: { error: err instanceof Error ? err.message : String(err) },
    };
  }

  insertProviderLog({
    txnRef,
    providerCode: routed.adapter.code,
    operation,
    requestPayload: redactedRequest,
    responsePayload: (result.raw ?? {}) as Record<string, unknown>,
    status: result.status,
    durationMs: Date.now() - startedAt,
  }).catch((err: unknown) => logger.error({ err }, "failed to write provider log"));

  return result;
}
