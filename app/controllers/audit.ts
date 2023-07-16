import { db } from '@/lib/db';
import { AuditUpdate, Audit, NewAudit, OrgId } from '@/types';
import { nanoid } from 'nanoid';

export function create(audit: NewAudit): Promise<Audit> {
  if (!audit.externalId) {
    audit.externalId = nanoid();
  }
  return db
    .insertInto('audit')
    .values(audit)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export function getById(id: OrgId): Promise<Audit> {
  return db
    .selectFrom('audit')
    .where('id', '=', id)
    .selectAll()
    .executeTakeFirstOrThrow();
}

export function getAllByOrgId(orgId: OrgId): Promise<Audit[]> {
  return db
    .selectFrom('audit')
    .where('orgId', '=', orgId)
    .where('isDeleted', '=', false)
    .selectAll()
    .execute();
}

export async function update(id: number, updateWith: AuditUpdate) {
  return db.updateTable('audit').set(updateWith).where('id', '=', id).execute();
}
