-- Defense-in-depth: one ledger group per (reference_type, reference_id) when ref is present —
-- EXCEPT "commission", which legitimately fans out to one ledger group per beneficiary
-- (retailer's distributor, master_distributor, ...) all sharing the same reference_id (the
-- settled transaction). commission_ledger's own (transaction_id, beneficiary_user_id) unique
-- key is what prevents a duplicate payout there; this index must not collide with that fan-out.
CREATE UNIQUE INDEX IF NOT EXISTS "wallet_ledger_groups_ref_uidx"
  ON "wallet_ledger_groups" ("reference_type", "reference_id")
  WHERE "reference_id" IS NOT NULL AND "reference_type" <> 'commission';
