CREATE TABLE "biometric_replay_guard" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payload_hash" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "biometric_replay_guard_payload_hash_unique" UNIQUE("payload_hash")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_agent_auth_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "biometric_replay_guard_created_idx" ON "biometric_replay_guard" USING btree ("created_at");
