import type { Request, Response } from "express";
import { executeServiceTxn, recheckTxnStatus, listMyTransactions, getReceipt } from "./txn.service";
import { verifyTxnPinOrThrow } from "../auth/txnPin";
import { resolveProvidersForService, callProvider } from "../providers/provider.router";
import { sendSuccess } from "../../utils/apiResponse";
import type {
  rechargeSchema,
  bbpsFetchBillSchema,
  bbpsPayBillSchema,
  dmtBeneficiarySchema,
  dmtTransferSchema,
  aepsEnquirySchema,
  aepsWithdrawSchema,
  aadhaarPaySchema,
} from "./txn.validators";
import { z } from "zod";

function actor(req: Request) {
  return { id: req.auth!.sub, role: req.auth!.role };
}

// ── Recharge ────────────────────────────────────────────────────────────────
export async function recharge(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof rechargeSchema>;
  await verifyTxnPinOrThrow(actor(req).id, body.txnPin);

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
  await verifyTxnPinOrThrow(actor(req).id, body.txnPin);

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
  await verifyTxnPinOrThrow(actor(req).id, body.txnPin);

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
export async function aepsBalanceEnquiry(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof aepsEnquirySchema>;
  const routedProviders = await resolveProvidersForService("aeps_balance_enquiry");
  const result = await callProvider(
    routedProviders[0]!,
    "aeps_balance_enquiry",
    null,
    { bankIin: body.bankIin, biometricPayload: body.biometricPayload },
    (adapter) => adapter.aepsBalanceEnquiry({ retailerUserId: actor(req).id, ...body }),
  );
  sendSuccess(res, result);
}

export async function aepsMiniStatement(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof aepsEnquirySchema>;
  const routedProviders = await resolveProvidersForService("aeps_mini_statement");
  const result = await callProvider(
    routedProviders[0]!,
    "aeps_mini_statement",
    null,
    { bankIin: body.bankIin, biometricPayload: body.biometricPayload },
    (adapter) => adapter.aepsMiniStatement({ retailerUserId: actor(req).id, ...body }),
  );
  sendSuccess(res, result);
}

export async function aepsWithdraw(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof aepsWithdrawSchema>;

  const outcome = await executeServiceTxn({
    actor: actor(req),
    serviceCode: "aeps_cash_withdrawal",
    amount: body.amount,
    idempotencyKey: body.idempotencyKey,
    operation: "aeps_withdraw",
    direction: "credit", // retailer paid out cash; reimbursed into AEPS wallet on success
    walletType: "aeps",
    metadata: { bankIin: body.bankIin, customerMobile: body.mobile },
    invoke: (routed) =>
      routed.adapter.aepsWithdraw({
        retailerUserId: actor(req).id,
        aadhaarNumber: body.aadhaarNumber,
        bankIin: body.bankIin,
        mobile: body.mobile,
        biometricPayload: body.biometricPayload,
        amount: body.amount,
      }),
  });
  sendSuccess(res, { txn: outcome.txn, provider: outcome.provider });
}

export async function aadhaarPay(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof aadhaarPaySchema>;
  await verifyTxnPinOrThrow(actor(req).id, body.txnPin);

  const outcome = await executeServiceTxn({
    actor: actor(req),
    serviceCode: "aadhaar_pay",
    amount: body.amount,
    idempotencyKey: body.idempotencyKey,
    operation: "aadhaar_pay",
    direction: "credit",
    walletType: "aeps",
    metadata: { bankIin: body.bankIin, customerMobile: body.mobile },
    invoke: (routed) =>
      routed.adapter.aadhaarPay({
        retailerUserId: actor(req).id,
        aadhaarNumber: body.aadhaarNumber,
        bankIin: body.bankIin,
        mobile: body.mobile,
        biometricPayload: body.biometricPayload,
        amount: body.amount,
      }),
  });
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
