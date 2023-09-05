import { db } from '@/lib/db';
import type {
  DocumentQueryUpdate,
  DocumentQuery,
  DocumentQueryId,
  NewDocumentQuery,
  DocumentId,
} from '@/types';

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
