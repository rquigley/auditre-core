ALTER TABLE "account_balance"
    ADD COLUMN "account_type" text,
    ADD COLUMN "account_type_override" text,
    ADD COLUMN "sort_idx" integer,
    ADD COLUMN "classification_score" numeric(3,2),
    ADD COLUMN "reasoning" text;

-- TODO Follow-up: drop account_mapping