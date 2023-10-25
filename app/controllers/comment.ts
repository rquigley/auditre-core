import { db } from '@/lib/db';

import type {
  AuditId,
  Comment,
  CommentId,
  CommentUpdate,
  DocumentId,
  NewComment,
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

type CommentWithUser = {
  userId: string;
  createdAt: Date;
  comment: string;
  name: string | null;
  image: string | null;
};

export async function getAllForRequest(
  auditId: AuditId,
  requestType: string,
): Promise<CommentWithUser[]> {
  return await db
    .selectFrom('comment')
    .leftJoin('user', 'comment.userId', 'user.id')
    .select([
      'comment.userId',
      'comment.createdAt',
      'comment.comment',
      'user.name',
      'user.image',
    ])
    .where('comment.auditId', '=', auditId)
    .where('comment.requestType', '=', requestType)
    .where('comment.isDeleted', '=', false)
    .execute();
}

export async function update(id: CommentId, updateWith: CommentUpdate) {
  return await db
    .updateTable('comment')
    .set(updateWith)
    .where('id', '=', id)
    .execute();
}
