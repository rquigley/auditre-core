CREATE TABLE "org" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "name" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "is_deleted" boolean DEFAULT FALSE
);

CREATE TABLE "user" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "org_id" uuid NOT NULL REFERENCES "org" ("id"),
  "name" text,
  "email" text UNIQUE,
  "email_verified" text,
  "image" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "is_deleted" boolean NOT NULL DEFAULT FALSE
);

CREATE TABLE "invitation" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "org_id" uuid NOT NULL REFERENCES "org" ("id"),
  "email" text UNIQUE,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "expires_at" timestamp DEFAULT (now() + INTERVAL '7 days') NOT NULL,
  "is_used" boolean NOT NULL DEFAULT FALSE
);

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
  "created_at" timestamp DEFAULT now() NOT NULL
);

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

CREATE TABLE "documents" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "org_id" uuid NOT NULL REFERENCES "org" ("id"),
  "s3_key" text NOT NULL UNIQUE,
  "filename" text NOT NULL,
  "type" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "is_deleted" boolean NOT NULL DEFAULT FALSE
);

CREATE TABLE "audit" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "org_id" uuid NOT NULL REFERENCES "org" ("id"),
  "name" text,
  "year" numeric(4,0),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "is_deleted" boolean NOT NULL DEFAULT FALSE
);

CREATE TABLE "request" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "audit_id" uuid NOT NULL REFERENCES "audit" ("id"),
  "org_id" uuid NOT NULL REFERENCES "org" ("id"),
  "name" text,
  "type" text,
  "description" text,
  "status" text,
  -- "requestee" uuid REFERENCES "user" ("id"),
  "data" jsonb,
  "due_date" date,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "is_deleted" boolean NOT NULL DEFAULT FALSE
);

CREATE TABLE "request_change" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "request_id" uuid NOT NULL REFERENCES "request" ("id"),
  "audit_id" uuid NOT NULL REFERENCES "audit" ("id"),
  "actor" jsonb,
  "new_data" JSONB,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "document" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "request_id" uuid REFERENCES "request" ("id"),
  "key" text NOT NULL UNIQUE,
  "bucket" text NOT NULL,
  "name" text,
  "size" integer NOT NULL,
  "type" text,
  "last_modified" timestamp NOT NULL,
  "org_id" uuid NOT NULL REFERENCES "org" ("id"),
  "extracted" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "is_deleted" boolean NOT NULL DEFAULT FALSE
);


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
