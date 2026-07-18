import { env, isInstantPayAepsMode } from "../../config/env";

/** Service codes that follow AEPS_PROVIDER_MODE (dummy vs InstantPay). */
export const AEPS_ROUTED_SERVICE_CODES = new Set([
  "aeps_balance_enquiry",
  "aeps_cash_withdrawal",
  "aeps_cash_deposit",
  "aeps_bank_list",
  "aeps_mini_statement",
  "aadhaar_pay",
  "agent_auth",
]);

export function isAepsRoutedService(serviceCode: string): boolean {
  return AEPS_ROUTED_SERVICE_CODES.has(serviceCode);
}

/** Adapter registry code for the current AEPS mode. */
export function aepsAdapterCode(): "eko" | "instantpay" {
  return isInstantPayAepsMode() ? "instantpay" : "eko";
}

export function aepsProviderModeLabel(): string {
  return env.AEPS_PROVIDER_MODE;
}
