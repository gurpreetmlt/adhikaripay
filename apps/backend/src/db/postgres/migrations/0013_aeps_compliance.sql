ALTER TABLE "users" ADD COLUMN "instantpay_outlet_id" varchar(64);
ALTER TABLE "users" ADD COLUMN "outlet_latitude" varchar(32);
ALTER TABLE "users" ADD COLUMN "outlet_longitude" varchar(32);
ALTER TABLE "users" ADD COLUMN "last_aeps_txn_at" timestamp with time zone;
ALTER TABLE "users" ADD COLUMN "aeps_edd_required" boolean DEFAULT false NOT NULL;
ALTER TABLE "users" ADD COLUMN "aeps_block_reason" varchar(120);

CREATE TABLE IF NOT EXISTS "aeps_bio_mismatch_counters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"aadhaar_hash" varchar(64) NOT NULL,
	"consecutive_mismatches" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "aeps_cash_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"txn_id" uuid,
	"txn_ref" varchar(40),
	"amount" numeric(14, 2) NOT NULL,
	"customer_mobile_masked" varchar(15),
	"bank_iin" varchar(11),
	"notes" text,
	"latitude" varchar(32),
	"longitude" varchar(32),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "aeps_bio_mismatch_counters" ADD CONSTRAINT "aeps_bio_mismatch_counters_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "aeps_cash_receipts" ADD CONSTRAINT "aeps_cash_receipts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "aeps_cash_receipts" ADD CONSTRAINT "aeps_cash_receipts_txn_id_transactions_id_fk" FOREIGN KEY ("txn_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "aeps_bio_mismatch_user_aadhaar_idx" ON "aeps_bio_mismatch_counters" USING btree ("user_id","aadhaar_hash");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "aeps_cash_receipts_user_idx" ON "aeps_cash_receipts" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "aeps_cash_receipts_txn_idx" ON "aeps_cash_receipts" USING btree ("txn_id");

-- InstantPay provider row + AEPS service mappings (idempotent).
INSERT INTO "providers" ("code", "name", "is_active")
SELECT 'instantpay', 'InstantPay', true
WHERE NOT EXISTS (SELECT 1 FROM "providers" WHERE "code" = 'instantpay');
