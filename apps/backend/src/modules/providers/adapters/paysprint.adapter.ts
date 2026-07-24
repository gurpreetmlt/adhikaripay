import { randomUUID } from "node:crypto";
import { HttpError } from "../../../utils/httpError";
import {
  paySprintPost,
  type PaySprintApiResponse,
} from "../paysprint/client";
import type {
  AepsBank,
  AepsBankListParams,
  AepsParams,
  AepsTxnOtpParams,
  AgentAuthParams,
  BbpsFetchBillParams,
  BbpsPayBillParams,
  CheckStatusParams,
  DmtBank,
  DmtBankListParams,
  DmtBeneficiaryDeleteParams,
  DmtBeneficiaryParams,
  DmtBeneficiaryVerifyParams,
  DmtRefundOtpParams,
  DmtRefundParams,
  DmtRemitterKycParams,
  DmtRemitterProfile,
  DmtRemitterProfileParams,
  DmtRemitterRegistrationParams,
  DmtRemitterRegistrationVerifyParams,
  DmtTransactionOtpParams,
  DmtTransferParams,
  NepalBeneficiaryRegistrationParams,
  NepalFetchTransactionStatusParams,
  NepalFetchTransactionStatusResult,
  NepalFundTransferParams,
  NepalOtpRequestParams,
  NepalOutletEkycInitiateParams,
  NepalOutletEkycInitiateResult,
  NepalOutletEkycInitiateStatusParams,
  NepalOutletEkycInitiateStatusResult,
  NepalOutletEkycProcessParams,
  NepalOutletEkycProcessResult,
  NepalOutletRegistrationParams,
  NepalOutletRegistrationResult,
  NepalOutletStatus,
  NepalOutletStatusParams,
  NepalPaymentLocation,
  NepalPaymentLocationListParams,
  NepalRemitterEkycInitiateParams,
  NepalRemitterEkycInitiateResult,
  NepalRemitterEkycInitiateStatusParams,
  NepalRemitterEkycInitiateStatusResult,
  NepalRemitterEkycProcessParams,
  NepalRemitterProfile,
  NepalRemitterProfileParams,
  NepalRemitterRegistrationParams,
  NepalRemitterUpdateParams,
  NepalRemitterUpdateResult,
  NepalServiceChargeParams,
  NepalServiceChargeQuote,
  NepalStateDistrict,
  NepalStateDistrictParams,
  NepalStaticDataParams,
  NepalStaticDataType,
  NepalStaticOption,
  ProviderAdapter,
  ProviderResult,
  ProviderTxnStatus,
  RechargeParams,
} from "../types";

/**
 * PaySprint — AEPS only (Task 22 scope: AEPS first, DMT in a follow-up chat).
 *
 * IMPORTANT — not yet verified against a real PaySprint sandbox response. The provider's own
 * docs (PaySprint/Unimplemented/) leave the UAT base URL, AES mode/padding, and JWT timestamp
 * unit as "confirm with PaySprint", and mark the bank-pipe (Bank1/3/4/5/6) as unconfirmed for
 * this merchant. This adapter defaults to the generic Bank4-style "aeps/v3/.../index" paths —
 * swap to a bank-specific pipe (see AEPS_BANK4.md / BANK1_EKYC.md) once PaySprint confirms which
 * pipe this merchant is onboarded on. DO NOT route real withdrawals through this adapter
 * (AEPS_PROVIDER_MODE=paysprint_live) until every method below has been smoke-tested on UAT.
 *
 * Every operation outside AEPS explicitly throws (never inherits a stub that fabricates
 * "success") — see MockAdapterBase for why silently faking success on a money-moving call is
 * the exact risk Part C of the financial-safety plan rules out.
 */
export class PaySprintAdapter implements ProviderAdapter {
  readonly code = "paysprint";
  readonly isStub = false;

  private mapStatus(res: PaySprintApiResponse): ProviderTxnStatus {
    return res.status === true || res.status === 1 ? "success" : "failed";
  }

  private notImplemented(op: string): never {
    throw new HttpError(501, `PaySprint adapter: ${op} not implemented yet`, "PROVIDER_NOT_IMPLEMENTED");
  }

  // ── AEPS ───────────────────────────────────────────────────────────────

  async aepsBankList(_params: AepsBankListParams): Promise<ProviderResult<{ banks: AepsBank[] }>> {
    const res = await paySprintPost("/aeps/banklist/index", {});
    const rows = Array.isArray(res.data) ? (res.data as Record<string, unknown>[]) : [];
    const banks: AepsBank[] = rows.map((r) => ({
      bankId: (r.bankid ?? r.id ?? "") as string | number,
      name: String(r.bankname ?? r.name ?? ""),
      iin: String(r.iin ?? ""),
      aepsEnabled: Boolean(r.aeps ?? true),
      aadhaarpayEnabled: Boolean(r.aadhaarpay ?? true),
      aepsFailureRate: String(r.aeps_failure_rate ?? "0"),
      aadhaarpayFailureRate: String(r.aadhaarpay_failure_rate ?? "0"),
    }));
    return {
      success: this.mapStatus(res) === "success",
      status: this.mapStatus(res),
      providerTxnId: null,
      amount: null,
      message: res.message ?? "",
      data: { banks },
      raw: res,
    };
  }

  async agentAuth(params: AgentAuthParams): Promise<ProviderResult> {
    // Daily 2FA — field names best-effort per AEPS_DETAILS.md; confirm on UAT.
    const res = await paySprintPost("/aeps/v3/authenticate/index", {
      aadhaar: params.aadhaarNumber,
      piddata: params.biometricPayload,
      latitude: params.latitude,
      longitude: params.longitude,
    });
    return this.toResult(res, "Agent authentication", undefined, {});
  }

  async aepsBalanceEnquiry(params: AepsParams): Promise<ProviderResult<{ balance: string }>> {
    const res = await paySprintPost("/aeps/v3/balanceenquiry/index", {
      aadhaar: params.aadhaarNumber,
      bankiin: params.bankIin,
      mobile: params.mobile,
      piddata: params.biometricPayload,
      latitude: params.latitude,
      longitude: params.longitude,
    });
    const data = (res.data ?? {}) as Record<string, unknown>;
    return this.toResult(res, "AEPS balance enquiry", undefined, {
      balance: String(data.balance ?? data.availablebalance ?? "0"),
    });
  }

  async aepsTransactionOtp(
    params: AepsTxnOtpParams,
  ): Promise<ProviderResult<{ referenceKey: string; validity: string }>> {
    const res = await paySprintPost("/aeps/txnotp/index", {
      aadhaar: params.aadhaarNumber,
      bankiin: params.bankIin,
      mobile: params.mobile,
      amount: params.amount,
    });
    const data = (res.data ?? {}) as Record<string, unknown>;
    return this.toResult(res, "AEPS transaction OTP", undefined, {
      referenceKey: String(data.referenceid ?? res.referenceid ?? ""),
      validity: String(data.validity ?? new Date(Date.now() + 15 * 60 * 1000).toISOString()),
    });
  }

  async aepsWithdraw(params: AepsParams): Promise<ProviderResult> {
    const res = await paySprintPost("/aeps/v3/cashwithdraw/index", {
      aadhaar: params.aadhaarNumber,
      bankiin: params.bankIin,
      mobile: params.mobile,
      amount: params.amount,
      piddata: params.biometricPayload,
      latitude: params.latitude,
      longitude: params.longitude,
      referenceid: params.externalRef ?? randomUUID(),
    });
    return this.toResult(res, "AEPS cash withdrawal", params.amount, {});
  }

  async aepsDeposit(_params: AepsParams): Promise<ProviderResult> {
    // PaySprint AEPS cash-deposit is a separate product (NSDL Cash Deposit, PaySprint/Unimplemented/NSDL_CASH_DEPOSIT.md)
    // — out of Task 22 scope (only AEPS + DMT per the task doc).
    this.notImplemented("aepsDeposit (see NSDL Cash Deposit — separate product, out of scope)");
  }

  async aepsMiniStatement(
    params: AepsParams,
  ): Promise<
    ProviderResult<{ statement: { date: string; narration: string; amount: string; type: "credit" | "debit" }[] }>
  > {
    const res = await paySprintPost("/aeps/v3/ministatement/index", {
      aadhaar: params.aadhaarNumber,
      bankiin: params.bankIin,
      mobile: params.mobile,
      piddata: params.biometricPayload,
    });
    const rows = Array.isArray(res.data) ? (res.data as Record<string, unknown>[]) : [];
    const statement = rows.map((r) => ({
      date: String(r.date ?? ""),
      narration: String(r.narration ?? r.remarks ?? ""),
      amount: String(r.amount ?? "0"),
      type: (r.type === "credit" ? "credit" : "debit") as "credit" | "debit",
    }));
    return this.toResult(res, "AEPS mini statement", undefined, { statement });
  }

  async aadhaarPay(params: AepsParams): Promise<ProviderResult> {
    const res = await paySprintPost("/aadharpay/aadharpay/index", {
      aadhaar: params.aadhaarNumber,
      bankiin: params.bankIin,
      mobile: params.mobile,
      amount: params.amount,
      piddata: params.biometricPayload,
      referenceid: params.externalRef ?? randomUUID(),
    });
    return this.toResult(res, "Aadhaar Pay", params.amount, {});
  }

  async checkStatus(params: CheckStatusParams): Promise<ProviderResult> {
    const path = params.serviceCode?.startsWith("dmt")
      ? "/dmt-casa/transact/querytransact"
      : "/aeps/aepsquery/query";
    const res = await paySprintPost(path, {
      referenceid: params.providerTxnId ?? params.clientRef,
    });
    return this.toResult(res, "Status check", undefined, {});
  }

  private toResult<T extends Record<string, unknown>>(
    res: PaySprintApiResponse,
    operation: string,
    amount: string | undefined,
    data: T,
  ): ProviderResult<T> {
    const status = this.mapStatus(res);
    const dataObj = (res.data ?? {}) as Record<string, unknown>;
    return {
      success: status === "success",
      status,
      providerTxnId: (dataObj.ackno as string) ?? res.ackno ?? res.referenceid ?? null,
      amount: amount ?? null,
      message: res.message ?? `${operation} — no message from provider`,
      data,
      raw: res as unknown as Record<string, unknown>,
    };
  }

  // ── DMT (PaySprint "dmt-casa") ───────────────────────────────────────────
  // PaySprint's DMT flow is NOT a 1:1 shape match for InstantPay's remitter-registration
  // methods — see docs/TASKS/22-paysprint-adapter.md. Account-opening (check_aadhaar →
  // check_pan → ekyc → check_pincode → generate_otp → submit_account_details) needs address/
  // biometric/PAN fields our DmtRemitterRegistrationParams/DmtRemitterKycParams don't carry,
  // and folding 5 remote calls into one adapter method with no way to recover mid-chain on
  // failure is exactly the kind of guess Part C rules out for money-adjacent flows. Left
  // explicitly not-implemented until PaySprint confirms whether an already-banked remitter can
  // skip account-opening (in which case QueryRemitter alone may be enough) — do not fake this.

  dmtBankList(_params: DmtBankListParams): Promise<ProviderResult<{ banks: DmtBank[] }>> {
    // PaySprint bank list is a static asset (PaySprint/Unimplemented/DMT_BANK_LIST.md, 1903
    // rows), not a live API — needs a seed/cache step (Task 23/24), not an adapter HTTP call.
    this.notImplemented("dmtBankList (static asset — needs seeding, see DMT_BANK_LIST.md)");
  }

  async dmtRemitterProfile(
    params: DmtRemitterProfileParams,
  ): Promise<ProviderResult<{ profile: DmtRemitterProfile | null; referenceKey?: string; validity?: string }>> {
    const res = await paySprintPost("/dmt-casa/Queryremitter", {
      mobile: params.customerMobile,
    });
    const status = this.mapStatus(res);
    if (status !== "success") {
      // PaySprint sample response has no rich profile fields — a clean "not found/failed"
      // reply is treated as unregistered (registration flow currently blocked, see above).
      return {
        success: false,
        status,
        providerTxnId: null,
        amount: null,
        message: res.message ?? "Remitter not found",
        data: { profile: null },
        raw: res as unknown as Record<string, unknown>,
      };
    }
    const data = (res.data ?? {}) as Record<string, unknown>;
    const profile: DmtRemitterProfile = {
      registered: true,
      mobileNumber: params.customerMobile,
      firstName: String(data.firstname ?? data.name ?? ""),
      lastName: String(data.lastname ?? ""),
      city: String(data.city ?? ""),
      pincode: String(data.pincode ?? ""),
      // PaySprint QueryRemitter sample doesn't document limit fields — unknown until a real
      // sandbox response is captured; leave as "0" rather than fabricate a number.
      limitPerTransaction: "0",
      limitTotal: "0",
      limitConsumed: "0",
      limitAvailable: "0",
      limitDetails: {},
      beneficiaries: [],
      isTxnOtpRequired: true,
      isTxnBioAuthRequired: false,
      isImpsAllowed: true,
      isNeftAllowed: true,
      isFaceAuthAvailable: false,
      referenceKey: String(data.referenceid ?? res.referenceid ?? ""),
      validity: "",
      pidOptionWadh: "",
    };
    return {
      success: true,
      status,
      providerTxnId: null,
      amount: null,
      message: res.message ?? "",
      data: { profile },
      raw: res as unknown as Record<string, unknown>,
    };
  }

  dmtRemitterRegister(
    _params: DmtRemitterRegistrationParams,
  ): Promise<ProviderResult<{ otpReference: string }>> {
    this.notImplemented(
      "dmtRemitterRegister (PaySprint account-opening chain needs fields our contract doesn't carry — confirm with PaySprint before mapping)",
    );
  }
  dmtRemitterRegisterVerify(
    _params: DmtRemitterRegistrationVerifyParams,
  ): Promise<ProviderResult<{ referenceId: string }>> {
    this.notImplemented("dmtRemitterRegisterVerify (blocked on dmtRemitterRegister — see above)");
  }
  dmtRemitterKyc(_params: DmtRemitterKycParams): Promise<ProviderResult<{ poolReferenceId: string }>> {
    this.notImplemented("dmtRemitterKyc (folded into PaySprint account-opening — see dmtRemitterRegister)");
  }

  async dmtAddBeneficiary(
    params: DmtBeneficiaryParams,
  ): Promise<ProviderResult<{ beneficiaryId: string; referenceKey: string; validity: string }>> {
    const res = await paySprintPost("/dmt-casa/beneficiary/sendotp", {
      mobile: params.customerMobile,
      benename: params.name,
      bankid: params.bankId,
      accno: params.accountNumber,
      ifsccode: params.ifsc,
    });
    const data = (res.data ?? {}) as Record<string, unknown>;
    return this.toResult(res, "DMT beneficiary OTP", undefined, {
      beneficiaryId: String(data.bene_id ?? ""),
      referenceKey: String(data.referenceid ?? res.referenceid ?? ""),
      validity: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    });
  }

  async dmtAddBeneficiaryVerify(
    params: DmtBeneficiaryVerifyParams,
  ): Promise<ProviderResult<{ beneficiaryId: string }>> {
    const res = await paySprintPost("/dmt-casa/beneficiary/add_bene", {
      mobile: params.customerMobile,
      otp: params.otp,
      bene_id: params.beneficiaryId,
      referenceid: params.referenceKey,
    });
    return this.toResult(res, "DMT beneficiary add verify", undefined, {
      beneficiaryId: params.beneficiaryId,
    });
  }

  async dmtDeleteBeneficiary(
    params: DmtBeneficiaryDeleteParams,
  ): Promise<ProviderResult<{ beneficiaryId: string; referenceKey: string; validity: string }>> {
    // PaySprint docs show a single-call delete (no separate send-OTP step, unlike InstantPay) —
    // deletion happens here; dmtDeleteBeneficiaryVerify below is a no-op pass-through so the
    // controller's two-step call pattern still works without a second provider round-trip.
    const res = await paySprintPost("/dmt-casa/beneficiary/deletebene", {
      mobile: params.customerMobile,
      bene_id: params.beneficiaryId,
    });
    return this.toResult(res, "DMT beneficiary delete", undefined, {
      beneficiaryId: params.beneficiaryId,
      referenceKey: "",
      validity: "",
    });
  }

  async dmtDeleteBeneficiaryVerify(
    params: DmtBeneficiaryVerifyParams,
  ): Promise<ProviderResult<{ beneficiaryId: string }>> {
    // No-op — see dmtDeleteBeneficiary comment. Deletion already happened; nothing to verify.
    return {
      success: true,
      status: "success",
      providerTxnId: null,
      amount: null,
      message: "Beneficiary already deleted (PaySprint delete is single-step)",
      data: { beneficiaryId: params.beneficiaryId },
      raw: {},
    };
  }

  async dmtGenerateTransactionOtp(
    params: DmtTransactionOtpParams,
  ): Promise<ProviderResult<{ referenceKey: string; validity: string }>> {
    const res = await paySprintPost("/dmt-casa/transact/send_otp", {
      mobile: params.customerMobile,
      amount: params.amount,
      referenceid: params.referenceKey,
    });
    const data = (res.data ?? {}) as Record<string, unknown>;
    return this.toResult(res, "DMT transaction OTP", undefined, {
      referenceKey: String(data.referenceid ?? res.referenceid ?? params.referenceKey),
      validity: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    });
  }

  async dmtTransfer(params: DmtTransferParams): Promise<ProviderResult> {
    const res = await paySprintPost("/dmt-casa/transact/process", {
      mobile: params.customerMobile,
      amount: params.amount,
      otp: params.otp,
      referenceid: params.referenceKey,
      txntype: params.mode.toUpperCase(),
      account_number: params.accountNumber,
    });
    const data = (res.data ?? {}) as Record<string, unknown>;
    const status = this.mapStatus(res);
    return {
      success: status === "success",
      status,
      providerTxnId: String(data.ackno ?? res.ackno ?? data.utr ?? res.utr ?? "") || null,
      amount: params.amount,
      message: res.message ?? "",
      data: {
        externalRef: params.externalRef ?? "",
        txnReferenceId: String(data.utr ?? res.utr ?? ""),
        poolReferenceId: String(data.ackno ?? res.ackno ?? ""),
        beneficiaryName: String(data.benename ?? ""),
      },
      raw: res as unknown as Record<string, unknown>,
    };
  }

  async dmtTransactionRefundOtp(
    params: DmtRefundOtpParams,
  ): Promise<ProviderResult<{ referenceKey: string; validity: string }>> {
    const res = await paySprintPost("/dmt-casa/refund/resendotp", {
      ackno: params.ipayId,
    });
    const data = (res.data ?? {}) as Record<string, unknown>;
    return this.toResult(res, "DMT refund OTP", undefined, {
      referenceKey: String(data.referenceid ?? res.referenceid ?? ""),
      validity: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    });
  }

  async dmtTransactionRefund(params: DmtRefundParams): Promise<ProviderResult> {
    const res = await paySprintPost("/dmt-casa/refund/index", {
      ackno: params.ipayId,
      referenceid: params.referenceKey,
      otp: params.otp,
    });
    return this.toResult(res, "DMT transaction refund", undefined, { ipayId: params.ipayId });
  }

  nepalStaticData(
    _params: NepalStaticDataParams,
  ): Promise<ProviderResult<{ items: NepalStaticOption[]; type: NepalStaticDataType }>> {
    this.notImplemented("nepalStaticData");
  }
  nepalPaymentLocationList(
    _params: NepalPaymentLocationListParams,
  ): Promise<ProviderResult<{ locations: NepalPaymentLocation[] }>> {
    this.notImplemented("nepalPaymentLocationList");
  }
  nepalStateDistrict(
    _params: NepalStateDistrictParams,
  ): Promise<ProviderResult<{ items: NepalStateDistrict[] }>> {
    this.notImplemented("nepalStateDistrict");
  }
  nepalOutletStatus(_params: NepalOutletStatusParams): Promise<ProviderResult<{ outlet: NepalOutletStatus }>> {
    this.notImplemented("nepalOutletStatus");
  }
  nepalOutletRegistration(
    _params: NepalOutletRegistrationParams,
  ): Promise<ProviderResult<{ registration: NepalOutletRegistrationResult }>> {
    this.notImplemented("nepalOutletRegistration");
  }
  nepalOutletEkycInitiate(
    _params: NepalOutletEkycInitiateParams,
  ): Promise<ProviderResult<{ ekyc: NepalOutletEkycInitiateResult }>> {
    this.notImplemented("nepalOutletEkycInitiate");
  }
  nepalOutletEkycInitiateStatus(
    _params: NepalOutletEkycInitiateStatusParams,
  ): Promise<ProviderResult<{ ekycStatus: NepalOutletEkycInitiateStatusResult }>> {
    this.notImplemented("nepalOutletEkycInitiateStatus");
  }
  nepalOutletEkycProcess(
    _params: NepalOutletEkycProcessParams,
  ): Promise<ProviderResult<{ process: NepalOutletEkycProcessResult }>> {
    this.notImplemented("nepalOutletEkycProcess");
  }
  nepalRemitterProfile(
    _params: NepalRemitterProfileParams,
  ): Promise<ProviderResult<{ profile: NepalRemitterProfile | null }>> {
    this.notImplemented("nepalRemitterProfile");
  }
  nepalOtpRequest(_params: NepalOtpRequestParams): Promise<ProviderResult<{ otpReference: string }>> {
    this.notImplemented("nepalOtpRequest");
  }
  nepalRemitterRegistration(
    _params: NepalRemitterRegistrationParams,
  ): Promise<ProviderResult<{ profile: NepalRemitterProfile }>> {
    this.notImplemented("nepalRemitterRegistration");
  }
  nepalRemitterEkycInitiate(
    _params: NepalRemitterEkycInitiateParams,
  ): Promise<ProviderResult<{ ekyc: NepalRemitterEkycInitiateResult }>> {
    this.notImplemented("nepalRemitterEkycInitiate");
  }
  nepalRemitterEkycInitiateStatus(
    _params: NepalRemitterEkycInitiateStatusParams,
  ): Promise<ProviderResult<{ ekycStatus: NepalRemitterEkycInitiateStatusResult }>> {
    this.notImplemented("nepalRemitterEkycInitiateStatus");
  }
  nepalRemitterEkycProcess(
    _params: NepalRemitterEkycProcessParams,
  ): Promise<ProviderResult<{ process: NepalOutletEkycProcessResult }>> {
    this.notImplemented("nepalRemitterEkycProcess");
  }
  nepalRemitterUpdate(
    _params: NepalRemitterUpdateParams,
  ): Promise<ProviderResult<{ update: NepalRemitterUpdateResult }>> {
    this.notImplemented("nepalRemitterUpdate");
  }
  nepalBeneficiaryRegistration(
    _params: NepalBeneficiaryRegistrationParams,
  ): Promise<ProviderResult<{ profile: NepalRemitterProfile; beneficiaryId: string }>> {
    this.notImplemented("nepalBeneficiaryRegistration");
  }
  nepalServiceCharge(
    _params: NepalServiceChargeParams,
  ): Promise<ProviderResult<{ quote: NepalServiceChargeQuote }>> {
    this.notImplemented("nepalServiceCharge");
  }
  nepalFundTransfer(_params: NepalFundTransferParams): Promise<ProviderResult> {
    this.notImplemented("nepalFundTransfer");
  }
  nepalFetchTransactionStatus(
    _params: NepalFetchTransactionStatusParams,
  ): Promise<ProviderResult<{ txnStatus: NepalFetchTransactionStatusResult }>> {
    this.notImplemented("nepalFetchTransactionStatus");
  }

  bbpsFetchBill(
    _params: BbpsFetchBillParams,
  ): Promise<ProviderResult<{ billFetchRef: string; customerName: string; billAmount: string; dueDate: string }>> {
    this.notImplemented("bbpsFetchBill");
  }
  bbpsPayBill(_params: BbpsPayBillParams): Promise<ProviderResult> {
    this.notImplemented("bbpsPayBill");
  }
  recharge(_params: RechargeParams): Promise<ProviderResult> {
    this.notImplemented("recharge");
  }
}
