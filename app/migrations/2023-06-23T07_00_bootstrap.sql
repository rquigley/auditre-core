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


CREATE TABLE "org" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "name" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "is_deleted" boolean DEFAULT FALSE
);
CREATE TRIGGER update_modified_at_trigger BEFORE UPDATE ON "org" FOR EACH ROW EXECUTE PROCEDURE update_modified_at();

CREATE TABLE "user" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "org_id" uuid NOT NULL REFERENCES "org" ("id"),
  "name" text,
  "email" text UNIQUE,
  "email_verified" text,
  "image" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "is_deleted" boolean NOT NULL DEFAULT FALSE
);
CREATE TRIGGER update_modified_at_trigger BEFORE UPDATE ON "user" FOR EACH ROW EXECUTE PROCEDURE update_modified_at();

CREATE TABLE "invitation" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "org_id" uuid NOT NULL REFERENCES "org" ("id"),
  "email" text UNIQUE,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "expires_at" timestamptz DEFAULT (now() + INTERVAL '7 days') NOT NULL,
  "is_used" boolean NOT NULL DEFAULT FALSE
);
CREATE TRIGGER update_modified_at_trigger BEFORE UPDATE ON "invitation" FOR EACH ROW EXECUTE PROCEDURE update_modified_at();

CREATE TABLE "account" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "user_id" uuid NOT NULL REFERENCES "user" ("id"),
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
CREATE TRIGGER update_modified_at_trigger BEFORE UPDATE ON "account" FOR EACH ROW EXECUTE PROCEDURE update_modified_at();

CREATE TABLE "session" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "session_token" text NOT NULL UNIQUE,
  "user_id" uuid NOT NULL REFERENCES "user" ("id"),
  "expires" timestamp without time zone NOT NULL
);

CREATE TABLE "verification_token" (
  "identifier" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "token" text NOT NULL UNIQUE,
  "session_token" text NOT NULL UNIQUE,
  "expires" timestamp without time zone NOT NULL
);

CREATE TABLE "audit" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "org_id" uuid NOT NULL REFERENCES "org" ("id"),
  "name" text,
  "year" numeric(4,0),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "is_deleted" boolean NOT NULL DEFAULT FALSE
);
CREATE TRIGGER update_modified_at_trigger BEFORE UPDATE ON "audit" FOR EACH ROW EXECUTE PROCEDURE update_modified_at();


CREATE TABLE "request_data" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "audit_id" uuid NOT NULL REFERENCES "audit" ("id"),
  "org_id" uuid NOT NULL REFERENCES "org" ("id"),
  "request_type" text NOT NULL,
  "request_id" text NOT NULL,
  "data" jsonb,
  "document_id" uuid REFERENCES "document" ("id"),
  "actor_user_id" uuid REFERENCES "user" ("id"),
  "created_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX idx_request_data_1 ON request_data (audit_id, request_type, request_id, created_at DESC);

CREATE TABLE "document" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  --"request_id" uuid REFERENCES "request" ("id"),
  "org_id" uuid NOT NULL REFERENCES "org" ("id"),
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

CREATE TABLE "document_query" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "document_id" uuid REFERENCES "document" ("id"),
  "model" text,
  "identifier" text,
  "query" JSONB,
  "result" text,
  "usage" JSONB,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "is_deleted" boolean NOT NULL DEFAULT FALSE
);

CREATE TABLE "document_queue" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "document_id" uuid REFERENCES "document" ("id"),
  "status" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "payload" text
);
CREATE TRIGGER update_modified_at_trigger BEFORE UPDATE ON "document_queue" FOR EACH ROW EXECUTE PROCEDURE update_modified_at();

CREATE TABLE "comment" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "org_id" uuid NOT NULL REFERENCES "org" ("id"),
  "audit_id" uuid REFERENCES "audit" ("id"),
  "request_type" text NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "user" ("id"),
  "comment" text,
  "document_id" uuid REFERENCES "document" ("id"),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "is_deleted" boolean NOT NULL DEFAULT FALSE
);
CREATE TRIGGER update_modified_at_trigger BEFORE UPDATE ON "comment" FOR EACH ROW EXECUTE PROCEDURE update_modified_at();

CREATE TABLE "account_mapping" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "document_id" uuid REFERENCES "document" ("id"), -- only present if coming from a document
  "org_id" uuid NOT NULL REFERENCES "org" ("id"),
  "audit_id" uuid NOT NULL REFERENCES "audit" ("id"),
  "account_id" text NOT NULL,
  "account_mapped_to" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "is_deleted" boolean NOT NULL DEFAULT FALSE
);
ALTER TABLE "account_mapping" ADD CONSTRAINT constraint_account_id_audit_id_document_id UNIQUE (account_id, audit_id, document_id);
CREATE TRIGGER update_modified_at_trigger BEFORE UPDATE ON "account_mapping" FOR EACH ROW EXECUTE PROCEDURE update_modified_at();

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
