import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/rbac.middleware";
import { validateBody } from "../../middleware/validate";
import {
  recharge,
  bbpsFetchBill,
  bbpsPayBill,
  dmtAddBeneficiary,
  dmtTransfer,
  aepsBalanceEnquiry,
  aepsMiniStatement,
  aepsWithdraw,
  aadhaarPay,
  history,
  receipt,
  recheck,
} from "./txn.controller";
import {
  rechargeSchema,
  bbpsFetchBillSchema,
  bbpsPayBillSchema,
  dmtBeneficiarySchema,
  dmtTransferSchema,
  aepsEnquirySchema,
  aepsWithdrawSchema,
  aadhaarPaySchema,
} from "./txn.validators";
import { walletTxnLimiter } from "../../middleware/rateLimiter";

export const txnRouter = Router();

txnRouter.use(requireAuth);

// Counter services are retailer-only; history/receipt/recheck also serve admin support tooling.
const retailerOnly = requireRole("retailer");

txnRouter.post("/recharge", retailerOnly, walletTxnLimiter, validateBody(rechargeSchema), recharge);

txnRouter.post("/bbps/fetch-bill", retailerOnly, validateBody(bbpsFetchBillSchema), bbpsFetchBill);
txnRouter.post("/bbps/pay", retailerOnly, walletTxnLimiter, validateBody(bbpsPayBillSchema), bbpsPayBill);

txnRouter.post("/dmt/beneficiary", retailerOnly, validateBody(dmtBeneficiarySchema), dmtAddBeneficiary);
txnRouter.post("/dmt/transfer", retailerOnly, walletTxnLimiter, validateBody(dmtTransferSchema), dmtTransfer);

txnRouter.post("/aeps/balance-enquiry", retailerOnly, validateBody(aepsEnquirySchema), aepsBalanceEnquiry);
txnRouter.post("/aeps/mini-statement", retailerOnly, validateBody(aepsEnquirySchema), aepsMiniStatement);
txnRouter.post("/aeps/withdraw", retailerOnly, walletTxnLimiter, validateBody(aepsWithdrawSchema), aepsWithdraw);
txnRouter.post("/aeps/aadhaar-pay", retailerOnly, walletTxnLimiter, validateBody(aadhaarPaySchema), aadhaarPay);

txnRouter.get("/", history);
txnRouter.get("/:txnRef", receipt);
txnRouter.post("/:txnRef/recheck", recheck);
