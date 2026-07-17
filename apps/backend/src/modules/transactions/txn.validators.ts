import { z } from "zod";

const amount = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, "Amount must be a positive number with up to 2 decimals");

const txnAuthFields = {
  idempotencyKey: z.string().min(8).max(100),
  txnPin: z.string().regex(/^\d{4,6}$/).optional(),
  txnAuth: z.string().min(20).optional(),
};

const requireTxnProof = (data: { txnPin?: string; txnAuth?: string }, ctx: z.RefinementCtx) => {
  if (!data.txnPin && !data.txnAuth) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Transaction PIN or txnAuth is required",
      path: ["txnAuth"],
    });
  }
};

export const rechargeSchema = z
  .object({
    ...txnAuthFields,
    serviceCode: z.string().min(2).max(60),
    operatorCode: z.string().min(1).max(60),
    accountRef: z.string().min(3).max(40),
    amount,
  })
  .superRefine(requireTxnProof);

export const bbpsFetchBillSchema = z.object({
  serviceCode: z.string().min(2).max(60),
  billerCode: z.string().min(1).max(80),
  customerParams: z.record(z.string(), z.string()).default({}),
});

export const bbpsPayBillSchema = z
  .object({
    ...txnAuthFields,
    serviceCode: z.string().min(2).max(60),
    billerCode: z.string().min(1).max(80),
    customerParams: z.record(z.string(), z.string()).default({}),
    billFetchRef: z.string().min(1).max(100),
    amount,
  })
  .superRefine(requireTxnProof);

export const dmtBeneficiarySchema = z.object({
  customerMobile: z.string().regex(/^\d{10}$/),
  name: z.string().min(2).max(120),
  accountNumber: z.string().min(6).max(24),
  ifsc: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/),
});

export const dmtTransferSchema = z
  .object({
    ...txnAuthFields,
    customerMobile: z.string().regex(/^\d{10}$/),
    beneficiaryId: z.string().min(1).max(100),
    amount,
    mode: z.enum(["imps", "neft"]).default("imps"),
  })
  .superRefine(requireTxnProof);

const aepsBase = {
  aadhaarNumber: z.string().regex(/^\d{12}$/),
  bankIin: z.string().min(3).max(11),
  mobile: z.string().regex(/^\d{10}$/),
  biometricPayload: z.string().min(1),
};

export const aepsEnquirySchema = z.object({ ...aepsBase });

export const aepsWithdrawSchema = z
  .object({
    ...txnAuthFields,
    ...aepsBase,
    amount,
  })
  .superRefine(requireTxnProof);

export const aadhaarPaySchema = z
  .object({
    ...txnAuthFields,
    ...aepsBase,
    amount,
  })
  .superRefine(requireTxnProof);
