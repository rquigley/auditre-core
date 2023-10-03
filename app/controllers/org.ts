import { db } from '@/lib/db';

import type { NewOrg, Org, OrgId, OrgUpdate } from '@/types';

export async function create(org: NewOrg): Promise<Org> {
  return await db
    .insertInto('org')
    .values({ ...org })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function getById(id: OrgId): Promise<Org> {
  return await db
    .selectFrom('org')
    .where('id', '=', id)
    .selectAll()
    .executeTakeFirstOrThrow();
}

export async function update(id: OrgId, updateWith: OrgUpdate) {
  return await db
    .updateTable('org')
    .set(updateWith)
    .where('id', '=', id)
    .execute();
}
