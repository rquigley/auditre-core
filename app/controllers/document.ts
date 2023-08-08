// import 'server-only';

import { db } from '@/lib/db';
import type { DocumentUpdate, Document, NewDocument, OrgId } from '@/types';
import { nanoid } from 'nanoid';
import { extractData } from '@/lib/text-extraction';

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

export function update(id: number, updateWith: DocumentUpdate) {
  return db
    .updateTable('document')
    .set(updateWith)
    .where('id', '=', id)
    .execute();
}

export async function extractContent(id: number): Promise<Document> {
  const document = await getById(id);
  const data = await extractData({
    key: document.key,
    bucket: document.bucket,
    mimeType: document.type,
  });
  //console.log(data);

  return db
    .updateTable('document')
    .set({ extracted: { data } })
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirstOrThrow();
}
