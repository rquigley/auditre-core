import { db } from '@/lib/db';
import type { Audit, AuditId, AuditUpdate, NewAudit, OrgId } from '@/types';

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

export type AuditWithRequestCounts = Audit & {
  numCompletedRequests: number;
  numRequests: number;
};
export function getAllByOrgId(orgId: OrgId): Promise<AuditWithRequestCounts[]> {
  return db
    .selectFrom('audit')
    .innerJoin('request', 'audit.id', 'request.auditId')

    .where('audit.orgId', '=', orgId)
    .where('audit.isDeleted', '=', false)
    .where('request.isDeleted', '=', false)
    .groupBy('audit.id')
    .selectAll('audit')
    .select((eb) =>
      eb.fn
        .count<number>('request.id')
        .filterWhere('request.status', '=', 'complete')
        .as('numCompletedRequests'),
    )
    .select((eb) => eb.fn.count<number>('request.id').as('numRequests'))
    .execute();
}

export function getAll(): Promise<Audit[]> {
  return db.selectFrom('audit').selectAll().execute();
}

export async function update(id: AuditId, updateWith: AuditUpdate) {
  return db.updateTable('audit').set(updateWith).where('id', '=', id).execute();
}
