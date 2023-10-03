import { db } from '@/lib/db';

import type {
  Comment,
  CommentId,
  CommentUpdate,
  DocumentId,
  NewComment,
  RequestId,
} from '@/types';

export async function create(comment: NewComment): Promise<Comment> {
  return await db
    .insertInto('comment')
    .values({ ...comment })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function getById(id: CommentId): Promise<Comment> {
  return await db
    .selectFrom('comment')
    .where('id', '=', id)
    .where('isDeleted', '=', false)
    .selectAll()
    .executeTakeFirstOrThrow();
}

export async function getAllByDocumentId(
  documentId: DocumentId,
): Promise<Comment[]> {
  return await db
    .selectFrom('comment')
    .where('documentId', '=', documentId)
    .where('isDeleted', '=', false)
    .selectAll()
    .execute();
}

export async function getAllByRequestId(
  requestId: RequestId,
): Promise<Comment[]> {
  return await db
    .selectFrom('comment')
    .where('requestId', '=', requestId)
    .where('isDeleted', '=', false)
    .selectAll()
    .execute();
}

export async function update(id: CommentId, updateWith: CommentUpdate) {
  return await db
    .updateTable('comment')
    .set(updateWith)
    .where('id', '=', id)
    .execute();
}
