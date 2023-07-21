// import 'server-only';
import { db } from '@/lib/db';
import { AuditUpdate, Audit, NewAudit, OrgId } from '@/types';
import { nanoid } from 'nanoid';

export function create(audit: Omit<NewAudit, 'externalId'>): Promise<Audit> {
  return db
    .insertInto('audit')
    .values({ ...audit, externalId: nanoid() })
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

export function getByExternalId(externalId: string): Promise<Audit> {
  return db
    .selectFrom('audit')
    .where('externalId', '=', externalId)
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

export async function update(id: number, updateWith: AuditUpdate) {
  return db.updateTable('audit').set(updateWith).where('id', '=', id).execute();
}
