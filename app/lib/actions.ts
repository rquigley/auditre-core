'use server';

import 'server-only';

import { randomUUID } from 'node:crypto';
import { extname } from 'path';
import retry from 'async-retry';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import * as z from 'zod';

import {
  create as _createAudit,
  getById as getAuditById,
  update as updateAuditById,
} from '@/controllers/audit';
import { generate as _generateFinancialStatement } from '@/controllers/audit-output';
import {
  create as _createDocument,
  deleteDocument as _deleteDocument,
  extractChartOfAccountsMapping,
  getById as getDocumentById,
  process as processDocument,
} from '@/controllers/document';
import { create as addRequestData } from '@/controllers/request-data';
import { getCurrent } from '@/controllers/session-user';
import { getPresignedUrl } from '@/lib/aws';
import { getRequestTypeForId } from '@/lib/request-types';

import type { AuditId, DocumentId, S3File } from '@/types';

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
  year: z.string().min(1).max(4),
});

export async function createAudit(rawData: { name: string; year: string }) {
  const user = await getCurrent();

  const data = newAuditSchema.parse(rawData);

  const audit = await _createAudit({
    name: data.name,
    orgId: user.orgId,
  });

  const rt = getRequestTypeForId('audit-info');
  if (rt.form.year === undefined) {
    throw new Error('Request config for audit-info is missing year field');
  }
  await addRequestData({
    auditId: audit.id,
    orgId: audit.orgId,
    requestType: 'audit-info',
    requestId: 'year',
    data: { value: data.year },
    actorUserId: user.id,
  });

  revalidatePath('/');
  return audit;
}

const auditSchema = z.object({
  name: z.string().min(3).max(72),
});

export async function updateAudit(auditId: AuditId, rawData: { name: string }) {
  const user = await getCurrent();
  const audit = await getAuditById(auditId);
  if (audit.orgId !== user.orgId) {
    throw new Error('Unauthorized');
  }

  const data = auditSchema.parse(rawData);

  await updateAuditById(auditId, {
    name: data.name,
  });

  revalidatePath('/');
  return;
}

export async function deleteAudit(auditId: AuditId) {
  const user = await getCurrent();
  const audit = await getAuditById(auditId);
  if (audit.orgId !== user.orgId) {
    throw new Error('Unauthorized');
  }

  await updateAuditById(auditId, {
    isDeleted: true,
  });

  return;
}

export async function createDocument(file: S3File) {
  const user = await getCurrent();
  // const request = await getRequestById(requestId);
  // if (request.orgId !== user.orgId) {
  //   throw new Error('Unauthorized');
  // }

  const doc = await _createDocument({
    id: file.documentId,
    key: file.key,
    bucket: file.bucket,
    name: file.name,
    size: file.size,
    mimeType: file.type,
    fileLastModified: new Date(file.lastModified),
    orgId: user.orgId,
    uploadedByUserId: user.id,
    //requestId: request.id,
  });

  // Kick processing off in the background. Do not await
  processDocument(doc.id);

  return {
    id: doc.id,
    key: doc.key,
    name: doc.name,
  };
}

export async function getDocumentStatus(id: DocumentId) {
  try {
    const classifiedType = await retry(
      async () => {
        const doc = await getDocumentById(id);
        if (!doc.isProcessed) {
          throw new Error('Still processing');
        }
        return doc.classifiedType;
      },
      {
        retries: 30,
        factor: 1.2,
        maxTimeout: 3000,
        maxRetryTime: 20000,
      },
    );

    return {
      isProcessed: true,
      classifiedType,
    };
  } catch (e) {
    // todo, catch different error if it's really an error
    console.log(e);
    return {
      isProcessed: false,
      classifiedType: 'UNKNOWN',
    };
  }
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
  filename: unsanitizedFilename,
  contentType: unsanitizedContentType,
}: {
  filename: string;
  contentType: string;
}) {
  const user = await getCurrent();

  const filename = filenameSchema.parse(unsanitizedFilename);
  const bucket = bucketSchema.parse(process.env.AWS_S3_BUCKET);
  const contentType = contentTypeSchema.parse(unsanitizedContentType);
  const documentId = randomUUID();
  const key = `${user.orgId}/${documentId}${extname(filename)}`;
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

// export async function selectDocumentForRequest(
//   id: DocumentId,
//   field: string,
// ): Promise<void> {
//   const user = await getCurrent();
//   const document = await getDocumentById(id);
//   if (document.orgId !== user.orgId) {
//     throw new Error('Unauthorized');
//   }
//   if (!document.requestId) {
//     throw new Error('Document is not bound to a request');
//   }
//   return;
//   const request = await getRequestById(document.requestId);
//   console.log(request);
//   if (!request.data.hasOwnProperty(field)) {
//     console.log(request.data);
//     throw new Error(`Invalid field: ${field}`);
//   }
//   const newData = { ...request.data, [field]: document.id };
//   await updateRequest(
//     request.id,
//     { data: newData },
//     { userId: user.id, type: 'USER' },
//   );
//   revalidatePath('/');
// }

export async function generateFinancialStatement(auditId: AuditId) {
  await _generateFinancialStatement(auditId);
}
