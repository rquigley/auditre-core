// import 'server-only';

import { db } from '@/lib/db';
import type {
  DocumentUpdate,
  Document,
  DocumentId,
  NewDocument,
  OrgId,
} from '@/types';
import { getExtractedContent } from '@/lib/aws';

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

export function update(id: DocumentId, updateWith: DocumentUpdate) {
  return db
    .updateTable('document')
    .set(updateWith)
    .where('id', '=', id)
    .execute();
}

export async function updateWithExtractedData(
  id: DocumentId,
): Promise<Document> {
  const document = await getById(id);
  const content = await getExtractedContent({
    bucket: document.bucket,
    key: document.key,
  });
  if (!content) {
    throw new Error('No data found');
  }
  await update(id, { extracted: content });
  return getById(id);
}
