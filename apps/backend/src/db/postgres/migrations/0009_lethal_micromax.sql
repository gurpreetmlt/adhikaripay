CREATE UNIQUE INDEX "commission_ledger_txn_beneficiary_key" ON "commission_ledger" USING btree ("transaction_id","beneficiary_user_id");
