// import 'server-only';

import { db } from '@/lib/db';
import type {
  DocumentUpdate,
  Document,
  DocumentId,
  NewDocument,
  OrgId,
} from '@/types';
import { extractData } from '@/lib/text-extraction';

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

export async function extractContent(id: DocumentId): Promise<Document> {
  const document = await getById(id);
  const data = await extractData({
    key: document.key,
    bucket: document.bucket,
    mimeType: document.type,
  });
  //console.log(data);

  return (
    db
      .updateTable('document')
      //@ts-ignore
      .set({ extracted: { data } })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow()
  );
}
