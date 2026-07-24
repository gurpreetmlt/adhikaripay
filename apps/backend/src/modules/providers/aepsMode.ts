import { env, isInstantPayAepsMode, isPaySprintAepsMode } from "../../config/env";

/**
 * Service codes that STILL follow AEPS_PROVIDER_MODE (single env switch) — Nepal remittance
 * only. AEPS/DMT product operations (balance, withdraw, deposit, mini-statement, bank-list,
 * Aadhaar Pay, agent daily 2FA, DMT remitter/beneficiary/transfer/refund) were migrated to
 * `provider_services` (multi-provider, admin-toggleable — see Developer Options → Providers)
 * on 2026-07-21. Nepal remittance and merchant onboarding/eKYC (onboarding.service.ts) stay on
 * this env switch — they call InstantPay-specific endpoints directly, not through the generic
 * ProviderAdapter contract, so there's no PaySprint equivalent to route to yet.
 */
export const AEPS_ROUTED_SERVICE_CODES = new Set([
  "nepal_static_data",
  "nepal_payment_locations",
  "nepal_state_district",
  "nepal_outlet_status",
  "nepal_outlet_registration",
  "nepal_outlet_ekyc_initiate",
  "nepal_outlet_ekyc_status",
  "nepal_outlet_ekyc_process",
  "nepal_remitter_profile",
  "nepal_otp_request",
  "nepal_remitter_registration",
  "nepal_remitter_ekyc_initiate",
  "nepal_remitter_ekyc_status",
  "nepal_remitter_ekyc_process",
  "nepal_remitter_update",
  "nepal_beneficiary_registration",
  "nepal_service_charge",
  "nepal_fund_transfer",
  "nepal_fetch_txn_status",
  /** Nepal fund transfer settles against catalog service `MONEY_TRANSFER`. */
  "MONEY_TRANSFER",
]);

export function isAepsRoutedService(serviceCode: string): boolean {
  return AEPS_ROUTED_SERVICE_CODES.has(serviceCode);
}

/** Adapter registry code for the current AEPS mode. */
export function aepsAdapterCode(): "eko" | "instantpay" | "paysprint" {
  if (isInstantPayAepsMode()) return "instantpay";
  if (isPaySprintAepsMode()) return "paysprint";
  return "eko";
}

export function aepsProviderModeLabel(): string {
  return env.AEPS_PROVIDER_MODE;
}
