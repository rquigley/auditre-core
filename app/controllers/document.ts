import retry from 'async-retry';

// import { inferSchema, initParser } from 'udsv';
// import { string } from 'zod';

import { create as createMapping } from '@/controllers/account-mapping';
import {
  askDefaultQuestions,
  getByDocumentIdAndIdentifier,
} from '@/controllers/document-query';
import { getExtractedContent } from '@/lib/aws';
import { db } from '@/lib/db';
import { addJob, completeJob, getAllByDocumentId } from './document-queue';

import type {
  AccountType,
  AuditId,
  Document,
  DocumentId,
  DocumentUpdate,
  NewDocument,
  OrgId,
  RequestId,
} from '@/types';

export async function create(document: NewDocument): Promise<Document> {
  return await db
    .insertInto('document')
    .values({ ...document })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function getById(id: DocumentId): Promise<Document> {
  return await db
    .selectFrom('document')
    .where('id', '=', id)
    .where('isDeleted', '=', false)
    .selectAll()
    .executeTakeFirstOrThrow();
}

export async function getAllByOrgId(orgId: OrgId): Promise<Document[]> {
  return await db
    .selectFrom('document')
    .where('orgId', '=', orgId)
    .where('isDeleted', '=', false)
    .selectAll()
    .execute();
}

export async function getAllByRequestId(
  requestId: RequestId,
): Promise<Document[]> {
  return await db
    .selectFrom('document')
    .where('requestId', '=', requestId)
    .where('isDeleted', '=', false)
    .selectAll()
    .execute();
}

export async function update(id: DocumentId, updateWith: DocumentUpdate) {
  return await db
    .updateTable('document')
    .set(updateWith)
    .where('id', '=', id)
    .execute();
}

export async function deleteDocument(id: DocumentId) {
  return await update(id, { isDeleted: true });
}

export async function extractAndUpdateContent(id: DocumentId) {
  const document = await getById(id);
  const content = await getExtractedContent({
    bucket: document.bucket,
    key: document.key,
  });
  if (!content) {
    throw new Error('No data found');
  }
  await update(id, { extracted: content });
}

export async function process(id: DocumentId): Promise<void> {
  // TODO: separate out job creation from actual work
  await update(id, { isProcessed: false });

  const extractJob = await addJob({ documentId: id, status: 'TO_EXTRACT' });
  await retry(
    // TODO: bail should change to error
    async (bail) => {
      return await extractAndUpdateContent(id);
    },
    { minTimeout: 700 },
  );
  await completeJob(extractJob.id);

  const askQuestionsJob = await addJob({
    documentId: id,
    status: 'TO_ASK_DEFAULT_QUESTIONS',
  });

  const document = await getById(id);
  await askDefaultQuestions(document);
  await completeJob(askQuestionsJob.id);

  // const docType = await getType(id);
  // // What should we do if we don't have extracted info?
  // if (docType === 'CHART_OF_ACCOUNTS') {
  //   await extractChartOfAccountsMapping(document);
  // }

  await update(id, { isProcessed: true });
}

export type DocumentStatus = 'COMPLETE' | 'INCOMPLETE';
export async function getStatus(
  id: DocumentId,
): Promise<{ status: DocumentStatus }> {
  const queueJobs = await getAllByDocumentId(id);
  if (queueJobs.length === 0) {
    return {
      status: 'COMPLETE',
    };
  }
  return {
    status: 'INCOMPLETE',
  };
}

export type DocumentType =
  | 'ARTICLES_OF_INCORPORATION'
  | 'BYLAWS'
  | 'TRIAL_BALANCE'
  | 'CHART_OF_ACCOUNTS'
  | 'STOCK_PLAN'
  | 'UNKNOWN';
export async function getType(id: DocumentId): Promise<DocumentType> {
  const typeQuery = await getByDocumentIdAndIdentifier(id, 'DOCUMENT_TYPE');
  if (!typeQuery || !typeQuery.result) {
    return 'UNKNOWN';
  }
  return typeQuery.result.content as unknown as DocumentType;
}

export async function extractChartOfAccountsMapping(
  document: Document,
  auditId: AuditId,
) {
  if (!document.extracted) {
    return;
  }
  const mappingQuery = await getByDocumentIdAndIdentifier(
    document.id,
    'ACCOUNT_MAPPING',
  );
  if (!mappingQuery || !mappingQuery.result) {
    return;
  }

  // const accountNameColumn = await getByDocumentIdAndIdentifier(
  //   document.id,
  //   'ACCOUNT_MAPPING',
  // );
  // if (!mappingQuery || !mappingQuery.result) {
  //   return;
  // }

  // let schema = inferSchema(document.extracted);
  // let parser = initParser(schema);

  // let stringArrs = parser.stringArrs(document.extracted);

  // console.log(stringArrs);

  let mapping;
  try {
    mapping = JSON.parse(mappingQuery.result.content) as {
      name: string;
      type: AccountType | null;
    }[];
  } catch (e) {
    if (e instanceof SyntaxError) {
      throw new Error('Invalid JSON');
    }
  }
  if (!mapping || !mapping.length) {
    return;
  }

  const amPromises = mapping.map(({ name, type }) => {
    return createMapping({
      documentId: document.id,
      orgId: document.orgId,
      auditId: auditId,
      accountId: name,
      accountMappedTo: type,
    });
  });

  await Promise.allSettled(amPromises);
  await Promise.all(amPromises);
}
