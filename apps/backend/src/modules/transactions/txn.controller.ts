import type { Request, Response } from "express";
import { executeServiceTxn, recheckTxnStatus, listMyTransactions, getReceipt } from "./txn.service";
import { assertTxnAuthorization } from "../auth/txnPin";
import { assertAgentAuthFresh } from "../auth/agentAuth";
import { assertFreshBiometric } from "./biometricReplay";
import { resolveProvidersForService, callProvider } from "../providers/provider.router";
import {
  assertAepsCompliance,
  clearBiometricMismatch,
  recordBiometricMismatch,
  recordCashReceipt,
  touchLastAepsTxn,
} from "../aeps/compliance";
import { sendSuccess } from "../../utils/apiResponse";
import type {
  rechargeSchema,
  bbpsFetchBillSchema,
  bbpsPayBillSchema,
  dmtBeneficiarySchema,
  dmtTransferSchema,
  aepsEnquirySchema,
  aepsTxnOtpSchema,
  aepsWithdrawSchema,
  aepsDepositSchema,
  aadhaarPaySchema,
} from "./txn.validators";
import { z } from "zod";

function actor(req: Request) {
  return { id: req.auth!.sub, role: req.auth!.role };
}

function looksLikeBioMismatch(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes("biometric") && (m.includes("mismatch") || m.includes("not match") || m.includes("failed"));
}

async function afterAepsProviderResult(
  userId: string,
  aadhaarNumber: string,
  result: { success: boolean; status: string; message: string },
): Promise<void> {
  if (result.success && result.status === "success") {
    await clearBiometricMismatch(userId, aadhaarNumber);
    await touchLastAepsTxn(userId);
    return;
  }
  if (looksLikeBioMismatch(result.message)) {
    await recordBiometricMismatch(userId, aadhaarNumber);
  }
}

// ── Recharge ────────────────────────────────────────────────────────────────
export async function recharge(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof rechargeSchema>;
  await assertTxnAuthorization(actor(req).id, { txnPin: body.txnPin, txnAuth: body.txnAuth });

  const outcome = await executeServiceTxn({
    actor: actor(req),
    serviceCode: body.serviceCode,
    amount: body.amount,
    idempotencyKey: body.idempotencyKey,
    operation: "recharge",
    direction: "debit",
    walletType: "main",
    metadata: { operatorCode: body.operatorCode, accountRef: body.accountRef },
    invoke: (routed) =>
      routed.adapter.recharge({
        retailerUserId: actor(req).id,
        operatorCode: body.operatorCode,
        accountRef: body.accountRef,
        amount: body.amount,
      }),
  });
  sendSuccess(res, { txn: outcome.txn, provider: outcome.provider });
}

// ── BBPS ────────────────────────────────────────────────────────────────────
// Bill fetch moves no money — a plain provider read, no txn row.
export async function bbpsFetchBill(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof bbpsFetchBillSchema>;
  const routedProviders = await resolveProvidersForService(body.serviceCode);
  const result = await callProvider(routedProviders[0]!, "bbps_fetch_bill", null, { billerCode: body.billerCode }, (adapter) =>
    adapter.bbpsFetchBill({
      retailerUserId: actor(req).id,
      billerCode: body.billerCode,
      customerParams: body.customerParams,
    }),
  );
  sendSuccess(res, result);
}

export async function bbpsPayBill(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof bbpsPayBillSchema>;
  await assertTxnAuthorization(actor(req).id, { txnPin: body.txnPin, txnAuth: body.txnAuth });

  const outcome = await executeServiceTxn({
    actor: actor(req),
    serviceCode: body.serviceCode,
    amount: body.amount,
    idempotencyKey: body.idempotencyKey,
    operation: "bbps_pay_bill",
    direction: "debit",
    walletType: "main",
    metadata: { billerCode: body.billerCode, billFetchRef: body.billFetchRef, customerParams: body.customerParams },
    invoke: (routed) =>
      routed.adapter.bbpsPayBill({
        retailerUserId: actor(req).id,
        billerCode: body.billerCode,
        customerParams: body.customerParams,
        billFetchRef: body.billFetchRef,
        amount: body.amount,
      }),
  });
  sendSuccess(res, { txn: outcome.txn, provider: outcome.provider });
}

// ── DMT ─────────────────────────────────────────────────────────────────────
export async function dmtAddBeneficiary(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof dmtBeneficiarySchema>;
  const routedProviders = await resolveProvidersForService("dmt");
  const result = await callProvider(
    routedProviders[0]!,
    "dmt_add_beneficiary",
    null,
    { customerMobile: body.customerMobile, accountNumber: body.accountNumber, ifsc: body.ifsc },
    (adapter) => adapter.dmtAddBeneficiary({ retailerUserId: actor(req).id, ...body }),
  );
  sendSuccess(res, result);
}

export async function dmtTransfer(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof dmtTransferSchema>;
  await assertAgentAuthFresh(actor(req).id);
  await assertTxnAuthorization(actor(req).id, { txnPin: body.txnPin, txnAuth: body.txnAuth });

  const outcome = await executeServiceTxn({
    actor: actor(req),
    serviceCode: "dmt",
    amount: body.amount,
    idempotencyKey: body.idempotencyKey,
    operation: "dmt_transfer",
    direction: "debit",
    walletType: "main",
    metadata: { customerMobile: body.customerMobile, beneficiaryId: body.beneficiaryId, mode: body.mode },
    invoke: (routed) =>
      routed.adapter.dmtTransfer({
        retailerUserId: actor(req).id,
        customerMobile: body.customerMobile,
        beneficiaryId: body.beneficiaryId,
        amount: body.amount,
        mode: body.mode,
      }),
  });
  sendSuccess(res, { txn: outcome.txn, provider: outcome.provider });
}

// ── AEPS ────────────────────────────────────────────────────────────────────
export async function aepsBankList(req: Request, res: Response): Promise<void> {
  const userId = actor(req).id;
  const routedProviders = await resolveProvidersForService("aeps_bank_list");
  const result = await callProvider(routedProviders[0]!, "aeps_bank_list", null, {}, (adapter) =>
    adapter.aepsBankList({ retailerUserId: userId, endpointIp: req.ip ?? undefined }),
  );
  sendSuccess(res, result);
}

export async function aepsBalanceEnquiry(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof aepsEnquirySchema>;
  const userId = actor(req).id;
  await assertAgentAuthFresh(userId);
  await assertAepsCompliance(
    userId,
    body.latitude && body.longitude ? { latitude: body.latitude, longitude: body.longitude } : null,
  );
  await assertFreshBiometric(body.biometricPayload);
  const routedProviders = await resolveProvidersForService("aeps_balance_enquiry");
  const result = await callProvider(
    routedProviders[0]!,
    "aeps_balance_enquiry",
    null,
    { bankIin: body.bankIin, biometricPayload: body.biometricPayload },
    (adapter) =>
      adapter.aepsBalanceEnquiry({
        retailerUserId: userId,
        ...body,
        endpointIp: req.ip ?? undefined,
      }),
  );
  await afterAepsProviderResult(userId, body.aadhaarNumber, result);
  sendSuccess(res, result);
}

export async function aepsMiniStatement(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof aepsEnquirySchema>;
  const userId = actor(req).id;
  await assertAgentAuthFresh(userId);
  await assertAepsCompliance(
    userId,
    body.latitude && body.longitude ? { latitude: body.latitude, longitude: body.longitude } : null,
  );
  await assertFreshBiometric(body.biometricPayload);
  const routedProviders = await resolveProvidersForService("aeps_mini_statement");
  const result = await callProvider(
    routedProviders[0]!,
    "aeps_mini_statement",
    null,
    { bankIin: body.bankIin, biometricPayload: body.biometricPayload },
    (adapter) =>
      adapter.aepsMiniStatement({
        retailerUserId: userId,
        ...body,
        endpointIp: req.ip ?? undefined,
      }),
  );
  await afterAepsProviderResult(userId, body.aadhaarNumber, result);
  sendSuccess(res, result);
}

/** OTP for ₹5,000+ withdrawals. Moves no money; dummy mode returns a mock referenceKey. */
export async function aepsWithdrawOtp(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof aepsTxnOtpSchema>;
  const userId = actor(req).id;
  await assertAgentAuthFresh(userId);
  await assertAepsCompliance(
    userId,
    body.latitude && body.longitude ? { latitude: body.latitude, longitude: body.longitude } : null,
  );
  const routedProviders = await resolveProvidersForService("aeps_cash_withdrawal");
  const result = await callProvider(
    routedProviders[0]!,
    "aeps_txn_otp",
    null,
    { bankIin: body.bankIin, amount: body.amount },
    (adapter) =>
      adapter.aepsTransactionOtp({
        retailerUserId: userId,
        aadhaarNumber: body.aadhaarNumber,
        bankIin: body.bankIin,
        mobile: body.mobile,
        amount: body.amount,
        latitude: body.latitude,
        longitude: body.longitude,
        endpointIp: req.ip ?? undefined,
      }),
  );
  sendSuccess(res, result);
}

export async function aepsWithdraw(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof aepsWithdrawSchema>;
  const userId = actor(req).id;
  await assertAgentAuthFresh(userId);
  await assertAepsCompliance(
    userId,
    body.latitude && body.longitude ? { latitude: body.latitude, longitude: body.longitude } : null,
  );
  await assertFreshBiometric(body.biometricPayload);
  await assertTxnAuthorization(userId, { txnPin: body.txnPin, txnAuth: body.txnAuth });

  const outcome = await executeServiceTxn({
    actor: actor(req),
    serviceCode: "aeps_cash_withdrawal",
    amount: body.amount,
    idempotencyKey: body.idempotencyKey,
    operation: "aeps_withdraw",
    direction: "credit", // retailer paid out cash; reimbursed into AEPS wallet on success
    walletType: "aeps",
    metadata: {
      bankIin: body.bankIin,
      customerMobile: body.mobile,
      latitude: body.latitude,
      longitude: body.longitude,
    },
    invoke: (routed, txnRef) =>
      routed.adapter.aepsWithdraw({
        retailerUserId: userId,
        aadhaarNumber: body.aadhaarNumber,
        bankIin: body.bankIin,
        mobile: body.mobile,
        biometricPayload: body.biometricPayload,
        amount: body.amount,
        latitude: body.latitude,
        longitude: body.longitude,
        otpReferenceKey: body.otpReferenceKey,
        // externalRef = our txnRef so the provider's txn-status report can find it on recheck.
        externalRef: txnRef,
        endpointIp: req.ip ?? undefined,
      }),
  });

  if (outcome.provider) {
    await afterAepsProviderResult(userId, body.aadhaarNumber, outcome.provider);
    if (outcome.provider.success && outcome.provider.status === "success") {
      await recordCashReceipt({
        userId,
        txnId: outcome.txn.id,
        txnRef: outcome.txn.txnRef,
        amount: body.amount,
        customerMobile: body.mobile,
        bankIin: body.bankIin,
        latitude: body.latitude,
        longitude: body.longitude,
        notes: "Auto cash register entry on successful AePS withdrawal",
      });
    }
  }
  sendSuccess(res, { txn: outcome.txn, provider: outcome.provider });
}

export async function aepsDeposit(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof aepsDepositSchema>;
  const userId = actor(req).id;
  await assertAgentAuthFresh(userId);
  await assertAepsCompliance(
    userId,
    body.latitude && body.longitude ? { latitude: body.latitude, longitude: body.longitude } : null,
  );
  await assertFreshBiometric(body.biometricPayload);
  await assertTxnAuthorization(userId, { txnPin: body.txnPin, txnAuth: body.txnAuth });

  const outcome = await executeServiceTxn({
    actor: actor(req),
    serviceCode: "aeps_cash_deposit",
    amount: body.amount,
    idempotencyKey: body.idempotencyKey,
    operation: "aeps_deposit",
    // Retailer collects physical cash and their AEPS wallet funds the bank credit —
    // debit is held up-front and reversed if the provider fails.
    direction: "debit",
    walletType: "aeps",
    metadata: {
      bankIin: body.bankIin,
      customerMobile: body.mobile,
      latitude: body.latitude,
      longitude: body.longitude,
    },
    invoke: (routed, txnRef) =>
      routed.adapter.aepsDeposit({
        retailerUserId: userId,
        aadhaarNumber: body.aadhaarNumber,
        bankIin: body.bankIin,
        mobile: body.mobile,
        biometricPayload: body.biometricPayload,
        amount: body.amount,
        latitude: body.latitude,
        longitude: body.longitude,
        externalRef: txnRef,
        endpointIp: req.ip ?? undefined,
      }),
  });

  if (outcome.provider) {
    await afterAepsProviderResult(userId, body.aadhaarNumber, outcome.provider);
  }
  sendSuccess(res, { txn: outcome.txn, provider: outcome.provider });
}

export async function aadhaarPay(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof aadhaarPaySchema>;
  const userId = actor(req).id;
  await assertAgentAuthFresh(userId);
  await assertAepsCompliance(
    userId,
    body.latitude && body.longitude ? { latitude: body.latitude, longitude: body.longitude } : null,
  );
  await assertFreshBiometric(body.biometricPayload);
  await assertTxnAuthorization(userId, { txnPin: body.txnPin, txnAuth: body.txnAuth });

  const outcome = await executeServiceTxn({
    actor: actor(req),
    serviceCode: "aadhaar_pay",
    amount: body.amount,
    idempotencyKey: body.idempotencyKey,
    operation: "aadhaar_pay",
    direction: "credit",
    walletType: "aeps",
    metadata: {
      bankIin: body.bankIin,
      customerMobile: body.mobile,
      latitude: body.latitude,
      longitude: body.longitude,
    },
    invoke: (routed, txnRef) =>
      routed.adapter.aadhaarPay({
        retailerUserId: userId,
        aadhaarNumber: body.aadhaarNumber,
        bankIin: body.bankIin,
        mobile: body.mobile,
        biometricPayload: body.biometricPayload,
        amount: body.amount,
        latitude: body.latitude,
        longitude: body.longitude,
        externalRef: txnRef,
        endpointIp: req.ip ?? undefined,
      }),
  });
  if (outcome.provider) {
    await afterAepsProviderResult(userId, body.aadhaarNumber, outcome.provider);
  }
  sendSuccess(res, { txn: outcome.txn, provider: outcome.provider });
}

// ── History / receipt / recheck ─────────────────────────────────────────────
const historyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export async function history(req: Request, res: Response): Promise<void> {
  const { limit, offset } = historyQuerySchema.parse(req.query);
  sendSuccess(res, await listMyTransactions(actor(req), limit, offset));
}

export async function receipt(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await getReceipt(actor(req), req.params.txnRef as string));
}

export async function recheck(req: Request, res: Response): Promise<void> {
  const outcome = await recheckTxnStatus(actor(req), req.params.txnRef as string);
  sendSuccess(res, { txn: outcome.txn, provider: outcome.provider });
}
