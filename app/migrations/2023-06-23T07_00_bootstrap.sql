CREATE TABLE "org" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "name" varchar,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "is_deleted" boolean DEFAULT FALSE
);

CREATE TABLE "user" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "org_id" uuid NOT NULL REFERENCES "org" ("id"),
  "name" varchar,
  "email" varchar UNIQUE,
  "email_verified" varchar,
  "image" varchar,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "is_deleted" boolean NOT NULL DEFAULT FALSE
);

CREATE TABLE "invitation" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "org_id" uuid NOT NULL REFERENCES "org" ("id"),
  "email" varchar UNIQUE,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "expires_at" timestamp DEFAULT (now() + INTERVAL '7 days') NOT NULL,
  "is_used" boolean NOT NULL DEFAULT FALSE
);

CREATE TABLE "account" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "user_id" uuid NOT NULL REFERENCES "user" ("id"),
  "type" varchar NOT NULL,
  "provider" varchar NOT NULL,
  "provider_account_id" varchar NOT NULL,
  "refresh_token" varchar,
  "access_token" varchar,
  "expires_at" integer,
  "token_type" varchar,
  "scope" varchar,
  "id_token" varchar,
  "session_state" varchar,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "session" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "session_token" varchar NOT NULL UNIQUE,
  "user_id" uuid NOT NULL REFERENCES "user" ("id"),
  "expires" timestamp without time zone NOT NULL
);

CREATE TABLE "verification_token" (
  "identifier" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "token" varchar NOT NULL UNIQUE,
  "session_token" varchar NOT NULL UNIQUE,
  "expires" timestamp without time zone NOT NULL
);

CREATE TABLE "documents" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "org_id" uuid NOT NULL REFERENCES "org" ("id"),
  "s3_key" varchar NOT NULL UNIQUE,
  "filename" varchar NOT NULL,
  "type" varchar NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "is_deleted" boolean NOT NULL DEFAULT FALSE
);

CREATE TABLE "audit" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "org_id" uuid NOT NULL REFERENCES "org" ("id"),
  "name" varchar,
  "year" numeric(4,0),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "is_deleted" boolean NOT NULL DEFAULT FALSE
);

CREATE TABLE "request" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "audit_id" uuid NOT NULL REFERENCES "audit" ("id"),
  "org_id" uuid NOT NULL REFERENCES "org" ("id"),
  "name" varchar,
  "type" varchar,
  "description" varchar,
  "status" varchar,
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
  "key" varchar NOT NULL UNIQUE,
  "bucket" varchar NOT NULL,
  "name" varchar,
  "size" integer NOT NULL,
  "type" varchar,
  "last_modified" timestamp NOT NULL,
  "org_id" uuid NOT NULL REFERENCES "org" ("id"),
  "extracted" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "is_deleted" boolean NOT NULL DEFAULT FALSE
);

-- CREATE TABLE "log" (
--   "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
--   "org_id" uuid NOT NULL REFERENCES "org" ("id"),
--   "action" varchar,
--   "actor_id" integer,
--   "actor_type" varchar,
--   "context_ip" varchar,
--   "context_user_agent" varchar,
--   "created_at" timestamp DEFAULT now() NOT NULL
-- );
