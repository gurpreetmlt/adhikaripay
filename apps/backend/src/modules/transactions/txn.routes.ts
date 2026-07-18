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
  aepsBankList,
  aepsBalanceEnquiry,
  aepsMiniStatement,
  aepsWithdraw,
  aepsWithdrawOtp,
  aepsDeposit,
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
  aepsTxnOtpSchema,
  aepsWithdrawSchema,
  aepsDepositSchema,
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

txnRouter.get("/aeps/banks", retailerOnly, aepsBankList);
txnRouter.post("/aeps/balance-enquiry", retailerOnly, validateBody(aepsEnquirySchema), aepsBalanceEnquiry);
txnRouter.post("/aeps/mini-statement", retailerOnly, validateBody(aepsEnquirySchema), aepsMiniStatement);
txnRouter.post("/aeps/withdraw/otp", retailerOnly, walletTxnLimiter, validateBody(aepsTxnOtpSchema), aepsWithdrawOtp);
txnRouter.post("/aeps/withdraw", retailerOnly, walletTxnLimiter, validateBody(aepsWithdrawSchema), aepsWithdraw);
txnRouter.post("/aeps/deposit", retailerOnly, walletTxnLimiter, validateBody(aepsDepositSchema), aepsDeposit);
txnRouter.post("/aeps/aadhaar-pay", retailerOnly, walletTxnLimiter, validateBody(aadhaarPaySchema), aadhaarPay);

txnRouter.get("/", history);
txnRouter.get("/:txnRef", receipt);
// Rate-limited: settlement is idempotent (see finalizeTxn) but recheck still calls the provider,
// so throttle to blunt brute-force retry/race attempts against a single pending txn.
txnRouter.post("/:txnRef/recheck", walletTxnLimiter, recheck);
