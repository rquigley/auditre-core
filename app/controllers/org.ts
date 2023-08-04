// import 'server-only';

import { db } from '@/lib/db';
import type { OrgUpdate, Org, NewOrg, OrgId } from '@/types';
import { nanoid } from 'nanoid';

type CreateOrg = Omit<NewOrg, 'externalId'>;
export function create(org: CreateOrg): Promise<Org> {
  return db
    .insertInto('org')
    .values({ ...org, externalId: nanoid() })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export function getByExternalId(externalId: string): Promise<Org> {
  return db
    .selectFrom('org')
    .where('externalId', '=', externalId)
    .where('isDeleted', '=', false)
    .selectAll()
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
