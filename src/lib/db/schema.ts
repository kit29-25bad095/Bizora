import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  varchar,
  smallint,
  text,
  bigint,
  integer,
  boolean,
  timestamp,
  numeric,
  jsonb,
  inet,
  primaryKey,
  foreignKey,
  index,
} from "drizzle-orm/pg-core";

// ==============================================================================
// 1. IDENTITY & TENANCY DOMAIN
// ==============================================================================

export const businesses = pgTable("businesses", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  industry: varchar("industry", { length: 50 }).notNull().default("retail"),
  baseCurrency: varchar("base_currency", { length: 3 }).notNull().default("USD"),
  currencyExponent: smallint("currency_exponent").notNull().default(2),
  timezone: varchar("timezone", { length: 50 }).notNull().default("UTC"),
  subscriptionTier: varchar("subscription_tier", { length: 50 }).notNull().default("pilot_standard"),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  fullName: varchar("full_name", { length: 150 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const businessUsers = pgTable(
  "business_users",
  {
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 20 }).notNull(), // 'owner' | 'manager' | 'analyst'
    isActive: boolean("is_active").notNull().default(true),
    invitedAt: timestamp("invited_at", { withTimezone: true }).notNull().defaultNow(),
    joinedAt: timestamp("joined_at", { withTimezone: true }),
  },
  (table) => [primaryKey({ columns: [table.businessId, table.userId] })]
);

// ==============================================================================
// 2. CORE BUSINESS DOMAIN
// ==============================================================================

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").defaultRandom().notNull(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    externalCustomerId: varchar("external_customer_id", { length: 100 }),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 50 }),
    tags: text("tags").array().default([]),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true }).notNull().defaultNow(),
    totalSpendMinorUnits: bigint("total_spend_minor_units", { mode: "bigint" }).notNull().default(sql`0`),
    totalOrders: integer("total_orders").notNull().default(0),
    status: varchar("status", { length: 20 }).notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.businessId, table.id] }),
    index("idx_customers_biz_status").on(table.businessId, table.status),
    index("idx_customers_biz_activity").on(table.businessId, table.lastActivityAt),
  ]
);

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").defaultRandom().notNull(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id"),
    externalTransactionId: varchar("external_transaction_id", { length: 100 }),
    importBatchId: uuid("import_batch_id"),
    transactionDate: timestamp("transaction_date", { withTimezone: true }).notNull(),
    grossAmountMinorUnits: bigint("gross_amount_minor_units", { mode: "bigint" }).notNull(),
    discountAmountMinorUnits: bigint("discount_amount_minor_units", { mode: "bigint" }).notNull().default(sql`0`),
    taxAmountMinorUnits: bigint("tax_amount_minor_units", { mode: "bigint" }).notNull().default(sql`0`),
    netAmountMinorUnits: bigint("net_amount_minor_units", { mode: "bigint" }).notNull(),
    refundedAmountMinorUnits: bigint("refunded_amount_minor_units", { mode: "bigint" }).notNull().default(sql`0`),
    amountMinorUnits: bigint("amount_minor_units", { mode: "bigint" }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    currencyExponent: smallint("currency_exponent").notNull().default(2),
    status: varchar("status", { length: 30 }).notNull().default("completed"),
    settlementStatus: varchar("settlement_status", { length: 30 }).notNull().default("settled"),
    paymentChannel: varchar("payment_channel", { length: 50 }),
    rawPayload: jsonb("raw_payload"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.businessId, table.id] }),
    foreignKey({
      columns: [table.businessId, table.customerId],
      foreignColumns: [customers.businessId, customers.id],
    }).onDelete("restrict"),
    index("idx_transactions_biz_date").on(table.businessId, table.transactionDate),
    index("idx_transactions_biz_status").on(table.businessId, table.status),
    index("idx_transactions_biz_customer").on(table.businessId, table.customerId),
  ]
);

export const transactionItems = pgTable(
  "transaction_items",
  {
    id: uuid("id").defaultRandom().notNull(),
    businessId: uuid("business_id").notNull(),
    transactionId: uuid("transaction_id").notNull(),
    sku: varchar("sku", { length: 100 }),
    description: varchar("description", { length: 500 }).notNull(),
    quantity: numeric("quantity", { precision: 12, scale: 4 }).notNull().default("1"),
    unitPriceMinorUnits: bigint("unit_price_minor_units", { mode: "bigint" }).notNull(),
    discountMinorUnits: bigint("discount_minor_units", { mode: "bigint" }).notNull().default(sql`0`),
    totalMinorUnits: bigint("total_minor_units", { mode: "bigint" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.businessId, table.id] }),
    foreignKey({
      columns: [table.businessId, table.transactionId],
      foreignColumns: [transactions.businessId, transactions.id],
    }).onDelete("cascade"),
  ]
);

export const quotations = pgTable(
  "quotations",
  {
    id: uuid("id").defaultRandom().notNull(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id"),
    externalQuoteId: varchar("external_quote_id", { length: 100 }),
    importBatchId: uuid("import_batch_id"),
    quoteNumber: varchar("quote_number", { length: 100 }).notNull(),
    issuedDate: timestamp("issued_date", { withTimezone: true }).notNull(),
    validUntilDate: timestamp("valid_until_date", { withTimezone: true }).notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    sentChannel: varchar("sent_channel", { length: 30 }),
    amountMinorUnits: bigint("amount_minor_units", { mode: "bigint" }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    currencyExponent: smallint("currency_exponent").notNull().default(2),
    status: varchar("status", { length: 30 }).notNull().default("draft"),
    probabilityPercentage: smallint("probability_percentage").default(50),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.businessId, table.id] }),
    foreignKey({
      columns: [table.businessId, table.customerId],
      foreignColumns: [customers.businessId, customers.id],
    }).onDelete("restrict"),
    index("idx_quotations_biz_status_valid").on(table.businessId, table.status, table.validUntilDate),
  ]
);

export const quotationItems = pgTable(
  "quotation_items",
  {
    id: uuid("id").defaultRandom().notNull(),
    businessId: uuid("business_id").notNull(),
    quotationId: uuid("quotation_id").notNull(),
    sku: varchar("sku", { length: 100 }),
    description: varchar("description", { length: 500 }).notNull(),
    quantity: numeric("quantity", { precision: 12, scale: 4 }).notNull().default("1"),
    unitPriceMinorUnits: bigint("unit_price_minor_units", { mode: "bigint" }).notNull(),
    totalMinorUnits: bigint("total_minor_units", { mode: "bigint" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.businessId, table.id] }),
    foreignKey({
      columns: [table.businessId, table.quotationId],
      foreignColumns: [quotations.businessId, quotations.id],
    }).onDelete("cascade"),
  ]
);

// ==============================================================================
// 3. INGESTION & IMPORT DOMAIN
// ==============================================================================

export const importBatches = pgTable(
  "import_batches",
  {
    id: uuid("id").defaultRandom().notNull(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    uploadedByUserId: uuid("uploaded_by_user_id")
      .notNull()
      .references(() => users.id),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    fileSizeBytes: bigint("file_size_bytes", { mode: "bigint" }).notNull(),
    storagePath: varchar("storage_path", { length: 500 }).notNull(),
    sourceType: varchar("source_type", { length: 50 }).notNull(),
    columnMapping: jsonb("column_mapping").notNull(),
    totalRows: integer("total_rows").notNull().default(0),
    processedRows: integer("processed_rows").notNull().default(0),
    successfulRows: integer("successful_rows").notNull().default(0),
    duplicateRows: integer("duplicate_rows").notNull().default(0),
    failedRows: integer("failed_rows").notNull().default(0),
    status: varchar("status", { length: 30 }).notNull().default("uploaded"),
    errorSummary: text("error_summary"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    rollbackExpiresAt: timestamp("rollback_expires_at", { withTimezone: true }).notNull(),
    rolledBackAt: timestamp("rolled_back_at", { withTimezone: true }),
    rolledBackByUserId: uuid("rolled_back_by_user_id").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.businessId, table.id] })]
);

// ==============================================================================
// 4. RECOVERY & HUMAN-IN-THE-LOOP DISPATCH DOMAIN
// ==============================================================================

export const recoveryCampaigns = pgTable(
  "recovery_campaigns",
  {
    id: uuid("id").defaultRandom().notNull(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    archetype: varchar("archetype", { length: 50 }).notNull(),
    targetCriteria: jsonb("target_criteria").notNull(),
    status: varchar("status", { length: 30 }).notNull().default("active"),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.businessId, table.id] })]
);

export const recoveryDrafts = pgTable(
  "recovery_drafts",
  {
    id: uuid("id").defaultRandom().notNull(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    campaignId: uuid("campaign_id"),
    customerId: uuid("customer_id").notNull(),
    quotationId: uuid("quotation_id"),
    suggestedChannel: varchar("suggested_channel", { length: 30 }).notNull(), // 'whatsapp' | 'email'
    recipientIdentifier: varchar("recipient_identifier", { length: 150 }).notNull(),
    draftSubject: varchar("draft_subject", { length: 255 }),
    draftBody: text("draft_body").notNull(),
    aiRationale: text("ai_rationale").notNull(),
    aiRiskScore: smallint("ai_risk_score").notNull(), // 1 to 100
    aiPromptVersion: varchar("ai_prompt_version", { length: 50 }).notNull(),
    status: varchar("status", { length: 30 }).notNull().default("pending_approval"), // 'pending_approval' | 'approved' | 'rejected' | 'expired'
    approvedByUserId: uuid("approved_by_user_id").references(() => users.id),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    rejectedByUserId: uuid("rejected_by_user_id").references(() => users.id),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    rejectionReason: text("rejection_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.businessId, table.id] }),
    foreignKey({
      columns: [table.businessId, table.customerId],
      foreignColumns: [customers.businessId, customers.id],
    }).onDelete("cascade"),
    index("idx_recovery_drafts_biz_status").on(table.businessId, table.status),
  ]
);

export const communicationHandoffs = pgTable(
  "communication_handoffs",
  {
    id: uuid("id").defaultRandom().notNull(),
    businessId: uuid("business_id").notNull(),
    draftId: uuid("draft_id").notNull(),
    customerId: uuid("customer_id").notNull(),
    channel: varchar("channel", { length: 30 }).notNull(), // 'whatsapp' | 'email'
    handoffUrl: text("handoff_url").notNull(),
    initiatedByUserId: uuid("initiated_by_user_id")
      .notNull()
      .references(() => users.id),
    handoffInitiatedAt: timestamp("handoff_initiated_at", { withTimezone: true }).notNull().defaultNow(),
    userConfirmedOutcome: varchar("user_confirmed_outcome", { length: 50 }).default("unconfirmed"),
    outcomeRecordedAt: timestamp("outcome_recorded_at", { withTimezone: true }),
  },
  (table) => [
    primaryKey({ columns: [table.businessId, table.id] }),
    foreignKey({
      columns: [table.businessId, table.draftId],
      foreignColumns: [recoveryDrafts.businessId, recoveryDrafts.id],
    }).onDelete("cascade"),
  ]
);

// ==============================================================================
// 5. AUDIT & AI OBSERVABILITY DOMAIN
// ==============================================================================

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").defaultRandom().notNull(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "restrict" }),
    sequenceNumber: bigint("sequence_number", { mode: "bigint" }).notNull(),
    userId: uuid("user_id").references(() => users.id),
    action: varchar("action", { length: 100 }).notNull(),
    entityType: varchar("entity_type", { length: 50 }).notNull(),
    entityId: uuid("entity_id").notNull(),
    metadata: jsonb("metadata").notNull().default({}),
    ipAddress: inet("ip_address"),
    userAgent: text("user_agent"),
    previousHash: varchar("previous_hash", { length: 64 }).notNull(),
    eventHash: varchar("event_hash", { length: 64 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.businessId, table.sequenceNumber] }),
    index("idx_audit_events_biz_created").on(table.businessId, table.createdAt),
  ]
);
