'use server';

import 'server-only';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

import { generate as _generateFinancialStatement } from '@/controllers/audit-output';
import {
  deleteDocument as _deleteDocument,
  extractChartOfAccountsMapping,
  getById as getDocumentById,
  getType as getDocumentType,
  process as processDocument,
} from '@/controllers/document';
import {
  getById as getRequestById,
  update as updateRequest,
} from '@/controllers/request';
import { getCurrent } from '@/controllers/session-user';

import type { AuditId, DocumentId } from '@/types';

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

export async function deleteDocument(id: DocumentId) {
  const user = await getCurrent();
  const document = await getDocumentById(id);
  if (document.orgId !== user.orgId) {
    throw new Error('Unauthorized');
  }

  await _deleteDocument(id);
  revalidatePath('/');
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

  const docType = await getDocumentType(id);
  if (docType !== 'CHART_OF_ACCOUNTS') {
    throw new Error(`Invalid document type for Chart of Accounts: ${docType}`);
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
  if (!request.data.hasOwnProperty(field)) {
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
