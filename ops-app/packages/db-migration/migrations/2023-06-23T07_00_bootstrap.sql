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
  "last_modified" timestamp NOT NULL, -- This is for the file, not the record
  "org_id" uuid NOT NULL REFERENCES "org" ("id"),
  "is_processed" boolean NOT NULL DEFAULT FALSE,
  "extracted" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "is_deleted" boolean NOT NULL DEFAULT FALSE
);

CREATE TABLE "document_query" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "document_id" uuid REFERENCES "document" ("id"),
  "model" text,
  "identifier" text,
  "query" text,
  "result" JSONB,
  "usage" JSONB,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "is_deleted" boolean NOT NULL DEFAULT FALSE
);

CREATE TABLE "document_queue" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "document_id" uuid REFERENCES "document" ("id"),
  "status" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "payload" text
);

CREATE TABLE "comment" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "org_id" uuid NOT NULL REFERENCES "org" ("id"),
  "request_id" uuid REFERENCES "request" ("id"),
  "document_id" uuid REFERENCES "document" ("id"),
  "user_id" uuid NOT NULL REFERENCES "user" ("id"),
  "comment" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "is_deleted" boolean NOT NULL DEFAULT FALSE
);

CREATE TABLE "account_mapping" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "document_id" uuid REFERENCES "document" ("id"), -- only present if coming from a document
  "org_id" uuid NOT NULL REFERENCES "org" ("id"),
  "audit_id" uuid NOT NULL REFERENCES "audit" ("id"),
  "account_id" text NOT NULL,
  "account_mapped_to" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "is_deleted" boolean NOT NULL DEFAULT FALSE
);
ALTER TABLE "account_mapping" ADD CONSTRAINT constraint_account_id_audit_id_document_id UNIQUE (account_id, audit_id, document_id);

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


INSERT INTO public.org (id, name, created_at, is_deleted) VALUES ('170d69ff-0173-45eb-ae13-6ff0aa93e670', 'Test Org', '2023-09-27 17:37:42.659012', false);


INSERT INTO public.audit (id, org_id, name, year, created_at, is_deleted) VALUES ('21c26b47-3497-4076-87e1-330ef59fb98e', '170d69ff-0173-45eb-ae13-6ff0aa93e670', 'Our First Audit', 2023, '2023-09-27 17:37:42.673408', false);
INSERT INTO public.audit (id, org_id, name, year, created_at, is_deleted) VALUES ('93dcf316-c28a-4a6f-9a26-d1df19ffd80b', '170d69ff-0173-45eb-ae13-6ff0aa93e670', 'Old Audit', 2022, '2023-09-27 17:37:42.698561', false);



INSERT INTO public.request (id, audit_id, org_id, name, type, description, status, data, due_date, created_at, is_deleted) VALUES ('bb0848a2-fa15-400b-9725-1cda4de32d80', '21c26b47-3497-4076-87e1-330ef59fb98e', '170d69ff-0173-45eb-ae13-6ff0aa93e670', 'Basic information', 'BASIC_INFO', NULL, 'requested', '{"description": "", "businessName": "", "businessModels": [], "chiefDecisionMaker": ""}', NULL, '2023-09-27 17:37:42.681692', false);
INSERT INTO public.request (id, audit_id, org_id, name, type, description, status, data, due_date, created_at, is_deleted) VALUES ('6cc62dbe-76d8-451f-a19f-cc46df7cfe13', '21c26b47-3497-4076-87e1-330ef59fb98e', '170d69ff-0173-45eb-ae13-6ff0aa93e670', 'Upload the Articles of Incorporation', 'ARTICLES_OF_INCORPORATION', NULL, 'requested', '{"value": ""}', NULL, '2023-09-27 17:37:42.690058', false);
INSERT INTO public.request (id, audit_id, org_id, name, type, description, status, data, due_date, created_at, is_deleted) VALUES ('18ced881-2bb0-46af-b284-f44870e585fc', '21c26b47-3497-4076-87e1-330ef59fb98e', '170d69ff-0173-45eb-ae13-6ff0aa93e670', 'Audit information', 'AUDIT_INFO', NULL, 'requested', '{"year": "", "fiscalYearEnd": "", "hasBeenAudited": false}', NULL, '2023-09-27 17:37:42.693075', false);
INSERT INTO public.request (id, audit_id, org_id, name, type, description, status, data, due_date, created_at, is_deleted) VALUES ('0cc70dc0-3e0f-47ae-b98b-7e8c58b20ad2', '21c26b47-3497-4076-87e1-330ef59fb98e', '170d69ff-0173-45eb-ae13-6ff0aa93e670', 'Upload the Chart of Accounts', 'CHART_OF_ACCOUNTS', NULL, 'requested', '{"value": ""}', NULL, '2023-09-27 17:37:42.694174', false);
INSERT INTO public.request (id, audit_id, org_id, name, type, description, status, data, due_date, created_at, is_deleted) VALUES ('976d6ac2-bddb-45b3-89a3-52b7e42d3b24', '21c26b47-3497-4076-87e1-330ef59fb98e', '170d69ff-0173-45eb-ae13-6ff0aa93e670', 'Post-audit changes', 'MATERIAL_CHANGES_POST_AUDIT', NULL, 'requested', '{"value": false}', NULL, '2023-09-27 17:37:42.695105', false);
INSERT INTO public.request (id, audit_id, org_id, name, type, description, status, data, due_date, created_at, is_deleted) VALUES ('f0281429-d4cf-4221-a1b9-41a90279d82a', '21c26b47-3497-4076-87e1-330ef59fb98e', '170d69ff-0173-45eb-ae13-6ff0aa93e670', 'Stock option plan and ammendments', 'STOCK_OPTIONS', NULL, 'requested', '{"value": false}', NULL, '2023-09-27 17:37:42.695452', false);
INSERT INTO public.request (id, audit_id, org_id, name, type, description, status, data, due_date, created_at, is_deleted) VALUES ('ed6ec8a5-710e-4e9a-be8d-1181be1e91b3', '21c26b47-3497-4076-87e1-330ef59fb98e', '170d69ff-0173-45eb-ae13-6ff0aa93e670', 'Leases', 'LEASES', NULL, 'requested', '{"value": false}', NULL, '2023-09-27 17:37:42.695676', false);
INSERT INTO public.request (id, audit_id, org_id, name, type, description, status, data, due_date, created_at, is_deleted) VALUES ('4bafe622-5f59-47c3-9244-93e100ec9e19', '21c26b47-3497-4076-87e1-330ef59fb98e', '170d69ff-0173-45eb-ae13-6ff0aa93e670', 'Upload the Trial Balance', 'TRIAL_BALANCE', NULL, 'requested', '{"value": ""}', NULL, '2023-09-27 17:37:42.696672', false);
INSERT INTO public.request (id, audit_id, org_id, name, type, description, status, data, due_date, created_at, is_deleted) VALUES ('c230387a-52d5-43a8-9534-a793fbfffb30', '93dcf316-c28a-4a6f-9a26-d1df19ffd80b', '170d69ff-0173-45eb-ae13-6ff0aa93e670', 'Basic information', 'BASIC_INFO', NULL, 'requested', '{"description": "", "businessName": "", "businessModels": [], "chiefDecisionMaker": ""}', NULL, '2023-09-27 17:37:42.699618', false);
INSERT INTO public.request (id, audit_id, org_id, name, type, description, status, data, due_date, created_at, is_deleted) VALUES ('e265317c-70aa-439a-b1c9-d63220c9acfa', '93dcf316-c28a-4a6f-9a26-d1df19ffd80b', '170d69ff-0173-45eb-ae13-6ff0aa93e670', 'Audit information', 'AUDIT_INFO', NULL, 'requested', '{"year": "", "fiscalYearEnd": "", "hasBeenAudited": false}', NULL, '2023-09-27 17:37:42.699691', false);
INSERT INTO public.request (id, audit_id, org_id, name, type, description, status, data, due_date, created_at, is_deleted) VALUES ('ca4883b6-fce9-4bad-90d1-4d4df4915f3f', '93dcf316-c28a-4a6f-9a26-d1df19ffd80b', '170d69ff-0173-45eb-ae13-6ff0aa93e670', 'Upload the Articles of Incorporation', 'ARTICLES_OF_INCORPORATION', NULL, 'requested', '{"value": ""}', NULL, '2023-09-27 17:37:42.699775', false);
INSERT INTO public.request (id, audit_id, org_id, name, type, description, status, data, due_date, created_at, is_deleted) VALUES ('b378dee9-45d2-4f58-85d4-eeab0b8648ab', '93dcf316-c28a-4a6f-9a26-d1df19ffd80b', '170d69ff-0173-45eb-ae13-6ff0aa93e670', 'Upload the Trial Balance', 'TRIAL_BALANCE', NULL, 'requested', '{"value": ""}', NULL, '2023-09-27 17:37:42.699858', false);
INSERT INTO public.request (id, audit_id, org_id, name, type, description, status, data, due_date, created_at, is_deleted) VALUES ('23e5706d-b136-443d-a570-7e15c0384613', '93dcf316-c28a-4a6f-9a26-d1df19ffd80b', '170d69ff-0173-45eb-ae13-6ff0aa93e670', 'Upload the Chart of Accounts', 'CHART_OF_ACCOUNTS', NULL, 'requested', '{"value": ""}', NULL, '2023-09-27 17:37:42.699958', false);
INSERT INTO public.request (id, audit_id, org_id, name, type, description, status, data, due_date, created_at, is_deleted) VALUES ('918b922c-fef6-443b-aba1-8c27e973e61f', '93dcf316-c28a-4a6f-9a26-d1df19ffd80b', '170d69ff-0173-45eb-ae13-6ff0aa93e670', 'Leases', 'LEASES', NULL, 'requested', '{"value": false}', NULL, '2023-09-27 17:37:42.700023', false);
INSERT INTO public.request (id, audit_id, org_id, name, type, description, status, data, due_date, created_at, is_deleted) VALUES ('45873cf9-e4e3-4591-aa89-7e737e711b33', '93dcf316-c28a-4a6f-9a26-d1df19ffd80b', '170d69ff-0173-45eb-ae13-6ff0aa93e670', 'Stock option plan and ammendments', 'STOCK_OPTIONS', NULL, 'requested', '{"value": false}', NULL, '2023-09-27 17:37:42.700081', false);
INSERT INTO public.request (id, audit_id, org_id, name, type, description, status, data, due_date, created_at, is_deleted) VALUES ('633ea605-1123-40f6-aba6-81d1f3d0c53c', '93dcf316-c28a-4a6f-9a26-d1df19ffd80b', '170d69ff-0173-45eb-ae13-6ff0aa93e670', 'Post-audit changes', 'MATERIAL_CHANGES_POST_AUDIT', NULL, 'requested', '{"value": false}', NULL, '2023-09-27 17:37:42.700134', false);



INSERT INTO public.invitation (id, org_id, email, created_at, expires_at, is_used) VALUES ('7718ba9b-bd8f-4f1b-91d8-5dd3ea149a83', '170d69ff-0173-45eb-ae13-6ff0aa93e670', 'ryan@auditre.co', '2023-09-27 17:37:42.668691', '2023-10-04 17:37:42.668691', false);
INSERT INTO public.invitation (id, org_id, email, created_at, expires_at, is_used) VALUES ('2443afd0-f913-429d-b941-75e678700df7', '170d69ff-0173-45eb-ae13-6ff0aa93e670', 'jason@auditre.co', '2023-09-27 17:37:42.672284', '2023-10-04 17:37:42.672284', false);

--
-- Data for Name: request_change; Type: TABLE DATA; Schema: public; Owner: ryan
--

INSERT INTO public.request_change (id, request_id, audit_id, actor, new_data, created_at) VALUES ('c3f79801-3d8c-4bd3-b4b0-cb6a5ac046ff', 'bb0848a2-fa15-400b-9725-1cda4de32d80', '21c26b47-3497-4076-87e1-330ef59fb98e', '{"type": "SYSTEM"}', '{"description": "", "businessName": "", "businessModels": [], "chiefDecisionMaker": ""}', '2023-09-27 17:37:42.683923');
INSERT INTO public.request_change (id, request_id, audit_id, actor, new_data, created_at) VALUES ('a7080d1f-ad63-44b9-8666-f04101da6559', '6cc62dbe-76d8-451f-a19f-cc46df7cfe13', '21c26b47-3497-4076-87e1-330ef59fb98e', '{"type": "SYSTEM"}', '{"value": ""}', '2023-09-27 17:37:42.692848');
INSERT INTO public.request_change (id, request_id, audit_id, actor, new_data, created_at) VALUES ('cacd9ad9-8157-48cf-9c62-aac5effe916e', '18ced881-2bb0-46af-b284-f44870e585fc', '21c26b47-3497-4076-87e1-330ef59fb98e', '{"type": "SYSTEM"}', '{"year": "", "fiscalYearEnd": "", "hasBeenAudited": false}', '2023-09-27 17:37:42.696218');
INSERT INTO public.request_change (id, request_id, audit_id, actor, new_data, created_at) VALUES ('f7422c9e-6dc3-412d-89f3-14cf57f044b1', '0cc70dc0-3e0f-47ae-b98b-7e8c58b20ad2', '21c26b47-3497-4076-87e1-330ef59fb98e', '{"type": "SYSTEM"}', '{"value": ""}', '2023-09-27 17:37:42.696568');
INSERT INTO public.request_change (id, request_id, audit_id, actor, new_data, created_at) VALUES ('82d2208d-a846-49d1-8a0c-56e8be6a0d47', 'ed6ec8a5-710e-4e9a-be8d-1181be1e91b3', '21c26b47-3497-4076-87e1-330ef59fb98e', '{"type": "SYSTEM"}', '{"value": false}', '2023-09-27 17:37:42.696928');
INSERT INTO public.request_change (id, request_id, audit_id, actor, new_data, created_at) VALUES ('b2e185f4-bb05-4ba7-9bf3-c14b5b1f5410', '976d6ac2-bddb-45b3-89a3-52b7e42d3b24', '21c26b47-3497-4076-87e1-330ef59fb98e', '{"type": "SYSTEM"}', '{"value": false}', '2023-09-27 17:37:42.697333');
INSERT INTO public.request_change (id, request_id, audit_id, actor, new_data, created_at) VALUES ('d0b929c6-8806-40eb-bb7e-4df694c50cf0', 'f0281429-d4cf-4221-a1b9-41a90279d82a', '21c26b47-3497-4076-87e1-330ef59fb98e', '{"type": "SYSTEM"}', '{"value": false}', '2023-09-27 17:37:42.697492');
INSERT INTO public.request_change (id, request_id, audit_id, actor, new_data, created_at) VALUES ('3fb839c5-a4f0-44e9-b8df-98dc589a11e7', '4bafe622-5f59-47c3-9244-93e100ec9e19', '21c26b47-3497-4076-87e1-330ef59fb98e', '{"type": "SYSTEM"}', '{"value": ""}', '2023-09-27 17:37:42.697925');
INSERT INTO public.request_change (id, request_id, audit_id, actor, new_data, created_at) VALUES ('a11dd57f-0962-4983-bb4d-46e7604a85de', 'c230387a-52d5-43a8-9534-a793fbfffb30', '93dcf316-c28a-4a6f-9a26-d1df19ffd80b', '{"type": "SYSTEM"}', '{"description": "", "businessName": "", "businessModels": [], "chiefDecisionMaker": ""}', '2023-09-27 17:37:42.700247');
INSERT INTO public.request_change (id, request_id, audit_id, actor, new_data, created_at) VALUES ('7b464c13-eb67-4248-af2e-3b7145bbdc53', 'e265317c-70aa-439a-b1c9-d63220c9acfa', '93dcf316-c28a-4a6f-9a26-d1df19ffd80b', '{"type": "SYSTEM"}', '{"year": "", "fiscalYearEnd": "", "hasBeenAudited": false}', '2023-09-27 17:37:42.700396');
INSERT INTO public.request_change (id, request_id, audit_id, actor, new_data, created_at) VALUES ('d952345e-3384-4954-8dbd-4eb84773441f', 'ca4883b6-fce9-4bad-90d1-4d4df4915f3f', '93dcf316-c28a-4a6f-9a26-d1df19ffd80b', '{"type": "SYSTEM"}', '{"value": ""}', '2023-09-27 17:37:42.700555');
INSERT INTO public.request_change (id, request_id, audit_id, actor, new_data, created_at) VALUES ('8e52f620-ab83-426f-8e9d-d4cd04988455', 'b378dee9-45d2-4f58-85d4-eeab0b8648ab', '93dcf316-c28a-4a6f-9a26-d1df19ffd80b', '{"type": "SYSTEM"}', '{"value": ""}', '2023-09-27 17:37:42.700691');
INSERT INTO public.request_change (id, request_id, audit_id, actor, new_data, created_at) VALUES ('1f3320c0-7dd1-43dd-85b9-0bf1c5b12f30', '918b922c-fef6-443b-aba1-8c27e973e61f', '93dcf316-c28a-4a6f-9a26-d1df19ffd80b', '{"type": "SYSTEM"}', '{"value": false}', '2023-09-27 17:37:42.700956');
INSERT INTO public.request_change (id, request_id, audit_id, actor, new_data, created_at) VALUES ('03fcd8a9-6da9-43ee-955c-9ebcf1c6ac1d', '23e5706d-b136-443d-a570-7e15c0384613', '93dcf316-c28a-4a6f-9a26-d1df19ffd80b', '{"type": "SYSTEM"}', '{"value": ""}', '2023-09-27 17:37:42.701469');
INSERT INTO public.request_change (id, request_id, audit_id, actor, new_data, created_at) VALUES ('f3bc9954-b3c7-4819-a74a-3c9d16ad36f8', '45873cf9-e4e3-4591-aa89-7e737e711b33', '93dcf316-c28a-4a6f-9a26-d1df19ffd80b', '{"type": "SYSTEM"}', '{"value": false}', '2023-09-27 17:37:42.701621');
INSERT INTO public.request_change (id, request_id, audit_id, actor, new_data, created_at) VALUES ('9ca4d6d8-82e8-4e71-a2af-7974e0eca5e6', '633ea605-1123-40f6-aba6-81d1f3d0c53c', '93dcf316-c28a-4a6f-9a26-d1df19ffd80b', '{"type": "SYSTEM"}', '{"value": false}', '2023-09-27 17:37:42.701769');



