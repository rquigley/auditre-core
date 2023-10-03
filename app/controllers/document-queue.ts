import { db } from '@/lib/db';

import type {
  DocumentId,
  DocumentQueue,
  DocumentQueueId,
  DocumentQueueUpdate,
  NewDocumentQueue,
} from '@/types';

export async function addJob(
  documentQueue: NewDocumentQueue,
): Promise<DocumentQueue> {
  return await db
    .insertInto('documentQueue')
    .values({ ...documentQueue })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function getById(id: DocumentQueueId): Promise<DocumentQueue> {
  return await db
    .selectFrom('documentQueue')
    .where('id', '=', id)
    .selectAll()
    .executeTakeFirstOrThrow();
}

export async function getAllByDocumentId(
  documentId: DocumentId,
): Promise<DocumentQueue[]> {
  return await db
    .selectFrom('documentQueue')
    .where('documentId', '=', documentId)
    .selectAll()
    .execute();
}

export async function update(
  id: DocumentQueueId,
  updateWith: DocumentQueueUpdate,
) {
  return await db
    .updateTable('documentQueue')
    .set(updateWith)
    .where('id', '=', id)
    .execute();
}

export async function completeJob(id: DocumentQueueId): Promise<void> {
  await db.deleteFrom('documentQueue').where('id', '=', id).execute();
}
