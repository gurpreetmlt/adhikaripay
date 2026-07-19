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
  beneficiaryMobile: z
    .string()
    .regex(/^\d{10}$/)
    .optional(),
  bankId: z.string().min(1).max(20).optional(),
});

export const dmtRemitterProfileSchema = z.object({
  customerMobile: z.string().regex(/^\d{10}$/),
});

export const dmtBeneficiaryVerifySchema = z.object({
  customerMobile: z.string().regex(/^\d{10}$/),
  otp: z.string().regex(/^\d{4,8}$/),
  beneficiaryId: z.string().min(1).max(128),
  referenceKey: z.string().min(8).max(512),
});

export const dmtBeneficiaryDeleteSchema = z.object({
  customerMobile: z.string().regex(/^\d{10}$/),
  beneficiaryId: z.string().min(1).max(128),
});

export const dmtRemitterRegisterSchema = z.object({
  customerMobile: z.string().regex(/^\d{10}$/),
  aadhaarNumber: z.string().regex(/^\d{12}$/),
  referenceKey: z.string().min(8).max(512),
});

export const dmtRemitterRegisterVerifySchema = z.object({
  customerMobile: z.string().regex(/^\d{10}$/),
  otp: z.string().regex(/^\d{4,8}$/),
  referenceKey: z.string().min(8).max(512),
});

export const dmtRemitterKycSchema = z.object({
  customerMobile: z.string().regex(/^\d{10}$/),
  referenceKey: z.string().min(8).max(512),
  biometricPayload: z.string().min(1),
  captureType: z.enum(["FINGER", "FACE"]).optional(),
  latitude: z.string().min(1).max(32).optional(),
  longitude: z.string().min(1).max(32).optional(),
});

export const dmtTransactionOtpSchema = z.object({
  customerMobile: z.string().regex(/^\d{10}$/),
  amount,
  referenceKey: z.string().min(8).max(512),
});

export const dmtRefundOtpSchema = z.object({
  /** InstantPay orderid (providerTxnId on our txn) of the pending remittance. */
  ipayId: z.string().min(6).max(64),
});

export const dmtRefundSchema = z.object({
  ipayId: z.string().min(6).max(64),
  /** referenceKey from the refund OTP response. */
  referenceKey: z.string().min(8).max(512),
  otp: z.string().regex(/^\d{4,8}$/),
});

export const dmtTransferSchema = z
  .object({
    ...txnAuthFields,
    customerMobile: z.string().regex(/^\d{10}$/),
    accountNumber: z.string().min(6).max(24),
    ifsc: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/),
    amount,
    mode: z.enum(["imps", "neft"]).default("imps"),
    otp: z.string().regex(/^\d{4,8}$/),
    referenceKey: z.string().min(8).max(512),
    beneficiaryId: z.string().min(1).max(128).optional(),
    latitude: z.string().min(1).max(32).optional(),
    longitude: z.string().min(1).max(32).optional(),
  })
  .superRefine(requireTxnProof);

const aepsBase = {
  aadhaarNumber: z.string().regex(/^\d{12}$/),
  bankIin: z.string().min(3).max(11),
  mobile: z.string().regex(/^\d{10}$/),
  biometricPayload: z.string().min(1),
  latitude: z.string().min(1).max(32).optional(),
  longitude: z.string().min(1).max(32).optional(),
};

export const aepsEnquirySchema = z.object({ ...aepsBase });

// No biometric at this step — OTP goes to the customer's mobile; the eventual
// withdrawal carries the OTP inside the PID capture plus this referenceKey.
export const aepsTxnOtpSchema = z.object({
  aadhaarNumber: z.string().regex(/^\d{12}$/),
  bankIin: z.string().min(3).max(11),
  mobile: z.string().regex(/^\d{10}$/),
  amount,
  latitude: z.string().min(1).max(32).optional(),
  longitude: z.string().min(1).max(32).optional(),
});

export const aepsWithdrawSchema = z
  .object({
    ...txnAuthFields,
    ...aepsBase,
    amount,
    /** From /aeps/withdraw/otp — required by InstantPay for amounts above ₹5,000. */
    otpReferenceKey: z.string().min(1).max(200).optional(),
  })
  .superRefine(requireTxnProof);

export const aepsDepositSchema = z
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
