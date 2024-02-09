DROP TABLE "auth"."verification_token";

CREATE TABLE "auth"."verification_token" (
  "identifier" text NOT NULL,
  "token" text NOT NULL UNIQUE,
  "expires" timestamp without time zone NOT NULL,
  PRIMARY KEY ("identifier", "token")
);