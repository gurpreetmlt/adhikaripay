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
  DmtBeneficiaryParams,
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

  async checkStatus(params: CheckStatusParams): Promise<ProviderResult> {
    const res = await instantPayPost(
      "/fi/aeps/transactionStatus",
      {
        externalRef: params.clientRef,
        orderId: params.providerTxnId,
      },
      // Status checks still need outlet headers — use placeholder outlet from env mode docs;
      // callers should pass clientRef that InstantPay can resolve.
      { outletId: "0", endpointIp: "127.0.0.1" },
    );
    return this.toResult(res, null);
  }

  dmtAddBeneficiary(_params: DmtBeneficiaryParams): Promise<ProviderResult<{ beneficiaryId: string }>> {
    return Promise.reject(new HttpError(501, "InstantPay DMT not wired yet", "INSTANTPAY_DMT_UNWIRED"));
  }

  dmtTransfer(_params: DmtTransferParams): Promise<ProviderResult> {
    return Promise.reject(new HttpError(501, "InstantPay DMT not wired yet", "INSTANTPAY_DMT_UNWIRED"));
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
