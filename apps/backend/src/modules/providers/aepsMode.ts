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
  "dmt_bank_list",
  "dmt_remitter_profile",
  "dmt_remitter_register",
  "dmt_remitter_register_verify",
  "dmt_remitter_kyc",
  "dmt_add_beneficiary",
  "dmt_add_beneficiary_verify",
  "dmt_delete_beneficiary",
  "dmt_delete_beneficiary_verify",
  "dmt_txn_otp",
  "dmt_refund_otp",
  "dmt_refund",
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
export function aepsAdapterCode(): "eko" | "instantpay" {
  return isInstantPayAepsMode() ? "instantpay" : "eko";
}

export function aepsProviderModeLabel(): string {
  return env.AEPS_PROVIDER_MODE;
}
