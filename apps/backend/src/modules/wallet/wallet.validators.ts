import { z } from "zod";
import { WALLET_TYPES } from "@adhikaripay/shared-types";

const amountSchema = z
  .string()
  .regex(/^\d{1,12}(\.\d{1,2})?$/, "Amount must be a positive number with at most 2 decimals")
  .refine((v) => parseFloat(v) > 0, "Amount must be greater than zero");

export const fundWalletSchema = z.object({
  amount: amountSchema,
  description: z.string().trim().max(255).optional(),
});
export type FundWalletInput = z.infer<typeof fundWalletSchema>;

export const transferWalletSchema = z.object({
  targetUserId: z.string().uuid(),
  walletType: z.enum(WALLET_TYPES).default("main"),
  amount: amountSchema,
  description: z.string().trim().max(255).optional(),
  txnPin: z.string().regex(/^\d{4,6}$/, "PIN must be 4-6 digits"),
});
export type TransferWalletInput = z.infer<typeof transferWalletSchema>;

export const ledgerQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
export type LedgerQueryInput = z.infer<typeof ledgerQuerySchema>;
