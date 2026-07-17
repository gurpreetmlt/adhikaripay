-- PIN lockout counters
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "txn_pin_failed_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "txn_pin_locked_until" timestamp with time zone;--> statement-breakpoint

-- Scope idempotency keys per user (was global unique)
ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "transactions_idempotency_key_unique";--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "transactions_user_idempotency_uidx" ON "transactions" ("user_id","idempotency_key");--> statement-breakpoint

-- Wallet fund/transfer idempotency
CREATE TABLE IF NOT EXISTS "wallet_idempotency" (
	"user_id" uuid NOT NULL,
	"idempotency_key" varchar(100) NOT NULL,
	"ledger_group_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wallet_idempotency_pkey" PRIMARY KEY("user_id","idempotency_key")
);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wallet_idempotency" ADD CONSTRAINT "wallet_idempotency_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
