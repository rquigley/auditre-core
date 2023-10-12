'use server';

import 'server-only';

import { randomUUID } from 'node:crypto';
import { extname } from 'path';
import * as Sentry from '@sentry/node';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import * as z from 'zod';

import { create as _createAudit } from '@/controllers/audit';
import { generate as _generateFinancialStatement } from '@/controllers/audit-output';
import {
  create as _createDocument,
  deleteDocument as _deleteDocument,
  extractChartOfAccountsMapping,
  getAllByRequestId as getAllDocumentsByRequestId,
  getById as getDocumentById,
  process as processDocument,
} from '@/controllers/document';
import { getAllByDocumentId as getAllQueriesByDocumentId } from '@/controllers/document-query';
import {
  getById as getRequestById,
  update as updateRequest,
  upsertDefault as upsertDefaultRequests,
} from '@/controllers/request';
import { getCurrent } from '@/controllers/session-user';
import { getPresignedUrl } from '@/lib/aws';

import type {
  AuditId,
  Document,
  DocumentId,
  DocumentQuery,
  RequestId,
  S3File,
} from '@/types';

export { processDocument };

const POST_AUTH_URL = 'post-login-url';
export async function setPostAuthUrl(url: string) {
  cookies().set(POST_AUTH_URL, url, {
    httpOnly: true,
    sameSite: 'strict',
  });
}

export async function getPostAuthUrl() {
  const url = cookies().get(POST_AUTH_URL)?.value || '/';
  // TODO: currently seeing a bug where this cannot be called unless in a server action
  // but this is... a server action.
  //cookies().delete(POST_AUTH_URL);
  return url;
}

export async function deletePostAuthUrl() {
  cookies().delete(POST_AUTH_URL);
}

const newAuditSchema = z.object({
  name: z.string().min(3).max(72),
  year: z.coerce
    .number()
    .min(1970, 'The year must be at least 1970')
    .max(2050, 'The year must be before 2050'),
});

export async function createAudit(rawData: { name: string; year: number }) {
  const user = await getCurrent();

  const data = newAuditSchema.parse(rawData);

  const audit = await _createAudit({
    name: data.name,
    year: data.year,
    orgId: user.orgId,
  });
  await upsertDefaultRequests({ auditId: audit.id, orgId: user.orgId });

  revalidatePath('/');
  return;
}

export async function createDocument(file: S3File, requestId: RequestId) {
  const user = await getCurrent();
  const request = await getRequestById(requestId);
  if (request.orgId !== user.orgId) {
    throw new Error('Unauthorized');
  }

  const doc = await _createDocument({
    id: file.documentId,
    key: file.key,
    bucket: file.bucket,
    name: file.name,
    size: file.size,
    mimeType: file.type,
    fileLastModified: new Date(file.lastModified),
    orgId: request.orgId,
    requestId: request.id,
  });
  // todo
  // check classified type of file.
  // if doesn't match expected of request type, return error.
  //throw new Error('incorrect type');

  // classification and question kickoff
  try {
    await processDocument(doc.id);
  } catch (e) {
    console.log(e);
    Sentry.captureException(e);
  }

  const { id, key, classifiedType, name } = await getDocumentById(doc.id);

  return {
    id,
    key,
    name,
    classifiedType,
  };
}

export async function deleteDocument(id: DocumentId) {
  const user = await getCurrent();
  const document = await getDocumentById(id);
  if (document.orgId !== user.orgId) {
    throw new Error('Unauthorized');
  }

  await _deleteDocument(id);
  revalidatePath('/');
}

const bucketSchema = z.string();
const filenameSchema = z.string().min(4).max(128);
const contentTypeSchema = z.string().min(4).max(128);

export async function getPresignedUploadUrl({
  requestId,
  filename: unsanitizedFilename,
  contentType: unsanitizedContentType,
}: {
  requestId: RequestId;
  filename: string;
  contentType: string;
}) {
  const user = await getCurrent();
  const request = await getRequestById(requestId);
  if (request.orgId !== user.orgId) {
    throw new Error('Unauthorized');
  }

  const filename = filenameSchema.parse(unsanitizedFilename);
  const bucket = bucketSchema.parse(process.env.AWS_S3_BUCKET);
  const contentType = contentTypeSchema.parse(unsanitizedContentType);
  const documentId = randomUUID();
  const key = `${request.orgId}/${documentId}${extname(filename)}`;
  const url = await getPresignedUrl({
    key,
    bucket,
    contentType,
  });
  return {
    documentId,
    url,
    key,
    bucket,
  };
}

export async function processChartOfAccounts(
  id: DocumentId,
  auditId: AuditId,
): Promise<void> {
  const user = await getCurrent();
  const document = await getDocumentById(id);
  if (document.orgId !== user.orgId) {
    throw new Error('Unauthorized');
  }

  if (document.classifiedType !== 'CHART_OF_ACCOUNTS') {
    throw new Error(
      `Invalid document type for Chart of Accounts: ${document.classifiedType}`,
    );
  }
  await extractChartOfAccountsMapping(document, auditId);
}

export async function selectDocumentForRequest(
  id: DocumentId,
  field: string,
): Promise<void> {
  const user = await getCurrent();
  const document = await getDocumentById(id);
  if (document.orgId !== user.orgId) {
    throw new Error('Unauthorized');
  }
  if (!document.requestId) {
    throw new Error('Document is not bound to a request');
  }

  const request = await getRequestById(document.requestId);
  console.log(request);
  if (!request.data.hasOwnProperty(field)) {
    console.log(request.data);
    throw new Error(`Invalid field: ${field}`);
  }
  const newData = { ...request.data, [field]: document.id };
  await updateRequest(
    request.id,
    { data: newData },
    { userId: user.id, type: 'USER' },
  );
  revalidatePath('/');
}

export async function generateFinancialStatement(auditId: AuditId) {
  await _generateFinancialStatement(auditId);
}
