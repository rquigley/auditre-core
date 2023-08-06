import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE TABLE "org" (
      "id" serial PRIMARY KEY,
      "external_id" varchar NOT NULL UNIQUE,
      "name" varchar,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "is_deleted" boolean DEFAULT FALSE
    );
    `.execute(db);

  await sql`
    CREATE TABLE "user" (
      "id" serial PRIMARY KEY,
      "org_id" integer NOT NULL REFERENCES "org" ("id"),
      "external_id" varchar NOT NULL UNIQUE,
      "name" varchar,
      "email" varchar UNIQUE,
      "email_verified" varchar,
      "image" varchar,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "is_deleted" boolean NOT NULL DEFAULT FALSE
    );
    `.execute(db);

  await sql`
    CREATE TABLE "password" (
      "id" serial PRIMARY KEY,
      "user_id" integer NOT NULL REFERENCES "user" ("id"),
      "value" varchar NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL
    );
    `.execute(db);

  await sql`
    CREATE TABLE "account" (
      "user_id" integer NOT NULL REFERENCES "user" ("id"),
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
      "created_at" timestamp DEFAULT now() NOT NULL,
      PRIMARY KEY (provider, provider_account_id)
    );
    `.execute(db);

  await sql`
    CREATE TABLE "session" (
      "id" serial PRIMARY KEY,
      "session_token" varchar NOT NULL UNIQUE,
      "user_id" integer NOT NULL REFERENCES "user" ("id"),
      "expires" timestamp without time zone NOT NULL
    );
    `.execute(db);

  await sql`
    CREATE TABLE "verification_token" (
      "identifier" serial PRIMARY KEY,
      "token" varchar NOT NULL UNIQUE,
      "session_token" varchar NOT NULL UNIQUE,
      "expires" timestamp without time zone NOT NULL
    );
    `.execute(db);

  await sql`
    CREATE TABLE "documents" (
      "id" serial PRIMARY KEY,
      "org_id" integer NOT NULL REFERENCES "org" ("id"),
      "s3_key" varchar NOT NULL UNIQUE,
      "filename" varchar NOT NULL,
      "type" varchar NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "is_deleted" boolean NOT NULL DEFAULT FALSE
    );
    `.execute(db);

  await sql`
    CREATE TABLE "audit" (
      "id" serial PRIMARY KEY,
      "external_id" varchar NOT NULL UNIQUE,
      "org_id" integer NOT NULL REFERENCES "org" ("id"),
      "name" varchar,
      "year" numeric(4,0),
      "created_at" timestamp DEFAULT now() NOT NULL,
      "is_deleted" boolean NOT NULL DEFAULT FALSE
    );
    `.execute(db);

  await sql`
    CREATE TABLE "request" (
      "id" serial PRIMARY KEY,
      "external_id" varchar NOT NULL UNIQUE,
      "audit_id" integer NOT NULL REFERENCES "audit" ("id"),
      "name" varchar,
      "type" varchar,
      "description" varchar,
      "status" varchar,
      "requestee" integer REFERENCES "user" ("id"),
      "data" jsonb,
      "due_date" date,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "is_deleted" boolean NOT NULL DEFAULT FALSE
    );
    `.execute(db);

  await sql`
    CREATE TABLE "request_change" (
      "id" serial PRIMARY KEY,
      "request_id" integer NOT NULL REFERENCES "request" ("id"),
      "external_id" varchar NOT NULL UNIQUE, -- TODO: IS THIS NEEDED?
      "created_at" timestamp DEFAULT now() NOT NULL,
      "audit_id" integer NOT NULL REFERENCES "audit" ("id"),
      "actor" jsonb,
      "new_data" JSONB
    );
    `.execute(db);

  await sql`
    CREATE TABLE "document" (
      "id" serial PRIMARY KEY,
      "external_id" varchar NOT NULL UNIQUE,
      "key" varchar NOT NULL UNIQUE,
      "bucket" varchar NOT NULL,
      "name" varchar,
      "size" integer NOT NULL,
      "type" varchar,
      "last_modified" timestamp NOT NULL,
      "org_id" integer NOT NULL REFERENCES "org" ("id"),
      "created_at" timestamp DEFAULT now() NOT NULL,
      "is_deleted" boolean NOT NULL DEFAULT FALSE
    );
    `.execute(db);

  // await sql`
  //   CREATE TABLE "log" (
  //     "id" serial PRIMARY KEY,
  //     "org_id" integer NOT NULL REFERENCES "org" ("id"),
  //     "action" varchar,
  //     "actor_id" integer,
  //     "actor_type" varchar,
  //     "context_ip" varchar,
  //     "context_user_agent" varchar,
  //     "created_at" timestamp DEFAULT now() NOT NULL
  //   );
  //   `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {}
