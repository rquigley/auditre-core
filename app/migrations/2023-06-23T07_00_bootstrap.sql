CREATE EXTENSION pg_stat_statements;

CREATE OR REPLACE FUNCTION update_modified_at()
RETURNS TRIGGER AS $$
BEGIN
    -- if UPDATE is trying to set "updated_at", don't override it
    IF NEW.updated_at = OLD.updated_at THEN
      NEW.updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

create or replace function uuid_generate_v7()
returns uuid
as $$
begin
  -- use random v4 uuid as starting point (which has the same variant we need)
  -- then overlay timestamp
  -- then set version 7 by flipping the 2 and 1 bit in the version 4 string
  return encode(
    set_bit(
      set_bit(
        overlay(uuid_send(gen_random_uuid())
                placing substring(int8send(floor(extract(epoch from clock_timestamp()) * 1000)::bigint) from 3)
                from 1 for 6
        ),
        52, 1
      ),
      53, 1
    ),
    'hex')::uuid;
end
$$
language plpgsql
volatile;

CREATE TABLE "org" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v7() PRIMARY KEY,
  "name" text,
  "parent_org_id" uuid REFERENCES "org" ("id"),
  "can_have_child_orgs" boolean DEFAULT FALSE,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "is_deleted" boolean DEFAULT FALSE
);
CREATE TRIGGER update_modified_at_trigger BEFORE UPDATE ON "org" FOR EACH ROW EXECUTE PROCEDURE update_modified_at();

--
-- Begin auth schema
--
CREATE SCHEMA "auth";

CREATE TABLE "auth"."user" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v7() PRIMARY KEY,
  "name" text,
  "email" text UNIQUE,
  "email_verified" text,
  "image" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "is_deleted" boolean NOT NULL DEFAULT FALSE
);
CREATE TRIGGER update_modified_at_trigger BEFORE UPDATE ON "auth"."user" FOR EACH ROW EXECUTE PROCEDURE update_modified_at();

CREATE TABLE "auth"."user_role" (
  "user_id" uuid NOT NULL REFERENCES "auth"."user" ("id"),
  "org_id" uuid NOT NULL REFERENCES "org" ("id"),
  "role" text NOT NULL,
  PRIMARY KEY ("user_id", "org_id", "role")
);

CREATE TABLE "auth"."invitation" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v7() PRIMARY KEY,
  "org_id" uuid NOT NULL REFERENCES "org" ("id"),
  "email" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "expires_at" timestamptz DEFAULT (now() + INTERVAL '7 days') NOT NULL,
  "is_used" boolean NOT NULL DEFAULT FALSE
);
ALTER TABLE "auth"."invitation" ADD CONSTRAINT constraint_unique_invite UNIQUE (org_id, email);
CREATE TRIGGER update_modified_at_trigger BEFORE UPDATE ON "auth"."invitation" FOR EACH ROW EXECUTE PROCEDURE update_modified_at();

CREATE TABLE "auth"."user_account" (
  "id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "user_id" uuid NOT NULL REFERENCES "auth"."user" ("id"),
  "type" text NOT NULL,
  "provider" text NOT NULL,
  "provider_account_id" text NOT NULL,
  "refresh_token" text,
  "access_token" text,
  "expires_at" integer,
  "token_type" text,
  "scope" text,
  "id_token" text,
  "session_state" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE TRIGGER update_modified_at_trigger BEFORE UPDATE ON "auth"."user_account" FOR EACH ROW EXECUTE PROCEDURE update_modified_at();

CREATE TABLE "auth"."session" (
  "id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "session_token" text NOT NULL UNIQUE,
  "user_id" uuid NOT NULL REFERENCES "auth"."user" ("id"),
  "current_org_id" uuid REFERENCES "org" ("id"),
  "expires" timestamp without time zone NOT NULL
);

CREATE TABLE "auth"."verification_token" (
  "identifier" uuid NOT NULL DEFAULT uuid_generate_v7() PRIMARY KEY,
  "token" text NOT NULL UNIQUE,
  "session_token" text NOT NULL UNIQUE,
  "expires" timestamp without time zone NOT NULL
);

--
-- End auth schema
--

CREATE TABLE "audit" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v7() PRIMARY KEY,
  "org_id" uuid NOT NULL REFERENCES "org" ("id"),
  "name" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "is_deleted" boolean NOT NULL DEFAULT FALSE
);
CREATE TRIGGER update_modified_at_trigger BEFORE UPDATE ON "audit" FOR EACH ROW EXECUTE PROCEDURE update_modified_at();

CREATE TABLE "document" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v7() PRIMARY KEY,
  "org_id" uuid NOT NULL REFERENCES "org" ("id"),
  "uploaded_by_user_id" uuid REFERENCES "auth"."user" ("id"),
  "key" text NOT NULL UNIQUE,
  "bucket" text NOT NULL,
  "name" text,
  "size" integer NOT NULL,
  "mime_type" text,
  "classified_type" text NOT NULL DEFAULT 'UNCLASSIFIED',
  "file_last_modified" timestamp NOT NULL,
  "is_processed" boolean NOT NULL DEFAULT FALSE,
  "extracted" text,
  "usage" JSONB,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "is_deleted" boolean NOT NULL DEFAULT FALSE
);
CREATE TRIGGER update_modified_at_trigger BEFORE UPDATE ON "document" FOR EACH ROW EXECUTE PROCEDURE update_modified_at();

CREATE TABLE "ai_query" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v7() PRIMARY KEY,
  "audit_id" uuid REFERENCES "audit" ("id"),
  "document_id" uuid REFERENCES "document" ("id"),
  "identifier" text,
  "status" text NOT NULL DEFAULT 'PENDING',
  "model" text,
  "query" JSONB,
  "result" text,
  "error" text,
  "is_validated" boolean NOT NULL DEFAULT FALSE,
  "usage" JSONB,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "answered_at" timestamptz,
  "is_deleted" boolean NOT NULL DEFAULT FALSE
);

CREATE TABLE "document_queue" (
  "id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "document_id" uuid REFERENCES "document" ("id"),
  "status" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "payload" text
);
CREATE TRIGGER update_modified_at_trigger BEFORE UPDATE ON "document_queue" FOR EACH ROW EXECUTE PROCEDURE update_modified_at();

CREATE TABLE "request_data" (
  "id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "audit_id" uuid NOT NULL REFERENCES "audit" ("id"),
  -- "org_id" uuid NOT NULL REFERENCES "org" ("id"),
  "request_type" text NOT NULL,
  "request_id" text NOT NULL,
  "data" jsonb,
  "actor_user_id" uuid REFERENCES "auth"."user" ("id"),
  "created_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX idx_request_data_1 ON request_data (audit_id, request_type, request_id, created_at DESC);

CREATE TABLE "request_data_document" (
  "id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "request_data_id" bigint NOT NULL REFERENCES "request_data" ("id"),
  "document_id" uuid NOT NULL REFERENCES "document" ("id"),
  "created_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX idx_request_data_document_1 ON request_data_document (request_data_id, document_id);

CREATE TABLE "comment" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v7() PRIMARY KEY,
  "org_id" uuid NOT NULL REFERENCES "org" ("id"),
  "audit_id" uuid REFERENCES "audit" ("id"),
  "request_type" text,
  "document_id" uuid REFERENCES "document" ("id"),
  "user_id" uuid NOT NULL REFERENCES "auth"."user" ("id"),
  "comment" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "is_deleted" boolean NOT NULL DEFAULT FALSE
);
CREATE TRIGGER update_modified_at_trigger BEFORE UPDATE ON "comment" FOR EACH ROW EXECUTE PROCEDURE update_modified_at();

CREATE TABLE "account_mapping" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v7() PRIMARY KEY,
  "audit_id" uuid NOT NULL REFERENCES "audit" ("id"),
  "account_name" text NOT NULL,
  "account_type" text,
  "account_type_override" text,
  "sort_idx" integer,
  "classification_score" numeric(3,2),
  "context" text,
  "reasoning" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "is_deleted" boolean NOT NULL DEFAULT FALSE
);
CREATE TRIGGER update_modified_at_trigger BEFORE UPDATE ON "account_mapping" FOR EACH ROW EXECUTE PROCEDURE update_modified_at();

CREATE TABLE "account_balance" (
  "id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "year" text NOT NULL,
  "account_mapping_id" uuid NOT NULL REFERENCES "account_mapping" ("id"),
  "debit" numeric(14,2),
  "credit" numeric(14,2),
  "currency" text check (currency IN ('USD', 'EUR', 'GBP')) NOT NULL DEFAULT 'USD',
  "created_at" timestamptz DEFAULT now() NOT NULL
);
CREATE TRIGGER update_modified_at_trigger BEFORE UPDATE ON "account_balance" FOR EACH ROW EXECUTE PROCEDURE update_modified_at();

-- CREATE TABLE "log" (
--   "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
--   "org_id" uuid NOT NULL REFERENCES "org" ("id"),
--   "action" text,
--   "actor_id" integer,
--   "actor_type" text,
--   "context_ip" text,
--   "context_user_agent" text,
--   "created_at" timestamp DEFAULT now() NOT NULL
-- );

CREATE TABLE "kv" (
  "key" text NOT NULL PRIMARY KEY,
  "value" text,
  "modified_at" timestamptz DEFAULT now() NOT NULL
);


-- Demo Account
INSERT INTO auth.user (email) VALUES ('ryan@auditre.co'), ('jason@auditre.co');

WITH org_rows AS (
  INSERT INTO org (name, can_have_child_orgs) VALUES ('AuditRe, Inc.', TRUE) RETURNING id
)
INSERT INTO auth.user_role (org_id, user_id, role)
VALUES
  ((SELECT id FROM org_rows), (SELECT id FROM auth.user WHERE email = 'ryan@auditre.co'), 'SUPERUSER'),
  ((SELECT id FROM org_rows), (SELECT id FROM auth.user WHERE email = 'jason@auditre.co'), 'USER');

-- Demo Account 2
WITH org_rows AS (
  INSERT INTO org (name, parent_org_id) VALUES ('Acme Test Org', (SELECT id FROM org where name = 'AuditRe, Inc.')) RETURNING id
)
INSERT INTO auth.invitation (org_id, email, expires_at)
VALUES
  ((SELECT id FROM org_rows), 'rquigley@gmail.com', CURRENT_DATE + INTERVAL '6 months');
