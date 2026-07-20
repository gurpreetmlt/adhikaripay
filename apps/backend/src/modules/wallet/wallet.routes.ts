import { Router } from "express";
import { getMyWallets, fund, transfer, ledger, pullRequest, pullConfirm } from "./wallet.controller";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/rbac.middleware";
import { walletTxnLimiter, otpRequestLimiter } from "../../middleware/rateLimiter";

export const walletRouter = Router();

walletRouter.use(requireAuth);

walletRouter.get("/me", getMyWallets);
walletRouter.get("/ledger", ledger);
walletRouter.post("/fund", requireRole("admin"), walletTxnLimiter, fund);
// Admin mints float via POST /fund only — hierarchy transfers are SD→D and D→R.
walletRouter.post("/transfer", requireRole("master_distributor", "distributor"), walletTxnLimiter, transfer);
walletRouter.post(
  "/pull/request",
  requireRole("master_distributor", "distributor"),
  otpRequestLimiter,
  pullRequest,
);
walletRouter.post(
  "/pull/confirm",
  requireRole("master_distributor", "distributor"),
  walletTxnLimiter,
  pullConfirm,
);
