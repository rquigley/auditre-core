// import 'server-only';

import { db } from '@/lib/db';
import type {
  DocumentUpdate,
  Document,
  DocumentId,
  NewDocument,
  OrgId,
  RequestId,
} from '@/types';
import { getExtractedContent } from '@/lib/aws';
import { addJob, completeJob, getAllByDocumentId } from './document-queue';
import { askDefaultQuestions } from '@/controllers/document-query';
import retry from 'async-retry';

export function create(document: NewDocument): Promise<Document> {
  return db
    .insertInto('document')
    .values({ ...document })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export function getById(id: DocumentId): Promise<Document> {
  return db
    .selectFrom('document')
    .where('id', '=', id)
    .where('isDeleted', '=', false)
    .selectAll()
    .executeTakeFirstOrThrow();
}

export function getAllByOrgId(orgId: OrgId): Promise<Document[]> {
  return db
    .selectFrom('document')
    .where('orgId', '=', orgId)
    .where('isDeleted', '=', false)
    .selectAll()
    .execute();
}

export function getAllByRequestId(requestId: RequestId): Promise<Document[]> {
  return db
    .selectFrom('document')
    .where('requestId', '=', requestId)
    .where('isDeleted', '=', false)
    .selectAll()
    .execute();
}

export function update(id: DocumentId, updateWith: DocumentUpdate) {
  return db
    .updateTable('document')
    .set(updateWith)
    .where('id', '=', id)
    .execute();
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
