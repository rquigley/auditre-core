CREATE TABLE "account_balance_override" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v7() PRIMARY KEY,
  "account_mapping_id" uuid NOT NULL REFERENCES "account_mapping" ("id"),
  "parent_account_mapping_id" uuid REFERENCES "account_mapping" ("id"),
  "year" text NOT NULL,
  "debit" numeric(14,2),
  "credit" numeric(14,2),
  "comment" text,
  "actor_user_id" uuid REFERENCES "auth"."user" ("id"),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  UNIQUE (account_mapping_id, parent_account_mapping_id, year)
);

ALTER TABLE "account_mapping"
  ADD COLUMN "is_adjustment_account" boolean DEFAULT false;
