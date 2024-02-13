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
    .execute();
}
