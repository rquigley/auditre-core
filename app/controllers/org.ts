import { db } from '@/lib/db';

import type { NewOrg, OrgId, OrgUpdate } from '@/types';

export async function createOrg(org: NewOrg) {
  return await db
    .insertInto('org')
    .values({ ...org })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function getOrgById(id: OrgId) {
  return await db
    .selectFrom('org')
    .where('id', '=', id)
    .selectAll()
    .executeTakeFirstOrThrow();
}

export async function updateOrg(id: OrgId, updateWith: OrgUpdate) {
  return await db
    .updateTable('org')
    .set(updateWith)
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function getOrgsWithMeta(ids: OrgId[]) {
  return await db
    .selectFrom('org as o')
    .leftJoin('auth.userRole as ur', 'o.id', 'ur.orgId')
    .leftJoin('auth.user as u', 'ur.userId', 'u.id')
    .leftJoin('audit as a', 'o.id', 'a.orgId')
    .select(({ fn }) => [
      'o.id',
      'o.name',
      'o.canHaveChildOrgs',
      fn.count<number>('a.id').as('auditCount'),
      fn.count<number>('u.id').as('userCount'),
    ])
    .where('o.id', 'in', ids)
    .where('o.isDeleted', '=', false)
    .where('u.isDeleted', '=', false)
    .groupBy('o.id')
    .orderBy('name')
    .execute();
}

export async function getChildOrgsWithMeta(id: OrgId) {
  return await db
    .selectFrom('org as o')
    .leftJoin('auth.userRole as ur', 'o.id', 'ur.orgId')
    .leftJoin('auth.user as u', 'ur.userId', 'u.id')
    .leftJoin('audit as a', 'o.id', 'a.orgId')
    .select(({ fn }) => [
      'o.id',
      'o.name',
      'o.canHaveChildOrgs',
      fn.count<number>('a.id').as('auditCount'),
      fn.count<number>('u.id').as('userCount'),
    ])
    .where('o.parentOrgId', '=', id)
    .where('o.isDeleted', '=', false)
    .where('u.isDeleted', '=', false)
    .groupBy('o.id')
    .orderBy('name')
    .execute();
}
