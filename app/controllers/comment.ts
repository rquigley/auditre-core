import { db } from '@/lib/db';
import type {
  DocumentId,
  CommentId,
  Comment,
  CommentUpdate,
  NewComment,
  RequestId,
} from '@/types';

export function create(comment: NewComment): Promise<Comment> {
  return db
    .insertInto('comment')
    .values({ ...comment })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export function getById(id: CommentId): Promise<Comment> {
  return db
    .selectFrom('comment')
    .where('id', '=', id)
    .where('isDeleted', '=', false)
    .selectAll()
    .executeTakeFirstOrThrow();
}

export function getAllByDocumentId(documentId: DocumentId): Promise<Comment[]> {
  return db
    .selectFrom('comment')
    .where('documentId', '=', documentId)
    .where('isDeleted', '=', false)
    .selectAll()
    .execute();
}

export function getAllByRequestId(requestId: RequestId): Promise<Comment[]> {
  return db
    .selectFrom('comment')
    .where('requestId', '=', requestId)
    .where('isDeleted', '=', false)
    .selectAll()
    .execute();
}

export function update(id: CommentId, updateWith: CommentUpdate) {
  return db
    .updateTable('comment')
    .set(updateWith)
    .where('id', '=', id)
    .execute();
}
