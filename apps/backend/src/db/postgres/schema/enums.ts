import { pgEnum } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "master_distributor",
  "distributor",
  "retailer",
]);

export const kycStatusEnum = pgEnum("kyc_status", ["pending", "verified", "rejected"]);

export const walletTypeEnum = pgEnum("wallet_type", ["main", "aeps"]);

export const ledgerEntryTypeEnum = pgEnum("ledger_entry_type", ["debit", "credit"]);

export const transactionStatusEnum = pgEnum("transaction_status", [
  "initiated",
  "pending",
  "success",
  "failed",
  "reversed",
  "refunded",
]);

export const commissionRuleTypeEnum = pgEnum("commission_rule_type", ["flat", "percentage"]);
