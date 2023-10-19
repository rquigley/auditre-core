import { db } from '@/lib/db';

import type { Audit, AuditId, AuditUpdate, NewAudit, OrgId } from '@/types';

export async function create(audit: NewAudit): Promise<Audit> {
  return await db
    .insertInto('audit')
    .values({ ...audit })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function getById(
  id: OrgId,
  params?: { includeDeleted?: boolean },
): Promise<Audit> {
  let query = db.selectFrom('audit').where('id', '=', id);
  if (!params?.includeDeleted) {
    query = query.where('isDeleted', '=', false);
  }
  return await query.selectAll().executeTakeFirstOrThrow();
}

export type AuditWithRequestCounts = Audit & {
  numCompletedRequests: number;
  numRequests: number;
};
export async function getAllByOrgId(
  orgId: OrgId,
): Promise<AuditWithRequestCounts[]> {
  return await db
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
    .orderBy(['audit.year desc', 'audit.name asc'])
    .execute();
}

export async function getAll(): Promise<Audit[]> {
  return await db.selectFrom('audit').selectAll().execute();
}

export async function update(id: AuditId, updateWith: AuditUpdate) {
  return await db
    .updateTable('audit')
    .set(updateWith)
    .where('id', '=', id)
    .execute();
}
