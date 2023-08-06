// import 'server-only';

import { db } from '@/lib/db';
import type { DocumentUpdate, Document, NewDocument } from '@/types';
import { nanoid } from 'nanoid';

export function create(document: NewDocument): Promise<Document> {
  return db
    .insertInto('document')
    .values({ ...document, externalId: nanoid() })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export function getByExternalId(externalId: string): Promise<Document> {
  return db
    .selectFrom('document')
    .where('externalId', '=', externalId)
    .where('isDeleted', '=', false)
    .selectAll()
    .executeTakeFirstOrThrow();
}

export function getById(id: number): Promise<Document> {
  return db
    .selectFrom('document')
    .where('id', '=', id)
    .selectAll()
    .executeTakeFirstOrThrow();
}

export function update(id: number, updateWith: DocumentUpdate) {
  return db
    .updateTable('document')
    .set(updateWith)
    .where('id', '=', id)
    .execute();
}
