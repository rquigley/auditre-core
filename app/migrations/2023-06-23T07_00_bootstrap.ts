import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE TABLE "org" (
      "id" serial PRIMARY KEY,
      "name" varchar,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "is_deleted" boolean DEFAULT FALSE
    );
    `.execute(db);

  await sql`
    CREATE TABLE "user" (
      "id" serial PRIMARY KEY,
      "org_id" integer NOT NULL REFERENCES "org" ("id"),
      "external_id" varchar NOT NULL,
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
      "external_id" varchar NOT NULL,
      "org_id" integer NOT NULL REFERENCES "org" ("id"),
      "name" varchar,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "is_deleted" boolean NOT NULL DEFAULT FALSE,
      unique (org_id, external_id)
    );
    `.execute(db);

  await sql`
    CREATE TABLE "request" (
      "id" serial PRIMARY KEY,
      "external_id" varchar NOT NULL,
      "audit_id" integer NOT NULL REFERENCES "audit" ("id"),
      "name" varchar,
      "description" varchar,
      "status" varchar,
      "requestee" integer REFERENCES "user" ("id"),
      "created_at" timestamp DEFAULT now() NOT NULL,
      "is_deleted" boolean NOT NULL DEFAULT FALSE
    );
    `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {}
