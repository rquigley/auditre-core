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

CREATE TABLE "document_query" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "document_id" uuid REFERENCES "document" ("id"),
  "model" text,
  "query" text,
  "result" JSONB,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "is_deleted" boolean NOT NULL DEFAULT FALSE
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


--
-- PostgreSQL database dump
--

-- Dumped from database version 15.4 (Homebrew)
-- Dumped by pg_dump version 15.4

--
-- Data for Name: org; Type: TABLE DATA; Schema: public; Owner: ryan
--

INSERT INTO public.org (id, name, created_at, is_deleted) VALUES ('e7eabc44-1a63-437a-8773-51132b7c8aaa', 'Test Org', '2023-09-06 14:47:53.173976', false);


--
-- Data for Name: user; Type: TABLE DATA; Schema: public; Owner: ryan
--



--
-- Data for Name: account; Type: TABLE DATA; Schema: public; Owner: ryan
--



--
-- Data for Name: audit; Type: TABLE DATA; Schema: public; Owner: ryan
--

INSERT INTO public.audit (id, org_id, name, year, created_at, is_deleted) VALUES ('16e91efc-604e-4658-8a0e-6a0674579273', 'e7eabc44-1a63-437a-8773-51132b7c8aaa', 'Our First Audit', 2023, '2023-09-06 14:47:53.181495', false);
INSERT INTO public.audit (id, org_id, name, year, created_at, is_deleted) VALUES ('a9f551a9-46e2-4421-a7b5-44ad675d6e3f', 'e7eabc44-1a63-437a-8773-51132b7c8aaa', 'Old Audit', 2022, '2023-09-06 14:47:53.213223', false);


--
-- Data for Name: request; Type: TABLE DATA; Schema: public; Owner: ryan
--

INSERT INTO public.request (id, audit_id, org_id, name, type, description, status, data, due_date, created_at, is_deleted) VALUES ('7dd24c8b-5a1b-4fd9-953f-7aea76061984', '16e91efc-604e-4658-8a0e-6a0674579273', 'e7eabc44-1a63-437a-8773-51132b7c8aaa', 'Basic information', 'BASIC_INFO', NULL, 'requested', '{"description": "", "businessName": "", "businessModels": [], "chiefDecisionMaker": ""}', NULL, '2023-09-06 14:47:53.188118', false);
INSERT INTO public.request (id, audit_id, org_id, name, type, description, status, data, due_date, created_at, is_deleted) VALUES ('7c468037-e091-49e4-8f76-7298e2cf4208', '16e91efc-604e-4658-8a0e-6a0674579273', 'e7eabc44-1a63-437a-8773-51132b7c8aaa', 'Audit information', 'AUDIT_INFO', NULL, 'requested', '{"year": "", "fiscalYearEnd": "", "hasBeenAudited": false}', NULL, '2023-09-06 14:47:53.194217', false);
INSERT INTO public.request (id, audit_id, org_id, name, type, description, status, data, due_date, created_at, is_deleted) VALUES ('a6bd1b15-9149-4828-8bfd-aa11d4778934', '16e91efc-604e-4658-8a0e-6a0674579273', 'e7eabc44-1a63-437a-8773-51132b7c8aaa', 'Upload the Articles of Incorporation', 'ARTICLES_OF_INCORPORATION', NULL, 'requested', '{"value": ""}', NULL, '2023-09-06 14:47:53.196248', false);
INSERT INTO public.request (id, audit_id, org_id, name, type, description, status, data, due_date, created_at, is_deleted) VALUES ('2ab7b339-48b5-4378-afdf-4d366787ff02', '16e91efc-604e-4658-8a0e-6a0674579273', 'e7eabc44-1a63-437a-8773-51132b7c8aaa', 'Upload the Trial Balance', 'TRIAL_BALANCE', NULL, 'requested', '{"value": ""}', NULL, '2023-09-06 14:47:53.200234', false);
INSERT INTO public.request (id, audit_id, org_id, name, type, description, status, data, due_date, created_at, is_deleted) VALUES ('7d7f6fd5-4432-4209-a259-8c486f1c99e9', '16e91efc-604e-4658-8a0e-6a0674579273', 'e7eabc44-1a63-437a-8773-51132b7c8aaa', 'Upload the Chart of Accounts', 'CHART_OF_ACCOUNTS', NULL, 'requested', '{"value": ""}', NULL, '2023-09-06 14:47:53.207674', false);
INSERT INTO public.request (id, audit_id, org_id, name, type, description, status, data, due_date, created_at, is_deleted) VALUES ('267a5eaa-cc1b-4fc4-996e-20f491227ca8', '16e91efc-604e-4658-8a0e-6a0674579273', 'e7eabc44-1a63-437a-8773-51132b7c8aaa', 'Multiple lines', 'MULTIPLE_BUSINESS_LINES', NULL, 'requested', '{"value": false}', NULL, '2023-09-06 14:47:53.208487', false);
INSERT INTO public.request (id, audit_id, org_id, name, type, description, status, data, due_date, created_at, is_deleted) VALUES ('52c66c61-c314-4631-864f-532e814e56a5', '16e91efc-604e-4658-8a0e-6a0674579273', 'e7eabc44-1a63-437a-8773-51132b7c8aaa', 'Leases', 'LEASES', NULL, 'requested', '{"value": false}', NULL, '2023-09-06 14:47:53.210986', false);
INSERT INTO public.request (id, audit_id, org_id, name, type, description, status, data, due_date, created_at, is_deleted) VALUES ('f8b79807-7902-49ab-82d1-7dd144b76aaf', '16e91efc-604e-4658-8a0e-6a0674579273', 'e7eabc44-1a63-437a-8773-51132b7c8aaa', 'Stock option plan and ammendments', 'STOCK_OPTIONS', NULL, 'requested', '{"value": false}', NULL, '2023-09-06 14:47:53.211083', false);
INSERT INTO public.request (id, audit_id, org_id, name, type, description, status, data, due_date, created_at, is_deleted) VALUES ('5c76bae3-df3f-49bb-9f46-f0f582c931d0', '16e91efc-604e-4658-8a0e-6a0674579273', 'e7eabc44-1a63-437a-8773-51132b7c8aaa', 'Post-audit changes', 'MATERIAL_CHANGES_POST_AUDIT', NULL, 'requested', '{"value": false}', NULL, '2023-09-06 14:47:53.211612', false);
INSERT INTO public.request (id, audit_id, org_id, name, type, description, status, data, due_date, created_at, is_deleted) VALUES ('82632e7a-8dda-42d6-93b3-ba9f8454a3ba', 'a9f551a9-46e2-4421-a7b5-44ad675d6e3f', 'e7eabc44-1a63-437a-8773-51132b7c8aaa', 'Basic information', 'BASIC_INFO', NULL, 'requested', '{"description": "", "businessName": "", "businessModels": [], "chiefDecisionMaker": ""}', NULL, '2023-09-06 14:47:53.214423', false);
INSERT INTO public.request (id, audit_id, org_id, name, type, description, status, data, due_date, created_at, is_deleted) VALUES ('58c29e48-4f38-48a1-abad-817e8d1cf16f', 'a9f551a9-46e2-4421-a7b5-44ad675d6e3f', 'e7eabc44-1a63-437a-8773-51132b7c8aaa', 'Audit information', 'AUDIT_INFO', NULL, 'requested', '{"year": "", "fiscalYearEnd": "", "hasBeenAudited": false}', NULL, '2023-09-06 14:47:53.214462', false);
INSERT INTO public.request (id, audit_id, org_id, name, type, description, status, data, due_date, created_at, is_deleted) VALUES ('807575ad-3bf5-402a-9cb2-1ec8e830f96a', 'a9f551a9-46e2-4421-a7b5-44ad675d6e3f', 'e7eabc44-1a63-437a-8773-51132b7c8aaa', 'Upload the Articles of Incorporation', 'ARTICLES_OF_INCORPORATION', NULL, 'requested', '{"value": ""}', NULL, '2023-09-06 14:47:53.214527', false);
INSERT INTO public.request (id, audit_id, org_id, name, type, description, status, data, due_date, created_at, is_deleted) VALUES ('e93ee536-e082-4c1c-88d5-fc242ce605cc', 'a9f551a9-46e2-4421-a7b5-44ad675d6e3f', 'e7eabc44-1a63-437a-8773-51132b7c8aaa', 'Upload the Trial Balance', 'TRIAL_BALANCE', NULL, 'requested', '{"value": ""}', NULL, '2023-09-06 14:47:53.214603', false);
INSERT INTO public.request (id, audit_id, org_id, name, type, description, status, data, due_date, created_at, is_deleted) VALUES ('15693386-54c8-47a5-8498-ad6f263967e8', 'a9f551a9-46e2-4421-a7b5-44ad675d6e3f', 'e7eabc44-1a63-437a-8773-51132b7c8aaa', 'Upload the Chart of Accounts', 'CHART_OF_ACCOUNTS', NULL, 'requested', '{"value": ""}', NULL, '2023-09-06 14:47:53.21465', false);
INSERT INTO public.request (id, audit_id, org_id, name, type, description, status, data, due_date, created_at, is_deleted) VALUES ('9bf88bf7-1712-46f0-8514-7811a4978088', 'a9f551a9-46e2-4421-a7b5-44ad675d6e3f', 'e7eabc44-1a63-437a-8773-51132b7c8aaa', 'Multiple lines', 'MULTIPLE_BUSINESS_LINES', NULL, 'requested', '{"value": false}', NULL, '2023-09-06 14:47:53.214687', false);
INSERT INTO public.request (id, audit_id, org_id, name, type, description, status, data, due_date, created_at, is_deleted) VALUES ('d845dc2c-b0d1-487e-8b44-1d32172403a7', 'a9f551a9-46e2-4421-a7b5-44ad675d6e3f', 'e7eabc44-1a63-437a-8773-51132b7c8aaa', 'Leases', 'LEASES', NULL, 'requested', '{"value": false}', NULL, '2023-09-06 14:47:53.214783', false);
INSERT INTO public.request (id, audit_id, org_id, name, type, description, status, data, due_date, created_at, is_deleted) VALUES ('cfcc8e1b-e9fe-432a-833e-080e5df0bee9', 'a9f551a9-46e2-4421-a7b5-44ad675d6e3f', 'e7eabc44-1a63-437a-8773-51132b7c8aaa', 'Stock option plan and ammendments', 'STOCK_OPTIONS', NULL, 'requested', '{"value": false}', NULL, '2023-09-06 14:47:53.214846', false);
INSERT INTO public.request (id, audit_id, org_id, name, type, description, status, data, due_date, created_at, is_deleted) VALUES ('70947450-73ed-4515-b15b-b881d3e1ac98', 'a9f551a9-46e2-4421-a7b5-44ad675d6e3f', 'e7eabc44-1a63-437a-8773-51132b7c8aaa', 'Post-audit changes', 'MATERIAL_CHANGES_POST_AUDIT', NULL, 'requested', '{"value": false}', NULL, '2023-09-06 14:47:53.214906', false);


--
-- Data for Name: document; Type: TABLE DATA; Schema: public; Owner: ryan
--



--
-- Data for Name: document_query; Type: TABLE DATA; Schema: public; Owner: ryan
--



--
-- Data for Name: documents; Type: TABLE DATA; Schema: public; Owner: ryan
--



--
-- Data for Name: invitation; Type: TABLE DATA; Schema: public; Owner: ryan
--

INSERT INTO public.invitation (id, org_id, email, created_at, expires_at, is_used) VALUES ('3b4b71b6-bac8-4f34-a220-5f75dbb37743', 'e7eabc44-1a63-437a-8773-51132b7c8aaa', 'ryan@auditre.co', '2023-09-06 14:47:53.178052', '2023-09-13 14:47:53.178052', false);
INSERT INTO public.invitation (id, org_id, email, created_at, expires_at, is_used) VALUES ('4ffeefcb-1634-43e4-8fd8-4f32aed2b7b3', 'e7eabc44-1a63-437a-8773-51132b7c8aaa', 'jason@auditre.co', '2023-09-06 14:47:53.180664', '2023-09-13 14:47:53.180664', false);



--
-- Data for Name: request_change; Type: TABLE DATA; Schema: public; Owner: ryan
--

INSERT INTO public.request_change (id, request_id, audit_id, actor, new_data, created_at) VALUES ('c9b1a8f2-f10c-4d2b-affb-830b0b187f19', '7dd24c8b-5a1b-4fd9-953f-7aea76061984', '16e91efc-604e-4658-8a0e-6a0674579273', '{"type": "SYSTEM"}', '{"description": "", "businessName": "", "businessModels": [], "chiefDecisionMaker": ""}', '2023-09-06 14:47:53.193255');
INSERT INTO public.request_change (id, request_id, audit_id, actor, new_data, created_at) VALUES ('08879fbc-845d-4941-bd0d-578a7b54d0f0', '7c468037-e091-49e4-8f76-7298e2cf4208', '16e91efc-604e-4658-8a0e-6a0674579273', '{"type": "SYSTEM"}', '{"year": "", "fiscalYearEnd": "", "hasBeenAudited": false}', '2023-09-06 14:47:53.197864');
INSERT INTO public.request_change (id, request_id, audit_id, actor, new_data, created_at) VALUES ('9ec8a8b9-81fa-4e78-ae72-f1de8a1c4058', '2ab7b339-48b5-4378-afdf-4d366787ff02', '16e91efc-604e-4658-8a0e-6a0674579273', '{"type": "SYSTEM"}', '{"value": ""}', '2023-09-06 14:47:53.20731');
INSERT INTO public.request_change (id, request_id, audit_id, actor, new_data, created_at) VALUES ('12389ee3-d325-44bc-be8d-93a08c52dec9', 'a6bd1b15-9149-4828-8bfd-aa11d4778934', '16e91efc-604e-4658-8a0e-6a0674579273', '{"type": "SYSTEM"}', '{"value": ""}', '2023-09-06 14:47:53.208375');
INSERT INTO public.request_change (id, request_id, audit_id, actor, new_data, created_at) VALUES ('7c427df3-dbcd-4b44-833e-76aae0cd75d9', '7d7f6fd5-4432-4209-a259-8c486f1c99e9', '16e91efc-604e-4658-8a0e-6a0674579273', '{"type": "SYSTEM"}', '{"value": ""}', '2023-09-06 14:47:53.209949');
INSERT INTO public.request_change (id, request_id, audit_id, actor, new_data, created_at) VALUES ('0d0b50d4-24b3-4aa5-a7a9-48a3ff63520b', '267a5eaa-cc1b-4fc4-996e-20f491227ca8', '16e91efc-604e-4658-8a0e-6a0674579273', '{"type": "SYSTEM"}', '{"value": false}', '2023-09-06 14:47:53.210254');
INSERT INTO public.request_change (id, request_id, audit_id, actor, new_data, created_at) VALUES ('df35eff7-ae03-4076-96ae-09ec3204f2ea', '52c66c61-c314-4631-864f-532e814e56a5', '16e91efc-604e-4658-8a0e-6a0674579273', '{"type": "SYSTEM"}', '{"value": false}', '2023-09-06 14:47:53.212143');
INSERT INTO public.request_change (id, request_id, audit_id, actor, new_data, created_at) VALUES ('a9455c13-53da-42a0-9e9e-883afd02fe40', 'f8b79807-7902-49ab-82d1-7dd144b76aaf', '16e91efc-604e-4658-8a0e-6a0674579273', '{"type": "SYSTEM"}', '{"value": false}', '2023-09-06 14:47:53.212467');
INSERT INTO public.request_change (id, request_id, audit_id, actor, new_data, created_at) VALUES ('dcd958c5-52d2-4c96-bb19-ece150464543', '5c76bae3-df3f-49bb-9f46-f0f582c931d0', '16e91efc-604e-4658-8a0e-6a0674579273', '{"type": "SYSTEM"}', '{"value": false}', '2023-09-06 14:47:53.212594');
INSERT INTO public.request_change (id, request_id, audit_id, actor, new_data, created_at) VALUES ('90e7603b-8468-489a-90c4-ca8f4bf2bdd0', '82632e7a-8dda-42d6-93b3-ba9f8454a3ba', 'a9f551a9-46e2-4421-a7b5-44ad675d6e3f', '{"type": "SYSTEM"}', '{"description": "", "businessName": "", "businessModels": [], "chiefDecisionMaker": ""}', '2023-09-06 14:47:53.215057');
INSERT INTO public.request_change (id, request_id, audit_id, actor, new_data, created_at) VALUES ('d4d547a8-d015-441f-a866-4d4b0319caeb', '58c29e48-4f38-48a1-abad-817e8d1cf16f', 'a9f551a9-46e2-4421-a7b5-44ad675d6e3f', '{"type": "SYSTEM"}', '{"year": "", "fiscalYearEnd": "", "hasBeenAudited": false}', '2023-09-06 14:47:53.215212');
INSERT INTO public.request_change (id, request_id, audit_id, actor, new_data, created_at) VALUES ('3838aa75-70b5-45a1-b654-6ffbd4b930f7', 'e93ee536-e082-4c1c-88d5-fc242ce605cc', 'a9f551a9-46e2-4421-a7b5-44ad675d6e3f', '{"type": "SYSTEM"}', '{"value": ""}', '2023-09-06 14:47:53.21537');
INSERT INTO public.request_change (id, request_id, audit_id, actor, new_data, created_at) VALUES ('ca7aeb87-5620-4268-9b09-72ce1fb22b54', '807575ad-3bf5-402a-9cb2-1ec8e830f96a', 'a9f551a9-46e2-4421-a7b5-44ad675d6e3f', '{"type": "SYSTEM"}', '{"value": ""}', '2023-09-06 14:47:53.215492');
INSERT INTO public.request_change (id, request_id, audit_id, actor, new_data, created_at) VALUES ('e05de1ee-69d5-44b3-99af-c57cb3937e87', '9bf88bf7-1712-46f0-8514-7811a4978088', 'a9f551a9-46e2-4421-a7b5-44ad675d6e3f', '{"type": "SYSTEM"}', '{"value": false}', '2023-09-06 14:47:53.215626');
INSERT INTO public.request_change (id, request_id, audit_id, actor, new_data, created_at) VALUES ('9068cc43-472b-4abb-87f5-36f1cb8878db', '15693386-54c8-47a5-8498-ad6f263967e8', 'a9f551a9-46e2-4421-a7b5-44ad675d6e3f', '{"type": "SYSTEM"}', '{"value": ""}', '2023-09-06 14:47:53.215758');
INSERT INTO public.request_change (id, request_id, audit_id, actor, new_data, created_at) VALUES ('c2f2dd61-8156-4896-92fd-5d9c5027f6e3', 'd845dc2c-b0d1-487e-8b44-1d32172403a7', 'a9f551a9-46e2-4421-a7b5-44ad675d6e3f', '{"type": "SYSTEM"}', '{"value": false}', '2023-09-06 14:47:53.215974');
INSERT INTO public.request_change (id, request_id, audit_id, actor, new_data, created_at) VALUES ('a36276db-4c09-4201-bf36-421f02da2ba7', 'cfcc8e1b-e9fe-432a-833e-080e5df0bee9', 'a9f551a9-46e2-4421-a7b5-44ad675d6e3f', '{"type": "SYSTEM"}', '{"value": false}', '2023-09-06 14:47:53.216079');
INSERT INTO public.request_change (id, request_id, audit_id, actor, new_data, created_at) VALUES ('202617fd-a1d8-41db-8042-6d423e86315f', '70947450-73ed-4515-b15b-b881d3e1ac98', 'a9f551a9-46e2-4421-a7b5-44ad675d6e3f', '{"type": "SYSTEM"}', '{"value": false}', '2023-09-06 14:47:53.216224');


--
-- Data for Name: session; Type: TABLE DATA; Schema: public; Owner: ryan
--



--
-- Data for Name: verification_token; Type: TABLE DATA; Schema: public; Owner: ryan
--



--
-- PostgreSQL database dump complete
--

