import { Router } from "express";
import { getMyWallets, fund, transfer, ledger } from "./wallet.controller";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/rbac.middleware";
import { walletTxnLimiter } from "../../middleware/rateLimiter";

export const walletRouter = Router();

walletRouter.use(requireAuth);

walletRouter.get("/me", getMyWallets);
walletRouter.get("/ledger", ledger);
walletRouter.post("/fund", requireRole("admin"), walletTxnLimiter, fund);
walletRouter.post("/transfer", requireRole("admin", "master_distributor", "distributor"), walletTxnLimiter, transfer);
