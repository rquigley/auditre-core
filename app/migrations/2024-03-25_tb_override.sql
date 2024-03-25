CREATE TABLE "account_balance_override" (
  "id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "account_mapping_id" uuid NOT NULL REFERENCES "account_mapping" ("id"),
  "year" text NOT NULL,
  "debit" numeric(14,2),
  "credit" numeric(14,2),
  "comment" text,
  "actor_user_id" uuid REFERENCES "auth"."user" ("id"),
  "created_at" timestamptz DEFAULT now() NOT NULL
);