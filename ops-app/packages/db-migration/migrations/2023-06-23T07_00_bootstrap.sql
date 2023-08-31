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
  "extracted" jsonb,
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




--- TEMP DATA

INSERT INTO public.org (id, name, created_at, is_deleted) VALUES ('9922e414-ccea-44aa-9287-b7b5fca0c865', 'Test Org', '2023-08-31 18:18:23.092741', false);


--
-- Data for Name: user; Type: TABLE DATA; Schema: public; Owner: ryan
--



--
-- Data for Name: account; Type: TABLE DATA; Schema: public; Owner: ryan
--



--
-- Data for Name: audit; Type: TABLE DATA; Schema: public; Owner: ryan
--

INSERT INTO public.audit (id, org_id, name, year, created_at, is_deleted) VALUES ('13348bf1-ab03-4f3d-babb-bbb0fc42a674', '9922e414-ccea-44aa-9287-b7b5fca0c865', 'Our First Audit', 2023, '2023-08-31 18:18:23.100793', false);
INSERT INTO public.audit (id, org_id, name, year, created_at, is_deleted) VALUES ('da430fb7-0041-4f57-9d78-5d5e1502f318', '9922e414-ccea-44aa-9287-b7b5fca0c865', 'Old Audit', 2022, '2023-08-31 18:18:23.141706', false);


--
-- Data for Name: request; Type: TABLE DATA; Schema: public; Owner: ryan
--

INSERT INTO public.request (id, audit_id, org_id, name, type, description, status, data, due_date, created_at, is_deleted) VALUES ('087a72b5-d0bd-48ac-aeaa-5371775a5368', '13348bf1-ab03-4f3d-babb-bbb0fc42a674', '9922e414-ccea-44aa-9287-b7b5fca0c865', 'Basic information', 'BASIC_INFO', NULL, 'requested', '{"description": "", "businessName": "", "businessModels": [], "chiefDecisionMaker": ""}', NULL, '2023-08-31 18:18:23.106811', false);
INSERT INTO public.request (id, audit_id, org_id, name, type, description, status, data, due_date, created_at, is_deleted) VALUES ('f5871232-97fb-4a45-a945-0db538b21cfe', '13348bf1-ab03-4f3d-babb-bbb0fc42a674', '9922e414-ccea-44aa-9287-b7b5fca0c865', 'Upload the Chart of Accounts', 'CHART_OF_ACCOUNTS', NULL, 'requested', '{"value": ""}', NULL, '2023-08-31 18:18:23.126884', false);
INSERT INTO public.request (id, audit_id, org_id, name, type, description, status, data, due_date, created_at, is_deleted) VALUES ('99fb0a2d-23d9-4916-923d-359f60771acb', '13348bf1-ab03-4f3d-babb-bbb0fc42a674', '9922e414-ccea-44aa-9287-b7b5fca0c865', 'Does the company have any leases?', 'LEASES', NULL, 'requested', '{"value": ""}', NULL, '2023-08-31 18:18:23.132668', false);
INSERT INTO public.request (id, audit_id, org_id, name, type, description, status, data, due_date, created_at, is_deleted) VALUES ('903571e7-1c5c-4f6e-9999-0ba09cf1bb95', '13348bf1-ab03-4f3d-babb-bbb0fc42a674', '9922e414-ccea-44aa-9287-b7b5fca0c865', 'Upload the Articles of Incorporation', 'ARTICLES_OF_INCORPORATION', NULL, 'requested', '{"value": ""}', NULL, '2023-08-31 18:18:23.134687', false);
INSERT INTO public.request (id, audit_id, org_id, name, type, description, status, data, due_date, created_at, is_deleted) VALUES ('12043c1b-85ff-49c2-9e1a-28006c7622be', '13348bf1-ab03-4f3d-babb-bbb0fc42a674', '9922e414-ccea-44aa-9287-b7b5fca0c865', 'Audit information', 'AUDIT_INFO', NULL, 'requested', '{"year": "", "fiscalYearEnd": "", "hasBeenAudited": false}', NULL, '2023-08-31 18:18:23.13599', false);
INSERT INTO public.request (id, audit_id, org_id, name, type, description, status, data, due_date, created_at, is_deleted) VALUES ('3594c6b1-f501-4c08-b3f2-ae04d0c0ebff', '13348bf1-ab03-4f3d-babb-bbb0fc42a674', '9922e414-ccea-44aa-9287-b7b5fca0c865', 'Upload the Trial Balance', 'TRIAL_BALANCE', NULL, 'requested', '{"value": ""}', NULL, '2023-08-31 18:18:23.137491', false);
INSERT INTO public.request (id, audit_id, org_id, name, type, description, status, data, due_date, created_at, is_deleted) VALUES ('102aa3b8-c40b-4bca-80f3-264a8017ad6b', '13348bf1-ab03-4f3d-babb-bbb0fc42a674', '9922e414-ccea-44aa-9287-b7b5fca0c865', 'Multiple lines', 'MULTIPLE_BUSINESS_LINES', NULL, 'requested', '{"value": ""}', NULL, '2023-08-31 18:18:23.139543', false);
INSERT INTO public.request (id, audit_id, org_id, name, type, description, status, data, due_date, created_at, is_deleted) VALUES ('f8aca9b4-46cb-4a43-9f77-459b50819886', '13348bf1-ab03-4f3d-babb-bbb0fc42a674', '9922e414-ccea-44aa-9287-b7b5fca0c865', 'Does the company issue stock to employees?', 'STOCK_OPTIONS', NULL, 'requested', '{"value": ""}', NULL, '2023-08-31 18:18:23.139778', false);
INSERT INTO public.request (id, audit_id, org_id, name, type, description, status, data, due_date, created_at, is_deleted) VALUES ('9945fa7e-67ab-445d-aa5f-fb2042c64e27', '13348bf1-ab03-4f3d-babb-bbb0fc42a674', '9922e414-ccea-44aa-9287-b7b5fca0c865', 'Have there been any material changes to the operations of the business following the period being audited?', 'MATERIAL_CHANGES_POST_AUDIT', NULL, 'requested', '{"value": ""}', NULL, '2023-08-31 18:18:23.139853', false);
INSERT INTO public.request (id, audit_id, org_id, name, type, description, status, data, due_date, created_at, is_deleted) VALUES ('1abe437f-1285-4b25-b0ad-0c13091fc219', 'da430fb7-0041-4f57-9d78-5d5e1502f318', '9922e414-ccea-44aa-9287-b7b5fca0c865', 'Basic information', 'BASIC_INFO', NULL, 'requested', '{"description": "", "businessName": "", "businessModels": [], "chiefDecisionMaker": ""}', NULL, '2023-08-31 18:18:23.14295', false);
INSERT INTO public.request (id, audit_id, org_id, name, type, description, status, data, due_date, created_at, is_deleted) VALUES ('48a961d1-5091-4f10-85d2-25503d3f0f37', 'da430fb7-0041-4f57-9d78-5d5e1502f318', '9922e414-ccea-44aa-9287-b7b5fca0c865', 'Audit information', 'AUDIT_INFO', NULL, 'requested', '{"year": "", "fiscalYearEnd": "", "hasBeenAudited": false}', NULL, '2023-08-31 18:18:23.143023', false);
INSERT INTO public.request (id, audit_id, org_id, name, type, description, status, data, due_date, created_at, is_deleted) VALUES ('b9584618-6f5b-4afd-88d8-2f3975c4fd42', 'da430fb7-0041-4f57-9d78-5d5e1502f318', '9922e414-ccea-44aa-9287-b7b5fca0c865', 'Upload the Articles of Incorporation', 'ARTICLES_OF_INCORPORATION', NULL, 'requested', '{"value": ""}', NULL, '2023-08-31 18:18:23.143077', false);
INSERT INTO public.request (id, audit_id, org_id, name, type, description, status, data, due_date, created_at, is_deleted) VALUES ('0364c40a-21fc-45ee-a23d-d384937ddb67', 'da430fb7-0041-4f57-9d78-5d5e1502f318', '9922e414-ccea-44aa-9287-b7b5fca0c865', 'Upload the Trial Balance', 'TRIAL_BALANCE', NULL, 'requested', '{"value": ""}', NULL, '2023-08-31 18:18:23.143161', false);
INSERT INTO public.request (id, audit_id, org_id, name, type, description, status, data, due_date, created_at, is_deleted) VALUES ('b8399cac-d6e6-4063-8d45-70fd15d5bd4f', 'da430fb7-0041-4f57-9d78-5d5e1502f318', '9922e414-ccea-44aa-9287-b7b5fca0c865', 'Upload the Chart of Accounts', 'CHART_OF_ACCOUNTS', NULL, 'requested', '{"value": ""}', NULL, '2023-08-31 18:18:23.143298', false);
INSERT INTO public.request (id, audit_id, org_id, name, type, description, status, data, due_date, created_at, is_deleted) VALUES ('0842d90e-f990-4390-8f09-39651cf51178', 'da430fb7-0041-4f57-9d78-5d5e1502f318', '9922e414-ccea-44aa-9287-b7b5fca0c865', 'Multiple lines', 'MULTIPLE_BUSINESS_LINES', NULL, 'requested', '{"value": ""}', NULL, '2023-08-31 18:18:23.143321', false);
INSERT INTO public.request (id, audit_id, org_id, name, type, description, status, data, due_date, created_at, is_deleted) VALUES ('d8ca3f4a-5b5f-4e6d-a34e-293091fac337', 'da430fb7-0041-4f57-9d78-5d5e1502f318', '9922e414-ccea-44aa-9287-b7b5fca0c865', 'Does the company have any leases?', 'LEASES', NULL, 'requested', '{"value": ""}', NULL, '2023-08-31 18:18:23.14344', false);
INSERT INTO public.request (id, audit_id, org_id, name, type, description, status, data, due_date, created_at, is_deleted) VALUES ('6053224c-6999-4d76-80cb-00a62b69f409', 'da430fb7-0041-4f57-9d78-5d5e1502f318', '9922e414-ccea-44aa-9287-b7b5fca0c865', 'Does the company issue stock to employees?', 'STOCK_OPTIONS', NULL, 'requested', '{"value": ""}', NULL, '2023-08-31 18:18:23.143505', false);
INSERT INTO public.request (id, audit_id, org_id, name, type, description, status, data, due_date, created_at, is_deleted) VALUES ('a1478175-38ec-440a-a380-76271c3139c0', 'da430fb7-0041-4f57-9d78-5d5e1502f318', '9922e414-ccea-44aa-9287-b7b5fca0c865', 'Have there been any material changes to the operations of the business following the period being audited?', 'MATERIAL_CHANGES_POST_AUDIT', NULL, 'requested', '{"value": ""}', NULL, '2023-08-31 18:18:23.143566', false);


--
-- Data for Name: document; Type: TABLE DATA; Schema: public; Owner: ryan
--



--
-- Data for Name: documents; Type: TABLE DATA; Schema: public; Owner: ryan
--



--
-- Data for Name: invitation; Type: TABLE DATA; Schema: public; Owner: ryan
--

INSERT INTO public.invitation (id, org_id, email, created_at, expires_at, is_used) VALUES ('67f8fc6d-cc2d-457e-b6e1-7f0f767d9bb7', '9922e414-ccea-44aa-9287-b7b5fca0c865', 'ryan@auditre.co', '2023-08-31 18:18:23.097337', '2023-09-07 18:18:23.097337', false);
INSERT INTO public.invitation (id, org_id, email, created_at, expires_at, is_used) VALUES ('b2180842-5e0b-4ff9-840e-8cb7b276f9fd', '9922e414-ccea-44aa-9287-b7b5fca0c865', 'jason@auditre.co', '2023-08-31 18:18:23.099876', '2023-09-07 18:18:23.099876', false);


--
-- Data for Name: migration_version; Type: TABLE DATA; Schema: public; Owner: ryan
--

INSERT INTO public.migration_version (migration, "timestamp") VALUES ('2023-06-23T07_00_bootstrap.sql', '2023-08-31 18:18:22.705827');


--
-- Data for Name: request_change; Type: TABLE DATA; Schema: public; Owner: ryan
--

INSERT INTO public.request_change (id, request_id, audit_id, actor, new_data, created_at) VALUES ('26386f65-6cec-452b-9f5d-0bc417ea47be', '087a72b5-d0bd-48ac-aeaa-5371775a5368', '13348bf1-ab03-4f3d-babb-bbb0fc42a674', '{"type": "SYSTEM"}', '{"description": "", "businessName": "", "businessModels": [], "chiefDecisionMaker": ""}', '2023-08-31 18:18:23.110093');
INSERT INTO public.request_change (id, request_id, audit_id, actor, new_data, created_at) VALUES ('c79df1ae-d45e-438e-a1b9-341483b473ec', 'f5871232-97fb-4a45-a945-0db538b21cfe', '13348bf1-ab03-4f3d-babb-bbb0fc42a674', '{"type": "SYSTEM"}', '{"value": ""}', '2023-08-31 18:18:23.136541');
INSERT INTO public.request_change (id, request_id, audit_id, actor, new_data, created_at) VALUES ('c6e2e067-3370-4b1d-a50a-b5ee3ab043e6', '99fb0a2d-23d9-4916-923d-359f60771acb', '13348bf1-ab03-4f3d-babb-bbb0fc42a674', '{"type": "SYSTEM"}', '{"value": ""}', '2023-08-31 18:18:23.137559');
INSERT INTO public.request_change (id, request_id, audit_id, actor, new_data, created_at) VALUES ('ea73f2dc-7cfb-4ff1-89ad-5e0933334895', '12043c1b-85ff-49c2-9e1a-28006c7622be', '13348bf1-ab03-4f3d-babb-bbb0fc42a674', '{"type": "SYSTEM"}', '{"year": "", "fiscalYearEnd": "", "hasBeenAudited": false}', '2023-08-31 18:18:23.138637');
INSERT INTO public.request_change (id, request_id, audit_id, actor, new_data, created_at) VALUES ('98a26e35-c6de-4077-acb9-75fb5b79c397', '903571e7-1c5c-4f6e-9999-0ba09cf1bb95', '13348bf1-ab03-4f3d-babb-bbb0fc42a674', '{"type": "SYSTEM"}', '{"value": ""}', '2023-08-31 18:18:23.138992');
INSERT INTO public.request_change (id, request_id, audit_id, actor, new_data, created_at) VALUES ('42ccf59b-cd8e-4994-84b6-73f24032bcc0', '3594c6b1-f501-4c08-b3f2-ae04d0c0ebff', '13348bf1-ab03-4f3d-babb-bbb0fc42a674', '{"type": "SYSTEM"}', '{"value": ""}', '2023-08-31 18:18:23.139429');
INSERT INTO public.request_change (id, request_id, audit_id, actor, new_data, created_at) VALUES ('76276163-ee47-43e4-a7bd-e25fe48d6442', '102aa3b8-c40b-4bca-80f3-264a8017ad6b', '13348bf1-ab03-4f3d-babb-bbb0fc42a674', '{"type": "SYSTEM"}', '{"value": ""}', '2023-08-31 18:18:23.140643');
INSERT INTO public.request_change (id, request_id, audit_id, actor, new_data, created_at) VALUES ('1ab8edcd-22f5-430c-b734-d048b5c3ff43', 'f8aca9b4-46cb-4a43-9f77-459b50819886', '13348bf1-ab03-4f3d-babb-bbb0fc42a674', '{"type": "SYSTEM"}', '{"value": ""}', '2023-08-31 18:18:23.140917');
INSERT INTO public.request_change (id, request_id, audit_id, actor, new_data, created_at) VALUES ('626a3e2e-607d-43ab-9b25-d584f17cb86c', '9945fa7e-67ab-445d-aa5f-fb2042c64e27', '13348bf1-ab03-4f3d-babb-bbb0fc42a674', '{"type": "SYSTEM"}', '{"value": ""}', '2023-08-31 18:18:23.141119');
INSERT INTO public.request_change (id, request_id, audit_id, actor, new_data, created_at) VALUES ('f54e2f09-8641-41bf-afa3-8e79f767c3d5', '1abe437f-1285-4b25-b0ad-0c13091fc219', 'da430fb7-0041-4f57-9d78-5d5e1502f318', '{"type": "SYSTEM"}', '{"description": "", "businessName": "", "businessModels": [], "chiefDecisionMaker": ""}', '2023-08-31 18:18:23.143656');
INSERT INTO public.request_change (id, request_id, audit_id, actor, new_data, created_at) VALUES ('dd644d64-7923-4099-b455-80613dbae318', '48a961d1-5091-4f10-85d2-25503d3f0f37', 'da430fb7-0041-4f57-9d78-5d5e1502f318', '{"type": "SYSTEM"}', '{"year": "", "fiscalYearEnd": "", "hasBeenAudited": false}', '2023-08-31 18:18:23.143815');
INSERT INTO public.request_change (id, request_id, audit_id, actor, new_data, created_at) VALUES ('38335674-45ca-42f0-8d30-1bb601158225', 'b9584618-6f5b-4afd-88d8-2f3975c4fd42', 'da430fb7-0041-4f57-9d78-5d5e1502f318', '{"type": "SYSTEM"}', '{"value": ""}', '2023-08-31 18:18:23.143996');
INSERT INTO public.request_change (id, request_id, audit_id, actor, new_data, created_at) VALUES ('d22ef0aa-5ac4-4d3e-bd02-657a241d1df9', '0364c40a-21fc-45ee-a23d-d384937ddb67', 'da430fb7-0041-4f57-9d78-5d5e1502f318', '{"type": "SYSTEM"}', '{"value": ""}', '2023-08-31 18:18:23.144103');
INSERT INTO public.request_change (id, request_id, audit_id, actor, new_data, created_at) VALUES ('6e16866b-f12e-4090-bad4-e3cbd9a9a77a', 'b8399cac-d6e6-4063-8d45-70fd15d5bd4f', 'da430fb7-0041-4f57-9d78-5d5e1502f318', '{"type": "SYSTEM"}', '{"value": ""}', '2023-08-31 18:18:23.144281');
INSERT INTO public.request_change (id, request_id, audit_id, actor, new_data, created_at) VALUES ('829e1050-0663-4277-a2de-ebe34e506ecb', '0842d90e-f990-4390-8f09-39651cf51178', 'da430fb7-0041-4f57-9d78-5d5e1502f318', '{"type": "SYSTEM"}', '{"value": ""}', '2023-08-31 18:18:23.144422');
INSERT INTO public.request_change (id, request_id, audit_id, actor, new_data, created_at) VALUES ('578a6dff-60dd-45be-8e2f-ab5de830c3ca', '6053224c-6999-4d76-80cb-00a62b69f409', 'da430fb7-0041-4f57-9d78-5d5e1502f318', '{"type": "SYSTEM"}', '{"value": ""}', '2023-08-31 18:18:23.144653');
INSERT INTO public.request_change (id, request_id, audit_id, actor, new_data, created_at) VALUES ('a87a54ff-fbdb-434d-a8b9-a7951ca715ef', 'd8ca3f4a-5b5f-4e6d-a34e-293091fac337', 'da430fb7-0041-4f57-9d78-5d5e1502f318', '{"type": "SYSTEM"}', '{"value": ""}', '2023-08-31 18:18:23.145328');
INSERT INTO public.request_change (id, request_id, audit_id, actor, new_data, created_at) VALUES ('ec493a94-142f-48e0-a7ba-0bac3729471d', 'a1478175-38ec-440a-a380-76271c3139c0', 'da430fb7-0041-4f57-9d78-5d5e1502f318', '{"type": "SYSTEM"}', '{"value": ""}', '2023-08-31 18:18:23.145599');