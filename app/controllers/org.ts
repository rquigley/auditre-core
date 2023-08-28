// import 'server-only';

import { db } from '@/lib/db';
import type { OrgUpdate, Org, NewOrg, OrgId } from '@/types';

export function create(org: NewOrg): Promise<Org> {
  return db
    .insertInto('org')
    .values({ ...org })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export function getById(id: OrgId): Promise<Org> {
  return db
    .selectFrom('org')
    .where('id', '=', id)
    .selectAll()
    .executeTakeFirstOrThrow();
}

export function update(id: OrgId, updateWith: OrgUpdate) {
  return db.updateTable('org').set(updateWith).where('id', '=', id).execute();
}
