import { db } from '@/lib/db';

import type {
  AccountMapping,
  AccountMappingId,
  AccountMappingUpdate,
  AuditId,
  NewAccountMapping,
} from '@/types';

export function create(
  accountMapping: NewAccountMapping,
): Promise<AccountMapping | undefined> {
  return db
    .insertInto('accountMapping')
    .values({ ...accountMapping })
    .onConflict((oc) =>
      oc.columns(['accountId', 'documentId', 'auditId']).doNothing(),
    )
    .returningAll()
    .executeTakeFirst();
}

export function getById(id: AccountMappingId): Promise<AccountMapping> {
  return db
    .selectFrom('accountMapping')
    .where('id', '=', id)
    .where('isDeleted', '=', false)
    .selectAll()
    .executeTakeFirstOrThrow();
}

export function getAllByAuditId(auditId: AuditId): Promise<AccountMapping[]> {
  return db
    .selectFrom('accountMapping')
    .where('auditId', '=', auditId)
    .where('isDeleted', '=', false)
    .selectAll()
    .execute();
}

export function update(id: AccountMappingId, updateWith: AccountMappingUpdate) {
  return db
    .updateTable('accountMapping')
    .set(updateWith)
    .where('id', '=', id)
    .execute();
}
