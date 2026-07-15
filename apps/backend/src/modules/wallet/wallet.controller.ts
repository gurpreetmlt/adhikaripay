import type { Request, Response } from "express";
import { fundWalletSchema, transferWalletSchema, ledgerQuerySchema } from "./wallet.validators";
import { getWalletBalances, transferToChild, adminFundOwnWallet, getWalletLedger } from "./wallet.service";
import { verifyTxnPinOrThrow } from "../auth/txnPin";
import { sendSuccess } from "../../utils/apiResponse";
import { HttpError } from "../../utils/httpError";

function requireActor(req: Request) {
  if (!req.auth) throw new HttpError(401, "Authentication required", "UNAUTHENTICATED");
  return { id: req.auth.sub, role: req.auth.role };
}

export async function getMyWallets(req: Request, res: Response): Promise<void> {
  const actor = requireActor(req);
  const balances = await getWalletBalances(actor.id);
  sendSuccess(res, balances);
}

export async function fund(req: Request, res: Response): Promise<void> {
  const actor = requireActor(req);
  const input = fundWalletSchema.parse(req.body);
  const result = await adminFundOwnWallet(actor, input.amount, input.description);
  sendSuccess(res, result, "Wallet funded successfully");
}

export async function transfer(req: Request, res: Response): Promise<void> {
  const actor = requireActor(req);
  const input = transferWalletSchema.parse(req.body);
  await verifyTxnPinOrThrow(actor.id, input.txnPin);
  const result = await transferToChild(actor, input.targetUserId, input.walletType, input.amount, input.description);
  sendSuccess(res, result, "Transfer completed successfully");
}

export async function ledger(req: Request, res: Response): Promise<void> {
  const actor = requireActor(req);
  const { limit, offset } = ledgerQuerySchema.parse(req.query);
  const entries = await getWalletLedger(actor.id, { limit, offset });
  sendSuccess(res, entries);
}
