import { db } from '@/lib/db';
import type { AuditId, AuditUpdate, Audit, NewAudit, OrgId } from '@/types';

export function create(audit: NewAudit): Promise<Audit> {
  return db
    .insertInto('audit')
    .values({ ...audit })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export function getById(id: OrgId): Promise<Audit> {
  return db
    .selectFrom('audit')
    .where('id', '=', id)
    .where('isDeleted', '=', false)
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

export function getAll(): Promise<Audit[]> {
  return db.selectFrom('audit').selectAll().execute();
}

export async function update(id: AuditId, updateWith: AuditUpdate) {
  return db.updateTable('audit').set(updateWith).where('id', '=', id).execute();
}
