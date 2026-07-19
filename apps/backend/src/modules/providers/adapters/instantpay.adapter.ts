import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../../../db/postgres";
import { users } from "../../../db/postgres/schema";
import { HttpError } from "../../../utils/httpError";
import { encryptInstantPayAadhaar } from "../instantpay/crypto";
import { instantPayGet, instantPayPost, mapInstantPayStatus, type InstantPayApiResponse } from "../instantpay/client";
import { parsePidDataXml } from "../instantpay/pidXml";
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
  DmtRemitterBeneficiary,
  DmtRemitterProfile,
  DmtRemitterKycParams,
  DmtRemitterProfileParams,
  DmtRemitterRegistrationParams,
  DmtRemitterRegistrationVerifyParams,
  DmtRefundOtpParams,
  DmtRefundParams,
  DmtTransactionOtpParams,
  DmtTransferParams,
  ProviderAdapter,
  ProviderResult,
  RechargeParams,
} from "../types";

/**
 * Real InstantPay adapter for AEPS (+ agent daily 2FA).
 * Non-AEPS rails throw until wired — DMT/BBPS stay on stub adapters via DB routing.
 */
export class InstantPayAdapter implements ProviderAdapter {
  readonly code = "instantpay";
  readonly isStub = false;

  private async resolveOutletContext(params: {
    retailerUserId: string;
    outletId?: string;
    endpointIp?: string;
    latitude?: string;
    longitude?: string;
  }): Promise<{ outletId: string; endpointIp: string; latitude: string; longitude: string }> {
    const [user] = await db
      .select({
        instantpayOutletId: users.instantpayOutletId,
        outletLatitude: users.outletLatitude,
        outletLongitude: users.outletLongitude,
      })
      .from(users)
      .where(eq(users.id, params.retailerUserId));

    const outletId = params.outletId || user?.instantpayOutletId;
    if (!outletId) {
      throw new HttpError(
        422,
        "InstantPay outlet id missing for this retailer — complete merchant onboarding first",
        "INSTANTPAY_OUTLET_REQUIRED",
      );
    }

    const latitude = params.latitude || user?.outletLatitude;
    const longitude = params.longitude || user?.outletLongitude;
    if (!latitude || !longitude) {
      throw new HttpError(422, "Latitude and longitude are required for AePS", "AEPS_GEO_REQUIRED");
    }

    return {
      outletId,
      endpointIp: params.endpointIp || "127.0.0.1",
      latitude,
      longitude,
    };
  }

  /** Outlet id only — for reads (bank list) that don't need geo. */
  private async resolveOutletId(retailerUserId: string, outletId?: string): Promise<string> {
    if (outletId) return outletId;
    const [user] = await db
      .select({ instantpayOutletId: users.instantpayOutletId })
      .from(users)
      .where(eq(users.id, retailerUserId));
    if (!user?.instantpayOutletId) {
      throw new HttpError(
        422,
        "InstantPay outlet id missing for this retailer — complete merchant onboarding first",
        "INSTANTPAY_OUTLET_REQUIRED",
      );
    }
    return user.instantpayOutletId;
  }

  private toResult(
    res: InstantPayApiResponse,
    amount: string | null,
    data: Record<string, unknown> = {},
  ): ProviderResult {
    const status = mapInstantPayStatus(res);
    return {
      success: status === "success",
      status,
      providerTxnId: (res.orderid as string | null) ?? (res.ipay_uuid as string | null) ?? null,
      amount,
      message: String(res.status ?? (status === "success" ? "OK" : "InstantPay declined")),
      data,
      raw: res as Record<string, unknown>,
    };
  }

  private buildBiometric(aadhaarNumber: string, biometricPayload: string) {
    const encryptedAadhaar = encryptInstantPayAadhaar(aadhaarNumber);
    return parsePidDataXml(biometricPayload, encryptedAadhaar);
  }

  async agentAuth(params: AgentAuthParams): Promise<ProviderResult> {
    const ctx = await this.resolveOutletContext(params);
    const externalRef = params.externalRef || `AA-${randomUUID().replace(/-/g, "").slice(0, 16)}`;
    const res = await instantPayPost(
      "/fi/aeps/outletLogin",
      {
        type: "DAILY_LOGIN",
        latitude: ctx.latitude,
        longitude: ctx.longitude,
        externalRef,
        captureType: "FINGER",
        biometricData: this.buildBiometric(params.aadhaarNumber, params.biometricPayload),
      },
      { outletId: ctx.outletId, endpointIp: params.endpointIp || ctx.endpointIp },
    );
    // Daily 2FA success = actcode LOGGEDIN ONLY. A biometric-mismatch failure ALSO returns
    // statuscode TXN but actcode LOGINREQUIRED (and is chargeable) — never unlock on it.
    const actcode = String(res.actcode ?? "").toUpperCase();
    const loggedIn = actcode === "LOGGEDIN";
    const base = this.toResult(res, null, { actcode: res.actcode ?? null });
    return {
      ...base,
      success: loggedIn,
      status: loggedIn ? "success" : "failed",
      message: loggedIn
        ? String(res.status ?? "Daily 2FA successful")
        : actcode === "LOGINREQUIRED"
          ? "Biometric did not match — scan again to retry daily 2FA"
          : base.message,
    };
  }

  async aepsBalanceEnquiry(params: AepsParams): Promise<ProviderResult<{ balance: string }>> {
    const ctx = await this.resolveOutletContext(params);
    const externalRef = params.externalRef || `BE-${randomUUID().replace(/-/g, "").slice(0, 16)}`;
    const res = await instantPayPost(
      "/fi/aeps/balanceEnquiry",
      {
        bankiin: params.bankIin,
        latitude: ctx.latitude,
        longitude: ctx.longitude,
        mobile: params.mobile,
        externalRef,
        captureType: "FINGER",
        biometricData: this.buildBiometric(params.aadhaarNumber, params.biometricPayload),
      },
      { outletId: ctx.outletId, endpointIp: params.endpointIp || ctx.endpointIp },
    );
    const data = (res.data && !Array.isArray(res.data) ? res.data : {}) as Record<string, unknown>;
    const balance = String(data.balance ?? data.Balance ?? "0");
    const mapped = this.toResult(res, null, { balance });
    return { ...mapped, data: { balance } };
  }

  async aepsWithdraw(params: AepsParams): Promise<ProviderResult> {
    const ctx = await this.resolveOutletContext(params);
    const externalRef = params.externalRef || `CW-${randomUUID().replace(/-/g, "").slice(0, 16)}`;
    const res = await instantPayPost(
      "/fi/aeps/cashWithdrawal",
      {
        bankiin: params.bankIin,
        latitude: ctx.latitude,
        longitude: ctx.longitude,
        mobile: params.mobile,
        amount: params.amount,
        externalRef,
        captureType: "FINGER",
        // ₹5,000+ withdrawals: referenceKey from /transactionOtp; OTP itself rides inside the
        // PID (RD service PidOptions otp attribute), not in this JSON body.
        ...(params.otpReferenceKey ? { referenceKey: params.otpReferenceKey } : {}),
        biometricData: this.buildBiometric(params.aadhaarNumber, params.biometricPayload),
      },
      { outletId: ctx.outletId, endpointIp: params.endpointIp || ctx.endpointIp },
    );
    return this.toResult(res, params.amount ?? null);
  }

  async aepsDeposit(params: AepsParams): Promise<ProviderResult> {
    const ctx = await this.resolveOutletContext(params);
    const externalRef = params.externalRef || `CD-${randomUUID().replace(/-/g, "").slice(0, 16)}`;
    const res = await instantPayPost(
      "/fi/aeps/cashDeposit",
      {
        bankiin: params.bankIin,
        latitude: ctx.latitude,
        longitude: ctx.longitude,
        mobile: params.mobile,
        amount: params.amount,
        externalRef,
        captureType: "FINGER",
        biometricData: this.buildBiometric(params.aadhaarNumber, params.biometricPayload),
      },
      { outletId: ctx.outletId, endpointIp: params.endpointIp || ctx.endpointIp },
    );
    return this.toResult(res, params.amount ?? null);
  }

  async aepsBankList(params: AepsBankListParams): Promise<ProviderResult<{ banks: AepsBank[] }>> {
    const outletId = await this.resolveOutletId(params.retailerUserId, params.outletId);
    const res = await instantPayGet("/fi/aeps/banks", {
      outletId,
      endpointIp: params.endpointIp || "127.0.0.1",
    });
    const rows = Array.isArray(res.data) ? (res.data as Record<string, unknown>[]) : [];
    const banks: AepsBank[] = rows.map((r) => ({
      bankId: (r.bankId as number | string) ?? "",
      name: String(r.name ?? ""),
      iin: String(r.iin ?? ""),
      aepsEnabled: Boolean(r.aepsEnabled),
      aadhaarpayEnabled: Boolean(r.aadhaarpayEnabled),
      aepsFailureRate: String(r.aepsFailureRate ?? ""),
      aadhaarpayFailureRate: String(r.aadhaarpayFailureRate ?? ""),
    }));
    const mapped = this.toResult(res, null, { banks });
    return { ...mapped, data: { banks } };
  }

  async aepsTransactionOtp(
    params: AepsTxnOtpParams,
  ): Promise<ProviderResult<{ referenceKey: string; validity: string }>> {
    const ctx = await this.resolveOutletContext(params);
    const res = await instantPayPost(
      "/fi/aeps/transactionOtp",
      {
        bankiin: params.bankIin,
        encryptedAadhaar: encryptInstantPayAadhaar(params.aadhaarNumber),
        latitude: ctx.latitude,
        longitude: ctx.longitude,
        amount: params.amount,
        mobile: params.mobile,
      },
      { outletId: ctx.outletId, endpointIp: params.endpointIp || ctx.endpointIp },
    );
    // Success statuscode for this endpoint is "OTP" (not TXN).
    const sent = String(res.statuscode ?? "").toUpperCase() === "OTP";
    const data = (res.data && !Array.isArray(res.data) ? res.data : {}) as Record<string, unknown>;
    const referenceKey = String(data.referenceKey ?? "");
    const validity = String(data.validity ?? "");
    return {
      success: sent && referenceKey.length > 0,
      status: sent && referenceKey.length > 0 ? "success" : "failed",
      providerTxnId: (res.orderid as string | null) ?? (res.ipay_uuid as string | null) ?? null,
      amount: null,
      message: String(res.status ?? (sent ? "OTP sent" : "OTP request failed")),
      data: { referenceKey, validity },
      raw: res as Record<string, unknown>,
    };
  }

  async aepsMiniStatement(
    params: AepsParams,
  ): Promise<
    ProviderResult<{ statement: { date: string; narration: string; amount: string; type: "credit" | "debit" }[] }>
  > {
    const ctx = await this.resolveOutletContext(params);
    const externalRef = params.externalRef || `MS-${randomUUID().replace(/-/g, "").slice(0, 16)}`;
    const res = await instantPayPost(
      "/fi/aeps/miniStatement",
      {
        bankiin: params.bankIin,
        latitude: ctx.latitude,
        longitude: ctx.longitude,
        mobile: params.mobile,
        externalRef,
        captureType: "FINGER",
        biometricData: this.buildBiometric(params.aadhaarNumber, params.biometricPayload),
      },
      { outletId: ctx.outletId, endpointIp: params.endpointIp || ctx.endpointIp },
    );
    const data = (res.data && !Array.isArray(res.data) ? res.data : {}) as Record<string, unknown>;
    const rows = Array.isArray(data.miniStatement)
      ? data.miniStatement
      : Array.isArray(data.statement)
        ? data.statement
        : [];
    const statement = (rows as Record<string, unknown>[]).map((r) => ({
      date: String(r.date ?? r.txnDate ?? ""),
      narration: String(r.narration ?? r.Narration ?? ""),
      amount: String(r.amount ?? r.Amount ?? "0"),
      type: String(r.type ?? r.txnType ?? "debit").toLowerCase() === "credit" ? ("credit" as const) : ("debit" as const),
    }));
    const mapped = this.toResult(res, null, { statement });
    return { ...mapped, data: { statement } };
  }

  async aadhaarPay(params: AepsParams): Promise<ProviderResult> {
    const ctx = await this.resolveOutletContext(params);
    const externalRef = params.externalRef || `AP-${randomUUID().replace(/-/g, "").slice(0, 16)}`;
    const res = await instantPayPost(
      "/fi/aeps/aadhaarPay",
      {
        bankiin: params.bankIin,
        latitude: ctx.latitude,
        longitude: ctx.longitude,
        mobile: params.mobile,
        amount: params.amount,
        externalRef,
        captureType: "FINGER",
        biometricData: this.buildBiometric(params.aadhaarNumber, params.biometricPayload),
      },
      { outletId: ctx.outletId, endpointIp: params.endpointIp || ctx.endpointIp },
    );
    return this.toResult(res, params.amount ?? null);
  }

  /**
   * Transaction Status (POST /reports/txnStatus) — client-level reports API, no outlet header.
   * Provider rules: query only for TUP/timeout txns, ≥30 min after the txn, ≥4 h between
   * retries for the same txn, history available for 30 days, nightly maintenance 11:30 PM–00:30 AM.
   * Our recheck flow already spaces retries; finalizeTxn is idempotent either way.
   */
  async checkStatus(params: CheckStatusParams): Promise<ProviderResult> {
    if (!params.txnDate) {
      throw new HttpError(422, "Transaction date required for status check", "TXN_DATE_REQUIRED");
    }
    const isAeps =
      !params.serviceCode ||
      params.serviceCode.startsWith("aeps_") ||
      params.serviceCode === "aadhaar_pay";
    const res = await instantPayPost(
      "/reports/txnStatus",
      {
        transactionDate: params.txnDate,
        // We send externalRef = our txnRef on every money call, so lookup is deterministic.
        externalRef: params.clientRef,
        // source ORDER applies to AePS transactions only per InstantPay docs.
        ...(isAeps ? { source: "ORDER" } : {}),
      },
      { endpointIp: "127.0.0.1" },
    );

    // Two-level status: outer statuscode must be TXN for the QUERY itself; the txn's real
    // state is transactionStatusCode (TXN success / TUP pending / anything else failed).
    // Outer non-TXN = query didn't resolve — treat as pending, never settle on it.
    const outer = String(res.statuscode ?? "").toUpperCase();
    const data = (res.data && !Array.isArray(res.data) ? res.data : {}) as Record<string, unknown>;
    const inner = String(data.transactionStatusCode ?? "").toUpperCase();
    const status: "success" | "failed" | "pending" =
      outer !== "TXN" ? "pending" : inner === "TXN" ? "success" : inner === "TUP" ? "pending" : "failed";
    const amount = data.transactionAmount != null ? String(data.transactionAmount) : null;
    return {
      success: status === "success",
      status,
      providerTxnId:
        (data.transactionReferenceId as string | null) ??
        (res.orderid as string | null) ??
        (res.ipay_uuid as string | null) ??
        null,
      amount,
      message: String(data.transactionStatus ?? res.status ?? status),
      data: {},
      raw: res as Record<string, unknown>,
    };
  }

  async dmtBankList(params: DmtBankListParams): Promise<ProviderResult<{ banks: DmtBank[] }>> {
    const outletId = await this.resolveOutletId(params.retailerUserId, params.outletId);
    // InstantPay expects POST with empty body; sync at most once/hour on the client.
    const res = await instantPayPost(
      "/fi/remit/out/domestic/v2/banks",
      {},
      { outletId, endpointIp: params.endpointIp || "127.0.0.1" },
    );
    const rows = Array.isArray(res.data) ? (res.data as Record<string, unknown>[]) : [];
    const banks: DmtBank[] = rows.map((r) => ({
      bankId: (r.bankId as number | string) ?? "",
      name: String(r.name ?? ""),
      ifscAlias: String(r.ifscAlias ?? ""),
      ifscGlobal: String(r.ifscGlobal ?? ""),
      neftEnabled: Number(r.neftEnabled) === 1,
      impsEnabled: Number(r.impsEnabled) === 1,
      upiEnabled: Number(r.upiEnabled) === 1,
      neftFailureRate: String(r.neftFailureRate ?? "0"),
      impsFailureRate: String(r.impsFailureRate ?? "0"),
      upiFailureRate: String(r.upiFailureRate ?? "0"),
    }));
    const mapped = this.toResult(res, null, { banks });
    return { ...mapped, data: { banks } };
  }

  async dmtRemitterProfile(
    params: DmtRemitterProfileParams,
  ): Promise<ProviderResult<{ profile: DmtRemitterProfile | null }>> {
    const outletId = await this.resolveOutletId(params.retailerUserId, params.outletId);
    const res = await instantPayPost(
      "/fi/remit/out/domestic/v2/remitterProfile",
      {
        mobileNumber: params.customerMobile,
        txnMode: "ALL",
        iftEnable: "YES",
      },
      { outletId, endpointIp: params.endpointIp || "127.0.0.1" },
    );

    const code = String(res.statuscode ?? "").toUpperCase();
    const raw = res.data && !Array.isArray(res.data) ? (res.data as Record<string, unknown>) : null;
    const hasProfile = code === "TXN" && raw != null && String(raw.mobileNumber ?? "").length > 0;

    if (!hasProfile) {
      // Existence check: remitter not registered is a valid outcome (start registration).
      // InstantPay still returns referenceKey on RNF — needed for remitterRegistration.
      const referenceKey = String(raw?.referenceKey ?? "");
      const validity = String(raw?.validity ?? "");
      const notFound =
        code === "RNF" ||
        code === "SNR" ||
        /not\s*(found|register)/i.test(String(res.status ?? ""));
      if (notFound) {
        return {
          success: true,
          status: "success",
          providerTxnId: (res.orderid as string | null) ?? (res.ipay_uuid as string | null) ?? null,
          amount: null,
          message: String(res.status ?? "Remitter not registered"),
          data: { profile: null, referenceKey: referenceKey || undefined, validity: validity || undefined },
          raw: res as Record<string, unknown>,
        };
      }
      const mapped = this.toResult(res, null, {
        profile: null,
        referenceKey: referenceKey || undefined,
        validity: validity || undefined,
      });
      return {
        ...mapped,
        data: { profile: null, referenceKey: referenceKey || undefined, validity: validity || undefined },
      };
    }

    const limitDetailsRaw =
      raw.limitDetails && typeof raw.limitDetails === "object" && !Array.isArray(raw.limitDetails)
        ? (raw.limitDetails as Record<string, unknown>)
        : {};
    const limitDetails: Record<string, string> = {};
    for (const [k, v] of Object.entries(limitDetailsRaw)) {
      limitDetails[k] = String(v ?? "");
    }

    const beneficiariesRaw = Array.isArray(raw.beneficiaries) ? raw.beneficiaries : [];
    const beneficiaries: DmtRemitterBeneficiary[] = beneficiariesRaw.map((b) => {
      const row = (b && typeof b === "object" ? b : {}) as Record<string, unknown>;
      return {
        id: String(row.id ?? ""),
        name: String(row.name ?? ""),
        account: String(row.account ?? ""),
        ifsc: String(row.ifsc ?? ""),
        bank: String(row.bank ?? ""),
        beneficiaryMobileNumber: String(row.beneficiaryMobileNumber ?? ""),
        verificationDt: String(row.verificationDt ?? ""),
      };
    });

    const profile: DmtRemitterProfile = {
      registered: true,
      mobileNumber: String(raw.mobileNumber ?? params.customerMobile),
      firstName: String(raw.firstName ?? ""),
      lastName: String(raw.lastName ?? ""),
      city: String(raw.city ?? ""),
      pincode: String(raw.pincode ?? ""),
      limitPerTransaction: String(raw.limitPerTransaction ?? ""),
      limitTotal: String(raw.limitTotal ?? ""),
      limitConsumed: String(raw.limitConsumed ?? ""),
      limitAvailable: String(raw.limitAvailable ?? ""),
      limitDetails,
      beneficiaries,
      isTxnOtpRequired: Boolean(raw.isTxnOtpRequired),
      isTxnBioAuthRequired: Boolean(raw.isTxnBioAuthRequired),
      isImpsAllowed: Boolean(raw.isImpsAllowed),
      isNeftAllowed: Boolean(raw.isNeftAllowed),
      isFaceAuthAvailable: Boolean(raw.isFaceAuthAvailable),
      referenceKey: String(raw.referenceKey ?? ""),
      validity: String(raw.validity ?? ""),
      pidOptionWadh: String(raw.pidOptionWadh ?? ""),
    };

    return {
      success: true,
      status: "success",
      providerTxnId: (res.orderid as string | null) ?? (res.ipay_uuid as string | null) ?? null,
      amount: null,
      message: String(res.status ?? "Success"),
      data: { profile },
      raw: res as Record<string, unknown>,
    };
  }

  async dmtRemitterRegister(
    params: DmtRemitterRegistrationParams,
  ): Promise<ProviderResult<{ otpReference: string }>> {
    const outletId = await this.resolveOutletId(params.retailerUserId, params.outletId);
    const res = await instantPayPost(
      "/fi/remit/out/domestic/v2/remitterRegistration",
      {
        mobileNumber: params.customerMobile,
        encryptedAadhaar: encryptInstantPayAadhaar(params.aadhaarNumber),
        referenceKey: params.referenceKey,
      },
      { outletId, endpointIp: params.endpointIp || "127.0.0.1" },
    );

    const code = String(res.statuscode ?? "").toUpperCase();
    const raw = res.data && !Array.isArray(res.data) ? (res.data as Record<string, unknown>) : null;
    const otpReference = String(raw?.otpReference ?? "");

    // Success = statuscode OTP (OTP sent to remitter mobile, verify in next step).
    if (code === "OTP" && otpReference.length > 0) {
      return {
        success: true,
        status: "success",
        providerTxnId: (res.orderid as string | null) ?? (res.ipay_uuid as string | null) ?? null,
        amount: null,
        message: String(res.status ?? "OTP sent to remitter mobile"),
        data: { otpReference },
        raw: res as Record<string, unknown>,
      };
    }

    const mapped = this.toResult(res, null, { otpReference });
    return { ...mapped, data: { otpReference } };
  }

  async dmtRemitterRegisterVerify(
    params: DmtRemitterRegistrationVerifyParams,
  ): Promise<ProviderResult<{ referenceId: string }>> {
    const outletId = await this.resolveOutletId(params.retailerUserId, params.outletId);
    const res = await instantPayPost(
      "/fi/remit/out/domestic/v2/remitterRegistrationVerify",
      {
        mobileNumber: params.customerMobile,
        otp: params.otp,
        referenceKey: params.referenceKey,
      },
      { outletId, endpointIp: params.endpointIp || "127.0.0.1" },
    );

    const raw = res.data && !Array.isArray(res.data) ? (res.data as Record<string, unknown>) : null;
    const referenceId = String(raw?.referenceID ?? "");
    const mapped = this.toResult(res, null, { referenceId });
    return { ...mapped, data: { referenceId } };
  }

  async dmtRemitterKyc(params: DmtRemitterKycParams): Promise<ProviderResult<{ poolReferenceId: string }>> {
    const ctx = await this.resolveOutletContext(params);
    const externalRef = params.externalRef || `RK-${randomUUID().replace(/-/g, "").slice(0, 16)}`;
    // Aadhaar rides inside the encrypted PID block, so no encryptedAadhaar field here.
    const bio = parsePidDataXml(params.biometricPayload, "");
    const res = await instantPayPost(
      "/fi/remit/out/domestic/v2/remitterKyc",
      {
        mobileNumber: params.customerMobile,
        referenceKey: params.referenceKey,
        latitude: ctx.latitude,
        longitude: ctx.longitude,
        externalRef,
        consentTaken: "Y",
        captureType: params.captureType || "FINGER",
        biometricData: {
          ci: bio.ci,
          hmac: bio.hmac,
          pidData: bio.pidData,
          ts: bio.ts,
          dc: bio.dc,
          mi: bio.mi,
          dpId: bio.dpId,
          mc: bio.mc,
          rdsId: bio.rdsId,
          rdsVer: bio.rdsVer,
          Skey: bio.sessionKey,
          srno: bio.srno,
        },
      },
      { outletId: ctx.outletId, endpointIp: params.endpointIp || ctx.endpointIp },
    );

    const raw = res.data && !Array.isArray(res.data) ? (res.data as Record<string, unknown>) : null;
    const poolReferenceId = String(raw?.poolReferenceId ?? "");
    const mapped = this.toResult(res, null, { poolReferenceId, externalRef });
    return { ...mapped, data: { poolReferenceId } };
  }

  async dmtAddBeneficiary(
    params: DmtBeneficiaryParams,
  ): Promise<ProviderResult<{ beneficiaryId: string; referenceKey: string; validity: string }>> {
    const outletId = await this.resolveOutletId(params.retailerUserId, params.outletId);
    const res = await instantPayPost(
      "/fi/remit/out/domestic/v2/beneficiaryRegistration",
      {
        remitterMobileNumber: params.customerMobile,
        beneficiaryMobileNumber: params.beneficiaryMobile || params.customerMobile,
        accountNumber: params.accountNumber,
        ifsc: params.ifsc,
        ...(params.bankId ? { bankId: params.bankId } : {}),
        name: params.name,
      },
      { outletId, endpointIp: params.endpointIp || "127.0.0.1" },
    );

    const code = String(res.statuscode ?? "").toUpperCase();
    const raw = res.data && !Array.isArray(res.data) ? (res.data as Record<string, unknown>) : null;
    const beneficiaryId = String(raw?.beneficiaryId ?? "");
    const referenceKey = String(raw?.referenceKey ?? "");
    const validity = String(raw?.validity ?? "");

    // Success = statuscode OTP (OTP sent to remitter mobile, verify in next step).
    if (code === "OTP" && beneficiaryId.length > 0) {
      return {
        success: true,
        status: "success",
        providerTxnId: (res.orderid as string | null) ?? (res.ipay_uuid as string | null) ?? null,
        amount: null,
        message: String(res.status ?? "OTP sent to remitter mobile"),
        data: { beneficiaryId, referenceKey, validity },
        raw: res as Record<string, unknown>,
      };
    }

    const mapped = this.toResult(res, null, { beneficiaryId });
    return { ...mapped, data: { beneficiaryId, referenceKey, validity } };
  }

  async dmtAddBeneficiaryVerify(
    params: DmtBeneficiaryVerifyParams,
  ): Promise<ProviderResult<{ beneficiaryId: string }>> {
    const outletId = await this.resolveOutletId(params.retailerUserId, params.outletId);
    const res = await instantPayPost(
      "/fi/remit/out/domestic/v2/beneficiaryRegistrationVerify",
      {
        remitterMobileNumber: params.customerMobile,
        otp: params.otp,
        beneficiaryId: params.beneficiaryId,
        referenceKey: params.referenceKey,
      },
      { outletId, endpointIp: params.endpointIp || "127.0.0.1" },
    );

    const raw = res.data && !Array.isArray(res.data) ? (res.data as Record<string, unknown>) : null;
    const beneficiaryId = String(raw?.beneficiaryId ?? params.beneficiaryId);
    const mapped = this.toResult(res, null, { beneficiaryId });
    return { ...mapped, data: { beneficiaryId } };
  }

  async dmtDeleteBeneficiary(
    params: DmtBeneficiaryDeleteParams,
  ): Promise<ProviderResult<{ beneficiaryId: string; referenceKey: string; validity: string }>> {
    const outletId = await this.resolveOutletId(params.retailerUserId, params.outletId);
    const res = await instantPayPost(
      "/fi/remit/out/domestic/v2/beneficiaryDelete",
      {
        remitterMobileNumber: params.customerMobile,
        beneficiaryId: params.beneficiaryId,
      },
      { outletId, endpointIp: params.endpointIp || "127.0.0.1" },
    );

    // statuscode "OTP" = delete initiated, OTP sent to remitter — verify step completes it.
    const raw = res.data && !Array.isArray(res.data) ? (res.data as Record<string, unknown>) : null;
    const data = {
      beneficiaryId: String(raw?.beneficiaryId ?? params.beneficiaryId),
      referenceKey: String(raw?.referenceKey ?? ""),
      validity: String(raw?.validity ?? ""),
    };
    const mapped = this.toResult(res, null, data);
    return { ...mapped, data };
  }

  async dmtDeleteBeneficiaryVerify(
    params: DmtBeneficiaryVerifyParams,
  ): Promise<ProviderResult<{ beneficiaryId: string }>> {
    const outletId = await this.resolveOutletId(params.retailerUserId, params.outletId);
    const res = await instantPayPost(
      "/fi/remit/out/domestic/v2/beneficiaryDeleteVerify",
      {
        remitterMobileNumber: params.customerMobile,
        otp: params.otp,
        beneficiaryId: params.beneficiaryId,
        referenceKey: params.referenceKey,
      },
      { outletId, endpointIp: params.endpointIp || "127.0.0.1" },
    );

    const raw = res.data && !Array.isArray(res.data) ? (res.data as Record<string, unknown>) : null;
    const beneficiaryId = String(raw?.beneficiaryId ?? params.beneficiaryId);
    const mapped = this.toResult(res, null, { beneficiaryId });
    return { ...mapped, data: { beneficiaryId } };
  }

  async dmtGenerateTransactionOtp(
    params: DmtTransactionOtpParams,
  ): Promise<ProviderResult<{ referenceKey: string; validity: string }>> {
    const outletId = await this.resolveOutletId(params.retailerUserId, params.outletId);
    const res = await instantPayPost(
      "/fi/remit/out/domestic/v2/generateTransactionOtp",
      {
        remitterMobileNumber: params.customerMobile,
        amount: params.amount,
        referenceKey: params.referenceKey,
      },
      { outletId, endpointIp: params.endpointIp || "127.0.0.1" },
    );

    // statuscode "OTP" = OTP sent to remitter — the new referenceKey goes into the transfer call.
    const raw = res.data && !Array.isArray(res.data) ? (res.data as Record<string, unknown>) : null;
    const data = {
      referenceKey: String(raw?.referenceKey ?? ""),
      validity: String(raw?.validity ?? ""),
    };
    const mapped = this.toResult(res, null, data);
    return { ...mapped, data };
  }

  async dmtTransactionRefundOtp(
    params: DmtRefundOtpParams,
  ): Promise<ProviderResult<{ referenceKey: string; validity: string }>> {
    const outletId = await this.resolveOutletId(params.retailerUserId, params.outletId);
    const res = await instantPayPost(
      "/fi/remit/out/domestic/v2/transactionRefundOtp",
      { ipayId: params.ipayId },
      { outletId, endpointIp: params.endpointIp || "127.0.0.1" },
    );

    // statuscode "OTP" = OTP sent to remitter — referenceKey goes into the refund call.
    const raw = res.data && !Array.isArray(res.data) ? (res.data as Record<string, unknown>) : null;
    const data = {
      referenceKey: String(raw?.referenceKey ?? ""),
      validity: String(raw?.validity ?? ""),
    };
    const mapped = this.toResult(res, null, data);
    return { ...mapped, data };
  }

  async dmtTransactionRefund(params: DmtRefundParams): Promise<ProviderResult> {
    const outletId = await this.resolveOutletId(params.retailerUserId, params.outletId);
    const res = await instantPayPost(
      "/fi/remit/out/domestic/v2/transactionRefund",
      {
        ipayId: params.ipayId,
        referenceKey: params.referenceKey,
        otp: params.otp,
      },
      { outletId, endpointIp: params.endpointIp || "127.0.0.1" },
    );

    // Refund success pe pending txn reverse ho jaata hai — hamare ledger reversal ke liye
    // client ko /api/txn/:txnRef/recheck chalana hai (txnStatus se auto-reversal).
    const raw = res.data && !Array.isArray(res.data) ? (res.data as Record<string, unknown>) : {};
    return this.toResult(res, null, { ipayId: params.ipayId, ...raw });
  }

  async dmtTransfer(params: DmtTransferParams): Promise<ProviderResult> {
    const ctx = await this.resolveOutletContext(params);
    const externalRef = params.externalRef || `DT-${randomUUID().replace(/-/g, "").slice(0, 16)}`;
    const res = await instantPayPost(
      "/fi/remit/out/domestic/v2/transaction",
      {
        remitterMobileNumber: params.customerMobile,
        accountNumber: params.accountNumber,
        ifsc: params.ifsc,
        transferMode: params.mode.toUpperCase(),
        transferAmount: params.amount,
        latitude: ctx.latitude,
        longitude: ctx.longitude,
        referenceKey: params.referenceKey,
        otp: params.otp,
        externalRef,
      },
      { outletId: ctx.outletId, endpointIp: params.endpointIp || ctx.endpointIp },
    );

    // TXN = success, TUP = pending (toResult maps it) — recheck via /reports/txnStatus with our
    // externalRef. actcode OTPGENREF = declined for invalid OTP; client must restart with a fresh OTP.
    const raw = res.data && !Array.isArray(res.data) ? (res.data as Record<string, unknown>) : {};
    return this.toResult(res, params.amount, {
      externalRef: String(raw.externalRef ?? externalRef),
      txnReferenceId: String(raw.txnReferenceId ?? ""),
      poolReferenceId: String(raw.poolReferenceId ?? ""),
      beneficiaryName: String(raw.beneficiaryName ?? ""),
    });
  }

  bbpsFetchBill(
    _params: BbpsFetchBillParams,
  ): Promise<ProviderResult<{ billFetchRef: string; customerName: string; billAmount: string; dueDate: string }>> {
    return Promise.reject(new HttpError(501, "InstantPay BBPS not wired yet", "INSTANTPAY_BBPS_UNWIRED"));
  }

  bbpsPayBill(_params: BbpsPayBillParams): Promise<ProviderResult> {
    return Promise.reject(new HttpError(501, "InstantPay BBPS not wired yet", "INSTANTPAY_BBPS_UNWIRED"));
  }

  recharge(_params: RechargeParams): Promise<ProviderResult> {
    return Promise.reject(new HttpError(501, "InstantPay recharge not wired yet", "INSTANTPAY_RECHARGE_UNWIRED"));
  }
}
