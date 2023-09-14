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

INSERT INTO public.org (id, name, created_at, is_deleted) VALUES ('c687b62a-f3ac-4506-875e-2b6eb2851355', 'Test Org', '2023-09-14 09:05:09.940849', false);


--
-- Data for Name: user; Type: TABLE DATA; Schema: public; Owner: ryan
--



--
-- Data for Name: account; Type: TABLE DATA; Schema: public; Owner: ryan
--



--
-- Data for Name: audit; Type: TABLE DATA; Schema: public; Owner: ryan
--

INSERT INTO public.audit (id, org_id, name, year, created_at, is_deleted) VALUES ('35d11c3a-1269-4657-9d04-740a2576c3e7', 'c687b62a-f3ac-4506-875e-2b6eb2851355', 'Our First Audit', 2023, '2023-09-14 09:05:09.948681', false);
INSERT INTO public.audit (id, org_id, name, year, created_at, is_deleted) VALUES ('28a43b01-6a41-4d6e-9ddb-9a99d42569cc', 'c687b62a-f3ac-4506-875e-2b6eb2851355', 'Old Audit', 2022, '2023-09-14 09:05:10.020954', false);


--
-- Data for Name: request; Type: TABLE DATA; Schema: public; Owner: ryan
--

INSERT INTO public.request (id, audit_id, org_id, name, type, description, status, data, due_date, created_at, is_deleted) VALUES ('0df8e43b-e7aa-4f5e-a182-504bc862536c', '35d11c3a-1269-4657-9d04-740a2576c3e7', 'c687b62a-f3ac-4506-875e-2b6eb2851355', 'Basic information', 'BASIC_INFO', NULL, 'requested', '{"description": "", "businessName": "", "businessModels": [], "chiefDecisionMaker": ""}', NULL, '2023-09-14 09:05:09.953891', false);
INSERT INTO public.request (id, audit_id, org_id, name, type, description, status, data, due_date, created_at, is_deleted) VALUES ('e8e620ca-2f61-40bb-b590-ed8383ac2826', '35d11c3a-1269-4657-9d04-740a2576c3e7', 'c687b62a-f3ac-4506-875e-2b6eb2851355', 'Upload the Articles of Incorporation', 'ARTICLES_OF_INCORPORATION', NULL, 'requested', '{"value": ""}', NULL, '2023-09-14 09:05:09.97486', false);
INSERT INTO public.request (id, audit_id, org_id, name, type, description, status, data, due_date, created_at, is_deleted) VALUES ('894d1e85-633a-49ef-b8cf-03ced0734095', '35d11c3a-1269-4657-9d04-740a2576c3e7', 'c687b62a-f3ac-4506-875e-2b6eb2851355', 'Audit information', 'AUDIT_INFO', NULL, 'requested', '{"year": "", "fiscalYearEnd": "", "hasBeenAudited": false}', NULL, '2023-09-14 09:05:09.986344', false);
INSERT INTO public.request (id, audit_id, org_id, name, type, description, status, data, due_date, created_at, is_deleted) VALUES ('829a668f-7d81-4c85-bae1-7123120fee4b', '35d11c3a-1269-4657-9d04-740a2576c3e7', 'c687b62a-f3ac-4506-875e-2b6eb2851355', 'Upload the Trial Balance', 'TRIAL_BALANCE', NULL, 'requested', '{"value": ""}', NULL, '2023-09-14 09:05:09.988985', false);
INSERT INTO public.request (id, audit_id, org_id, name, type, description, status, data, due_date, created_at, is_deleted) VALUES ('dd6a2045-e1b3-41e3-b1ed-310bdf591080', '35d11c3a-1269-4657-9d04-740a2576c3e7', 'c687b62a-f3ac-4506-875e-2b6eb2851355', 'Upload the Chart of Accounts', 'CHART_OF_ACCOUNTS', NULL, 'requested', '{"value": ""}', NULL, '2023-09-14 09:05:09.992314', false);
INSERT INTO public.request (id, audit_id, org_id, name, type, description, status, data, due_date, created_at, is_deleted) VALUES ('04f1f585-f08d-449c-82bf-c777eee79108', '35d11c3a-1269-4657-9d04-740a2576c3e7', 'c687b62a-f3ac-4506-875e-2b6eb2851355', 'Stock option plan and ammendments', 'STOCK_OPTIONS', NULL, 'requested', '{"value": false}', NULL, '2023-09-14 09:05:09.999689', false);
INSERT INTO public.request (id, audit_id, org_id, name, type, description, status, data, due_date, created_at, is_deleted) VALUES ('a59bdc79-b4c9-436c-94af-d27b90fdf88e', '35d11c3a-1269-4657-9d04-740a2576c3e7', 'c687b62a-f3ac-4506-875e-2b6eb2851355', 'Leases', 'LEASES', NULL, 'requested', '{"value": false}', NULL, '2023-09-14 09:05:10.017015', false);
INSERT INTO public.request (id, audit_id, org_id, name, type, description, status, data, due_date, created_at, is_deleted) VALUES ('5ecf40ee-bbee-4d4e-acce-75a5141da7ed', '35d11c3a-1269-4657-9d04-740a2576c3e7', 'c687b62a-f3ac-4506-875e-2b6eb2851355', 'Post-audit changes', 'MATERIAL_CHANGES_POST_AUDIT', NULL, 'requested', '{"value": false}', NULL, '2023-09-14 09:05:10.017441', false);
INSERT INTO public.request (id, audit_id, org_id, name, type, description, status, data, due_date, created_at, is_deleted) VALUES ('b0b02cb7-6dce-42f6-bf4f-8c799f884f87', '28a43b01-6a41-4d6e-9ddb-9a99d42569cc', 'c687b62a-f3ac-4506-875e-2b6eb2851355', 'Basic information', 'BASIC_INFO', NULL, 'requested', '{"description": "", "businessName": "", "businessModels": [], "chiefDecisionMaker": ""}', NULL, '2023-09-14 09:05:10.022305', false);
INSERT INTO public.request (id, audit_id, org_id, name, type, description, status, data, due_date, created_at, is_deleted) VALUES ('3debf549-ab7f-4343-a4f1-4239d1fb6267', '28a43b01-6a41-4d6e-9ddb-9a99d42569cc', 'c687b62a-f3ac-4506-875e-2b6eb2851355', 'Audit information', 'AUDIT_INFO', NULL, 'requested', '{"year": "", "fiscalYearEnd": "", "hasBeenAudited": false}', NULL, '2023-09-14 09:05:10.022672', false);
INSERT INTO public.request (id, audit_id, org_id, name, type, description, status, data, due_date, created_at, is_deleted) VALUES ('37ae9172-715d-44d8-bc48-8917c1cb2c6d', '28a43b01-6a41-4d6e-9ddb-9a99d42569cc', 'c687b62a-f3ac-4506-875e-2b6eb2851355', 'Upload the Articles of Incorporation', 'ARTICLES_OF_INCORPORATION', NULL, 'requested', '{"value": ""}', NULL, '2023-09-14 09:05:10.022741', false);
INSERT INTO public.request (id, audit_id, org_id, name, type, description, status, data, due_date, created_at, is_deleted) VALUES ('2e5617c0-b763-44d4-a0e3-a383027fee31', '28a43b01-6a41-4d6e-9ddb-9a99d42569cc', 'c687b62a-f3ac-4506-875e-2b6eb2851355', 'Upload the Trial Balance', 'TRIAL_BALANCE', NULL, 'requested', '{"value": ""}', NULL, '2023-09-14 09:05:10.022977', false);
INSERT INTO public.request (id, audit_id, org_id, name, type, description, status, data, due_date, created_at, is_deleted) VALUES ('745196d5-f1d9-4a93-9c2c-4b5d4ba000c5', '28a43b01-6a41-4d6e-9ddb-9a99d42569cc', 'c687b62a-f3ac-4506-875e-2b6eb2851355', 'Upload the Chart of Accounts', 'CHART_OF_ACCOUNTS', NULL, 'requested', '{"value": ""}', NULL, '2023-09-14 09:05:10.023142', false);
INSERT INTO public.request (id, audit_id, org_id, name, type, description, status, data, due_date, created_at, is_deleted) VALUES ('6bb8e9bb-21a6-4c5d-b67c-4252056492c3', '28a43b01-6a41-4d6e-9ddb-9a99d42569cc', 'c687b62a-f3ac-4506-875e-2b6eb2851355', 'Leases', 'LEASES', NULL, 'requested', '{"value": false}', NULL, '2023-09-14 09:05:10.023356', false);
INSERT INTO public.request (id, audit_id, org_id, name, type, description, status, data, due_date, created_at, is_deleted) VALUES ('99324104-c07f-4713-afa0-213a79953dc0', '28a43b01-6a41-4d6e-9ddb-9a99d42569cc', 'c687b62a-f3ac-4506-875e-2b6eb2851355', 'Stock option plan and ammendments', 'STOCK_OPTIONS', NULL, 'requested', '{"value": false}', NULL, '2023-09-14 09:05:10.023511', false);
INSERT INTO public.request (id, audit_id, org_id, name, type, description, status, data, due_date, created_at, is_deleted) VALUES ('959ece4d-22de-42df-bd74-c239c5b0454f', '28a43b01-6a41-4d6e-9ddb-9a99d42569cc', 'c687b62a-f3ac-4506-875e-2b6eb2851355', 'Post-audit changes', 'MATERIAL_CHANGES_POST_AUDIT', NULL, 'requested', '{"value": false}', NULL, '2023-09-14 09:05:10.023852', false);


--
-- Data for Name: document; Type: TABLE DATA; Schema: public; Owner: ryan
--



--
-- Data for Name: comment; Type: TABLE DATA; Schema: public; Owner: ryan
--



--
-- Data for Name: document_query; Type: TABLE DATA; Schema: public; Owner: ryan
--



--
-- Data for Name: document_queue; Type: TABLE DATA; Schema: public; Owner: ryan
--



--
-- Data for Name: documents; Type: TABLE DATA; Schema: public; Owner: ryan
--



--
-- Data for Name: invitation; Type: TABLE DATA; Schema: public; Owner: ryan
--

INSERT INTO public.invitation (id, org_id, email, created_at, expires_at, is_used) VALUES ('b49cd25e-9ae1-4515-a6b3-56a231272e6a', 'c687b62a-f3ac-4506-875e-2b6eb2851355', 'ryan@auditre.co', '2023-09-14 09:05:09.945219', '2023-09-21 09:05:09.945219', false);
INSERT INTO public.invitation (id, org_id, email, created_at, expires_at, is_used) VALUES ('ad5aab4e-1370-4c53-8633-b8b2996fbf3c', 'c687b62a-f3ac-4506-875e-2b6eb2851355', 'jason@auditre.co', '2023-09-14 09:05:09.947587', '2023-09-21 09:05:09.947587', false);


--

INSERT INTO public.request_change (id, request_id, audit_id, actor, new_data, created_at) VALUES ('5cafa29d-934c-42b4-9a36-b70d09a8c536', '0df8e43b-e7aa-4f5e-a182-504bc862536c', '35d11c3a-1269-4657-9d04-740a2576c3e7', '{"type": "SYSTEM"}', '{"description": "", "businessName": "", "businessModels": [], "chiefDecisionMaker": ""}', '2023-09-14 09:05:09.958768');
INSERT INTO public.request_change (id, request_id, audit_id, actor, new_data, created_at) VALUES ('ffdb5c8b-7846-4104-afe4-9d9d99264b99', 'e8e620ca-2f61-40bb-b590-ed8383ac2826', '35d11c3a-1269-4657-9d04-740a2576c3e7', '{"type": "SYSTEM"}', '{"value": ""}', '2023-09-14 09:05:09.985274');
INSERT INTO public.request_change (id, request_id, audit_id, actor, new_data, created_at) VALUES ('00a6a541-9ad0-4fb5-8c34-d85a1f862a10', '894d1e85-633a-49ef-b8cf-03ced0734095', '35d11c3a-1269-4657-9d04-740a2576c3e7', '{"type": "SYSTEM"}', '{"year": "", "fiscalYearEnd": "", "hasBeenAudited": false}', '2023-09-14 09:05:09.99127');
INSERT INTO public.request_change (id, request_id, audit_id, actor, new_data, created_at) VALUES ('6fb8f164-165a-4b2e-828a-139467d394d0', '829a668f-7d81-4c85-bae1-7123120fee4b', '35d11c3a-1269-4657-9d04-740a2576c3e7', '{"type": "SYSTEM"}', '{"value": ""}', '2023-09-14 09:05:09.992916');
INSERT INTO public.request_change (id, request_id, audit_id, actor, new_data, created_at) VALUES ('bb2beb6b-605f-4367-b70d-8777f6bdb0ba', 'dd6a2045-e1b3-41e3-b1ed-310bdf591080', '35d11c3a-1269-4657-9d04-740a2576c3e7', '{"type": "SYSTEM"}', '{"value": ""}', '2023-09-14 09:05:10.001527');
INSERT INTO public.request_change (id, request_id, audit_id, actor, new_data, created_at) VALUES ('1fbd7638-d911-415b-81a0-7005b08c5f42', '04f1f585-f08d-449c-82bf-c777eee79108', '35d11c3a-1269-4657-9d04-740a2576c3e7', '{"type": "SYSTEM"}', '{"value": false}', '2023-09-14 09:05:10.002147');
INSERT INTO public.request_change (id, request_id, audit_id, actor, new_data, created_at) VALUES ('be07e5bc-77e1-4477-a781-eb92b403732b', '5ecf40ee-bbee-4d4e-acce-75a5141da7ed', '35d11c3a-1269-4657-9d04-740a2576c3e7', '{"type": "SYSTEM"}', '{"value": false}', '2023-09-14 09:05:10.019748');
INSERT INTO public.request_change (id, request_id, audit_id, actor, new_data, created_at) VALUES ('f09d1f86-c724-438f-9da2-04e991639ff5', 'a59bdc79-b4c9-436c-94af-d27b90fdf88e', '35d11c3a-1269-4657-9d04-740a2576c3e7', '{"type": "SYSTEM"}', '{"value": false}', '2023-09-14 09:05:10.019542');
INSERT INTO public.request_change (id, request_id, audit_id, actor, new_data, created_at) VALUES ('047f4e54-a746-4a2b-a0e2-917654c29b6d', 'b0b02cb7-6dce-42f6-bf4f-8c799f884f87', '28a43b01-6a41-4d6e-9ddb-9a99d42569cc', '{"type": "SYSTEM"}', '{"description": "", "businessName": "", "businessModels": [], "chiefDecisionMaker": ""}', '2023-09-14 09:05:10.023889');
INSERT INTO public.request_change (id, request_id, audit_id, actor, new_data, created_at) VALUES ('b52fd29a-6cdb-4cfc-b614-52c92176e31b', '3debf549-ab7f-4343-a4f1-4239d1fb6267', '28a43b01-6a41-4d6e-9ddb-9a99d42569cc', '{"type": "SYSTEM"}', '{"year": "", "fiscalYearEnd": "", "hasBeenAudited": false}', '2023-09-14 09:05:10.024166');
INSERT INTO public.request_change (id, request_id, audit_id, actor, new_data, created_at) VALUES ('5fe49b80-26d2-432c-ac46-1ae584810341', '37ae9172-715d-44d8-bc48-8917c1cb2c6d', '28a43b01-6a41-4d6e-9ddb-9a99d42569cc', '{"type": "SYSTEM"}', '{"value": ""}', '2023-09-14 09:05:10.024286');
INSERT INTO public.request_change (id, request_id, audit_id, actor, new_data, created_at) VALUES ('2de0e64f-a437-49dd-a028-837daadcef4c', '2e5617c0-b763-44d4-a0e3-a383027fee31', '28a43b01-6a41-4d6e-9ddb-9a99d42569cc', '{"type": "SYSTEM"}', '{"value": ""}', '2023-09-14 09:05:10.024495');
INSERT INTO public.request_change (id, request_id, audit_id, actor, new_data, created_at) VALUES ('b7a3839f-77c0-46e3-96d3-91d86a4c014b', '745196d5-f1d9-4a93-9c2c-4b5d4ba000c5', '28a43b01-6a41-4d6e-9ddb-9a99d42569cc', '{"type": "SYSTEM"}', '{"value": ""}', '2023-09-14 09:05:10.024604');
INSERT INTO public.request_change (id, request_id, audit_id, actor, new_data, created_at) VALUES ('36607479-44d9-4a63-8347-eb3bf012dbef', '959ece4d-22de-42df-bd74-c239c5b0454f', '28a43b01-6a41-4d6e-9ddb-9a99d42569cc', '{"type": "SYSTEM"}', '{"value": false}', '2023-09-14 09:05:10.024881');
INSERT INTO public.request_change (id, request_id, audit_id, actor, new_data, created_at) VALUES ('f7362772-4617-42db-9981-58bb8694ac9f', '99324104-c07f-4713-afa0-213a79953dc0', '28a43b01-6a41-4d6e-9ddb-9a99d42569cc', '{"type": "SYSTEM"}', '{"value": false}', '2023-09-14 09:05:10.024826');
INSERT INTO public.request_change (id, request_id, audit_id, actor, new_data, created_at) VALUES ('bcbde970-49e3-4f65-a2bd-dc431459809e', '6bb8e9bb-21a6-4c5d-b67c-4252056492c3', '28a43b01-6a41-4d6e-9ddb-9a99d42569cc', '{"type": "SYSTEM"}', '{"value": false}', '2023-09-14 09:05:10.025122');



