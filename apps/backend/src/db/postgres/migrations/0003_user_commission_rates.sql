CREATE TABLE "user_commission_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"rule_type" "commission_rule_type" NOT NULL,
	"value" numeric(10, 4) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_commission_rates" ADD CONSTRAINT "user_commission_rates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "user_commission_rates" ADD CONSTRAINT "user_commission_rates_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "user_commission_rates_user_service_key" ON "user_commission_rates" USING btree ("user_id","service_id");
--> statement-breakpoint
CREATE INDEX "user_commission_rates_user_idx" ON "user_commission_rates" USING btree ("user_id");
