'use server';

import 'server-only';

import { randomUUID } from 'node:crypto';
import { extname } from 'path';
import retry from 'async-retry';
import { revalidatePath, revalidateTag } from 'next/cache';
import { cookies } from 'next/headers';
import * as z from 'zod';

import {
  extractTrialBalance as _extractTrialBalance,
  classifyTrialBalanceTypes,
  updateAccountMappingType,
} from '@/controllers/account-mapping';
import {
  create as _createAudit,
  getById as getAuditById,
  update as updateAuditById,
} from '@/controllers/audit';
import { addDemoData } from '@/controllers/audit-demo';
import {
  create as _createDocument,
  deleteDocument as _deleteDocument,
  getById as getDocumentById,
  process as processDocument,
} from '@/controllers/document';
import { getKV } from '@/controllers/kv';
import { create as addRequestData } from '@/controllers/request-data';
import { getCurrent, UnauthorizedError } from '@/controllers/session-user';
import { getPresignedUrl } from '@/lib/aws';
import { getRequestTypeForId } from '@/lib/request-types';

import type { AccountType } from '@/lib/finance';
import type { AccountBalanceId, AuditId, DocumentId, S3File } from '@/types';

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
  hasDemoData: z.coerce.boolean(),
});

export async function createAudit(rawData: {
  name: string;
  year: string;
  hasDemoData: boolean;
}) {
  const { user } = await getCurrent();
  if (!user) {
    throw new UnauthorizedError();
  }

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
    requestType: 'audit-info',
    requestId: 'year',
    data: { value: data.year },
    actorUserId: user.id,
  });

  if (data.hasDemoData) {
    await addDemoData(audit.id, user.id);
  }

  revalidatePath('/');
  return audit;
}

const auditSchema = z.object({
  name: z.string().min(3).max(72),
});

export async function updateAudit(auditId: AuditId, rawData: { name: string }) {
  const { user } = await getCurrent();
  if (!user) {
    throw new UnauthorizedError();
  }
  const audit = await getAuditById(auditId);
  if (audit.orgId !== user.orgId) {
    throw new UnauthorizedError();
  }

  const { name } = auditSchema.parse(rawData);

  await updateAuditById(auditId, {
    name,
  });

  revalidateTag('client-audit');
  revalidatePath('/');
  return;
}

export async function deleteAudit(auditId: AuditId) {
  const { user } = await getCurrent();
  if (!user) {
    throw new UnauthorizedError();
  }
  const audit = await getAuditById(auditId);
  if (audit.orgId !== user.orgId) {
    throw new UnauthorizedError();
  }

  await updateAuditById(auditId, {
    isDeleted: true,
  });

  revalidateTag('client-audit');
  revalidatePath('/');

  return;
}

const fileSchema = z.object({
  documentId: z.string(),
  key: z.string(),
  bucket: z.string(),
  name: z.string(),
  size: z.number(),
  type: z.string(),
  lastModified: z.number(),
});
export async function createDocument(file: S3File) {
  const { user } = await getCurrent();
  if (!user) {
    throw new UnauthorizedError();
  }

  const data = fileSchema.parse(file);
  const doc = await _createDocument({
    id: data.documentId,
    key: data.key,
    bucket: data.bucket,
    name: data.name,
    size: data.size,
    mimeType: data.type,
    fileLastModified: new Date(data.lastModified),
    orgId: user.orgId,
    uploadedByUserId: user.id,
  });

  // Kick processing off in the background. Do not await
  processDocument(doc.id);

  return {
    id: doc.id,
    key: doc.key,
    name: doc.name,
  };
}

export async function reprocessDocument(id: DocumentId) {
  const { user } = await getCurrent();
  if (!user) {
    throw new UnauthorizedError();
  }
  const doc = await getDocumentById(id);
  if (doc.orgId !== user.orgId) {
    throw new UnauthorizedError();
  }

  await processDocument(id);
}

export async function getDocumentStatus(id: DocumentId) {
  const { user } = await getCurrent();
  if (!user) {
    throw new UnauthorizedError();
  }
  const doc = await getDocumentById(id);
  if (doc.orgId !== user.orgId) {
    throw new UnauthorizedError();
  }
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
  const { user } = await getCurrent();
  if (!user) {
    throw new UnauthorizedError();
  }
  const document = await getDocumentById(id);
  if (document.orgId !== user.orgId) {
    throw new UnauthorizedError();
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
  const { user } = await getCurrent();
  if (!user) {
    throw new UnauthorizedError();
  }
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

export async function getAccountMappingStatus(auditId: AuditId) {
  const { user } = await getCurrent();
  if (!user) {
    throw new UnauthorizedError();
  }
  const audit = await getAuditById(auditId);
  if (audit.orgId !== user.orgId) {
    throw new UnauthorizedError();
  }
  const numToProcess = parseInt(
    (await getKV({
      orgId: audit.orgId,
      auditId: auditId,
      key: 'coa-to-process',
    })) || '0',
  );
  const numToProcessTotal = parseInt(
    (await getKV({
      orgId: audit.orgId,
      auditId: auditId,
      key: 'coa-to-process-total',
    })) || '0',
  );

  return { numToProcess, numToProcessTotal };
}

export async function extractTrialBalance(auditId: AuditId) {
  const { user } = await getCurrent();
  if (!user) {
    throw new UnauthorizedError();
  }
  const audit = await getAuditById(auditId);
  if (audit.orgId !== user.orgId) {
    throw new UnauthorizedError();
  }
  const success = await _extractTrialBalance(auditId);
  console.log('completed extractTrialBalance', success);
  revalidatePath(`/audit/${auditId}/request/trial-balance`);

  // Kick off classification. Don't await this
  classifyTrialBalanceTypes(audit.orgId, auditId);
}

export async function overrideAccountMapping({
  auditId,
  accountBalanceId,
  accountType,
}: {
  auditId: AuditId;
  accountBalanceId: AccountBalanceId;
  accountType: AccountType | null;
}) {
  const { user } = await getCurrent();
  if (!user) {
    throw new UnauthorizedError();
  }
  const audit = await getAuditById(auditId);
  if (audit.orgId !== user.orgId) {
    throw new UnauthorizedError();
  }
  await updateAccountMappingType(accountBalanceId, accountType);
}
