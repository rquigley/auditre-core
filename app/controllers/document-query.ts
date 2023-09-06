import { db } from '@/lib/db';
import type {
  DocumentQueryUpdate,
  DocumentQuery,
  DocumentQueryId,
  DocumentQueryResult,
  NewDocumentQuery,
  DocumentId,
  Document,
} from '@/types';
import { askQuestion as OpenAIAskQuestion } from '@/lib/ai';

export function create(
  documentQuery: NewDocumentQuery,
): Promise<DocumentQuery> {
  return db
    .insertInto('documentQuery')
    .values({ ...documentQuery })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export function getById(id: DocumentQueryId): Promise<DocumentQuery> {
  return db
    .selectFrom('documentQuery')
    .where('id', '=', id)
    .where('isDeleted', '=', false)
    .selectAll()
    .executeTakeFirstOrThrow();
}

export function getAllByDocumentId(
  documentId: DocumentId,
): Promise<DocumentQuery[]> {
  return db
    .selectFrom('documentQuery')
    .where('documentId', '=', documentId)
    .where('isDeleted', '=', false)
    .selectAll()
    .execute();
}

export function update(id: DocumentQueryId, updateWith: DocumentQueryUpdate) {
  return db
    .updateTable('documentQuery')
    .set(updateWith)
    .where('id', '=', id)
    .execute();
}

export async function askQuestion(
  document: Document,
  question: string,
): Promise<DocumentQuery> {
  if (!document.extracted) {
    throw new Error('Document not extracted yet');
  }

  const { message, model } = await OpenAIAskQuestion({
    question,
    content: document.extracted,
  });
  return await create({
    documentId: document.id,
    model,
    query: question,
    result: message as DocumentQueryResult,
  });
}
