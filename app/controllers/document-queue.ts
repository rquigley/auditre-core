import { db } from '@/lib/db';
import type {
  DocumentQueueUpdate,
  DocumentQueue,
  DocumentQueueId,
  NewDocumentQueue,
  DocumentId,
} from '@/types';

export function addJob(
  documentQueue: NewDocumentQueue,
): Promise<DocumentQueue> {
  return db
    .insertInto('documentQueue')
    .values({ ...documentQueue })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export function getById(id: DocumentQueueId): Promise<DocumentQueue> {
  return db
    .selectFrom('documentQueue')
    .where('id', '=', id)
    .selectAll()
    .executeTakeFirstOrThrow();
}

export function getAllByDocumentId(
  documentId: DocumentId,
): Promise<DocumentQueue[]> {
  return db
    .selectFrom('documentQueue')
    .where('documentId', '=', documentId)
    .selectAll()
    .execute();
}

export function update(id: DocumentQueueId, updateWith: DocumentQueueUpdate) {
  return db
    .updateTable('documentQueue')
    .set(updateWith)
    .where('id', '=', id)
    .execute();
}

export async function completeJob(id: DocumentQueueId): Promise<void> {
  await db.deleteFrom('documentQueue').where('id', '=', id).execute();
}
