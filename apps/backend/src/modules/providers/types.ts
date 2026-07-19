// Provider-agnostic contract for the wrapper layer. Every real banking rail
// (AEPS, DMT, BBPS, recharge) goes through an adapter implementing this
// interface — the rest of the codebase never talks to Eko/PaySprint directly,
// so swapping or adding a provider is a registry entry, not a refactor.

export type ProviderTxnStatus = "success" | "failed" | "pending";

export interface ProviderResult<TData = Record<string, unknown>> {
  success: boolean;
  status: ProviderTxnStatus;
  providerTxnId: string | null;
  amount: string | null;
  message: string;
  /** Normalized operation-specific data (balance, bill details, beneficiary id...). */
  data: TData;
  /** Raw provider response — persisted to Mongo provider_logs, never to Postgres. */
  raw: Record<string, unknown>;
}

// ── Operation params ────────────────────────────────────────────────────────

export interface AepsParams {
  retailerUserId: string;
  aadhaarNumber: string;
  bankIin: string;
  mobile: string;
  /** PidData XML from the RD-service biometric device (or JSON biometric blob in tests). */
  biometricPayload: string;
  amount?: string;
  latitude?: string;
  longitude?: string;
  /** InstantPay merchant outlet id; resolved from user profile when omitted. */
  outletId?: string;
  endpointIp?: string;
  externalRef?: string;
  /** Transaction-OTP referenceKey — mandatory for withdrawals above ₹5,000 (InstantPay). */
  otpReferenceKey?: string;
}

/** AEPS bank directory entry (from provider bank-list API). */
export interface AepsBank {
  bankId: number | string;
  name: string;
  iin: string;
  aepsEnabled: boolean;
  aadhaarpayEnabled: boolean;
  aepsFailureRate: string;
  aadhaarpayFailureRate: string;
}

export interface AepsBankListParams {
  retailerUserId: string;
  outletId?: string;
  endpointIp?: string;
}

/** Request an SMS OTP for a high-value AEPS withdrawal (no biometric needed at this step). */
export interface AepsTxnOtpParams {
  retailerUserId: string;
  aadhaarNumber: string;
  bankIin: string;
  mobile: string;
  amount: string;
  latitude?: string;
  longitude?: string;
  outletId?: string;
  endpointIp?: string;
}

export interface DmtBeneficiaryParams {
  retailerUserId: string;
  customerMobile: string;
  name: string;
  accountNumber: string;
  ifsc: string;
}

export interface DmtTransferParams {
  retailerUserId: string;
  customerMobile: string;
  beneficiaryId: string;
  amount: string;
  mode: "imps" | "neft";
}

export interface BbpsFetchBillParams {
  retailerUserId: string;
  billerCode: string;
  /** Consumer number / CA number / registered mobile, per biller. */
  customerParams: Record<string, string>;
}

export interface BbpsPayBillParams extends BbpsFetchBillParams {
  amount: string;
  /** Returned by fetchBill; ties the payment to the fetched bill. */
  billFetchRef: string;
}

export interface RechargeParams {
  retailerUserId: string;
  operatorCode: string;
  accountRef: string; // mobile number / DTH subscriber id
  amount: string;
}

export interface CheckStatusParams {
  providerTxnId: string | null;
  /** Our txnRef — providers that support client-ref lookup use this as fallback. */
  clientRef: string;
  /** Transaction date (YYYY-MM-DD, IST) — InstantPay reports API requires it. */
  txnDate?: string;
  /** Service code of the original txn — lets adapters pick rail-specific query params. */
  serviceCode?: string;
}

/** Retailer proving THEIR OWN identity (not the customer's) — see modules/auth/agentAuth.ts. */
export interface AgentAuthParams {
  retailerUserId: string;
  aadhaarNumber: string;
  biometricPayload: string;
  latitude?: string;
  longitude?: string;
  outletId?: string;
  endpointIp?: string;
  externalRef?: string;
}

// ── Adapter contract ────────────────────────────────────────────────────────

export interface ProviderAdapter {
  readonly code: string;
  /**
   * True for stub/mock adapters that fabricate provider responses (always "success") without
   * calling a real rail. Money must NEVER be settled on a stub's word in production — the router
   * refuses to route through a stub in prod unless ALLOW_STUB_PROVIDERS is explicitly set.
   */
  readonly isStub?: boolean;

  aepsBalanceEnquiry(params: AepsParams): Promise<ProviderResult<{ balance: string }>>;
  aepsWithdraw(params: AepsParams): Promise<ProviderResult>;
  /** Customer deposits cash into their own bank account (merchant collects the cash). */
  aepsDeposit(params: AepsParams): Promise<ProviderResult>;
  /** AEPS-enabled bank directory with real NPCI IINs + failure rates. */
  aepsBankList(params: AepsBankListParams): Promise<ProviderResult<{ banks: AepsBank[] }>>;
  /** OTP for ₹5,000+ withdrawals; returns referenceKey to pass in aepsWithdraw. */
  aepsTransactionOtp(
    params: AepsTxnOtpParams,
  ): Promise<ProviderResult<{ referenceKey: string; validity: string }>>;
  aepsMiniStatement(
    params: AepsParams,
  ): Promise<ProviderResult<{ statement: { date: string; narration: string; amount: string; type: "credit" | "debit" }[] }>>;
  aadhaarPay(params: AepsParams): Promise<ProviderResult>;

  dmtAddBeneficiary(params: DmtBeneficiaryParams): Promise<ProviderResult<{ beneficiaryId: string }>>;
  dmtTransfer(params: DmtTransferParams): Promise<ProviderResult>;

  bbpsFetchBill(
    params: BbpsFetchBillParams,
  ): Promise<ProviderResult<{ billFetchRef: string; customerName: string; billAmount: string; dueDate: string }>>;
  bbpsPayBill(params: BbpsPayBillParams): Promise<ProviderResult>;

  recharge(params: RechargeParams): Promise<ProviderResult>;

  checkStatus(params: CheckStatusParams): Promise<ProviderResult>;

  agentAuth(params: AgentAuthParams): Promise<ProviderResult>;
}

/** Operation names — used for provider_logs and per-operation routing. */
export type ProviderOperation =
  | "aeps_balance_enquiry"
  | "aeps_withdraw"
  | "aeps_deposit"
  | "aeps_bank_list"
  | "aeps_txn_otp"
  | "aeps_mini_statement"
  | "aadhaar_pay"
  | "dmt_add_beneficiary"
  | "dmt_transfer"
  | "bbps_fetch_bill"
  | "bbps_pay_bill"
  | "recharge"
  | "check_status"
  | "agent_auth";
