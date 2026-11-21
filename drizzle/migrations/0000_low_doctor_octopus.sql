CREATE TABLE "audit_events" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"sequence_number" bigint NOT NULL,
	"user_id" uuid,
	"action" varchar(100) NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" uuid NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ip_address" "inet",
	"user_agent" text,
	"previous_hash" varchar(64) NOT NULL,
	"event_hash" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audit_events_business_id_sequence_number_pk" PRIMARY KEY("business_id","sequence_number")
);
--> statement-breakpoint
CREATE TABLE "business_users" (
	"business_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" varchar(20) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"invited_at" timestamp with time zone DEFAULT now() NOT NULL,
	"joined_at" timestamp with time zone,
	CONSTRAINT "business_users_business_id_user_id_pk" PRIMARY KEY("business_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "businesses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"industry" varchar(50) DEFAULT 'retail' NOT NULL,
	"base_currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"currency_exponent" smallint DEFAULT 2 NOT NULL,
	"timezone" varchar(50) DEFAULT 'UTC' NOT NULL,
	"subscription_tier" varchar(50) DEFAULT 'pilot_standard' NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "businesses_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "communication_handoffs" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"draft_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"channel" varchar(30) NOT NULL,
	"handoff_url" text NOT NULL,
	"initiated_by_user_id" uuid NOT NULL,
	"handoff_initiated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_confirmed_outcome" varchar(50) DEFAULT 'unconfirmed',
	"outcome_recorded_at" timestamp with time zone,
	CONSTRAINT "communication_handoffs_business_id_id_pk" PRIMARY KEY("business_id","id")
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"external_customer_id" varchar(100),
	"name" varchar(255) NOT NULL,
	"email" varchar(255),
	"phone" varchar(50),
	"tags" text[] DEFAULT '{}',
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_activity_at" timestamp with time zone DEFAULT now() NOT NULL,
	"total_spend_minor_units" bigint DEFAULT 0 NOT NULL,
	"total_orders" integer DEFAULT 0 NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_business_id_id_pk" PRIMARY KEY("business_id","id")
);
--> statement-breakpoint
CREATE TABLE "import_batches" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"uploaded_by_user_id" uuid NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_size_bytes" bigint NOT NULL,
	"storage_path" varchar(500) NOT NULL,
	"source_type" varchar(50) NOT NULL,
	"column_mapping" jsonb NOT NULL,
	"total_rows" integer DEFAULT 0 NOT NULL,
	"processed_rows" integer DEFAULT 0 NOT NULL,
	"successful_rows" integer DEFAULT 0 NOT NULL,
	"duplicate_rows" integer DEFAULT 0 NOT NULL,
	"failed_rows" integer DEFAULT 0 NOT NULL,
	"status" varchar(30) DEFAULT 'uploaded' NOT NULL,
	"error_summary" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"rollback_expires_at" timestamp with time zone NOT NULL,
	"rolled_back_at" timestamp with time zone,
	"rolled_back_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "import_batches_business_id_id_pk" PRIMARY KEY("business_id","id")
);
--> statement-breakpoint
CREATE TABLE "quotation_items" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"quotation_id" uuid NOT NULL,
	"sku" varchar(100),
	"description" varchar(500) NOT NULL,
	"quantity" numeric(12, 4) DEFAULT '1' NOT NULL,
	"unit_price_minor_units" bigint NOT NULL,
	"total_minor_units" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quotation_items_business_id_id_pk" PRIMARY KEY("business_id","id")
);
--> statement-breakpoint
CREATE TABLE "quotations" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"customer_id" uuid,
	"external_quote_id" varchar(100),
	"import_batch_id" uuid,
	"quote_number" varchar(100) NOT NULL,
	"issued_date" timestamp with time zone NOT NULL,
	"valid_until_date" timestamp with time zone NOT NULL,
	"sent_at" timestamp with time zone,
	"sent_channel" varchar(30),
	"amount_minor_units" bigint NOT NULL,
	"currency" varchar(3) NOT NULL,
	"currency_exponent" smallint DEFAULT 2 NOT NULL,
	"status" varchar(30) DEFAULT 'draft' NOT NULL,
	"probability_percentage" smallint DEFAULT 50,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quotations_business_id_id_pk" PRIMARY KEY("business_id","id")
);
--> statement-breakpoint
CREATE TABLE "recovery_campaigns" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"archetype" varchar(50) NOT NULL,
	"target_criteria" jsonb NOT NULL,
	"status" varchar(30) DEFAULT 'active' NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recovery_campaigns_business_id_id_pk" PRIMARY KEY("business_id","id")
);
--> statement-breakpoint
CREATE TABLE "recovery_drafts" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"campaign_id" uuid,
	"customer_id" uuid NOT NULL,
	"quotation_id" uuid,
	"suggested_channel" varchar(30) NOT NULL,
	"recipient_identifier" varchar(150) NOT NULL,
	"draft_subject" varchar(255),
	"draft_body" text NOT NULL,
	"ai_rationale" text NOT NULL,
	"ai_risk_score" smallint NOT NULL,
	"ai_prompt_version" varchar(50) NOT NULL,
	"status" varchar(30) DEFAULT 'pending_approval' NOT NULL,
	"approved_by_user_id" uuid,
	"approved_at" timestamp with time zone,
	"rejected_by_user_id" uuid,
	"rejected_at" timestamp with time zone,
	"rejection_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recovery_drafts_business_id_id_pk" PRIMARY KEY("business_id","id")
);
--> statement-breakpoint
CREATE TABLE "transaction_items" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"transaction_id" uuid NOT NULL,
	"sku" varchar(100),
	"description" varchar(500) NOT NULL,
	"quantity" numeric(12, 4) DEFAULT '1' NOT NULL,
	"unit_price_minor_units" bigint NOT NULL,
	"discount_minor_units" bigint DEFAULT 0 NOT NULL,
	"total_minor_units" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transaction_items_business_id_id_pk" PRIMARY KEY("business_id","id")
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"customer_id" uuid,
	"external_transaction_id" varchar(100),
	"import_batch_id" uuid,
	"transaction_date" timestamp with time zone NOT NULL,
	"gross_amount_minor_units" bigint NOT NULL,
	"discount_amount_minor_units" bigint DEFAULT 0 NOT NULL,
	"tax_amount_minor_units" bigint DEFAULT 0 NOT NULL,
	"net_amount_minor_units" bigint NOT NULL,
	"refunded_amount_minor_units" bigint DEFAULT 0 NOT NULL,
	"amount_minor_units" bigint NOT NULL,
	"currency" varchar(3) NOT NULL,
	"currency_exponent" smallint DEFAULT 2 NOT NULL,
	"status" varchar(30) DEFAULT 'completed' NOT NULL,
	"settlement_status" varchar(30) DEFAULT 'settled' NOT NULL,
	"payment_channel" varchar(50),
	"raw_payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transactions_business_id_id_pk" PRIMARY KEY("business_id","id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"full_name" varchar(150) NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_users" ADD CONSTRAINT "business_users_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_users" ADD CONSTRAINT "business_users_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_handoffs" ADD CONSTRAINT "communication_handoffs_initiated_by_user_id_users_id_fk" FOREIGN KEY ("initiated_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_handoffs" ADD CONSTRAINT "communication_handoffs_business_id_draft_id_recovery_drafts_business_id_id_fk" FOREIGN KEY ("business_id","draft_id") REFERENCES "public"."recovery_drafts"("business_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_rolled_back_by_user_id_users_id_fk" FOREIGN KEY ("rolled_back_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_business_id_quotation_id_quotations_business_id_id_fk" FOREIGN KEY ("business_id","quotation_id") REFERENCES "public"."quotations"("business_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_business_id_customer_id_customers_business_id_id_fk" FOREIGN KEY ("business_id","customer_id") REFERENCES "public"."customers"("business_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recovery_campaigns" ADD CONSTRAINT "recovery_campaigns_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recovery_campaigns" ADD CONSTRAINT "recovery_campaigns_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recovery_drafts" ADD CONSTRAINT "recovery_drafts_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recovery_drafts" ADD CONSTRAINT "recovery_drafts_approved_by_user_id_users_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recovery_drafts" ADD CONSTRAINT "recovery_drafts_rejected_by_user_id_users_id_fk" FOREIGN KEY ("rejected_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recovery_drafts" ADD CONSTRAINT "recovery_drafts_business_id_customer_id_customers_business_id_id_fk" FOREIGN KEY ("business_id","customer_id") REFERENCES "public"."customers"("business_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_items" ADD CONSTRAINT "transaction_items_business_id_transaction_id_transactions_business_id_id_fk" FOREIGN KEY ("business_id","transaction_id") REFERENCES "public"."transactions"("business_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_business_id_customer_id_customers_business_id_id_fk" FOREIGN KEY ("business_id","customer_id") REFERENCES "public"."customers"("business_id","id") ON DELETE restrict ON UPDATE no action;