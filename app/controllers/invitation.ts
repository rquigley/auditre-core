import { db } from '@/lib/db';

import type {
  Invitation,
  InvitationUpdate,
  NewInvitation,
  OrgId,
} from '@/types';

export async function create(invitation: NewInvitation): Promise<Invitation> {
  return await db
    .insertInto('invitation')
    .values({ ...invitation })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function getById(id: string): Promise<Invitation | undefined> {
  return await db
    .selectFrom('invitation')
    .where('id', '=', id)
    .where('expiresAt', '>', new Date())
    .selectAll()
    .executeTakeFirst();
}

export async function getByEmail(
  email: string,
): Promise<Invitation | undefined> {
  return await db
    .selectFrom('invitation')
    .where('email', '=', email)
    .where('isUsed', '=', false)
    .where('expiresAt', '>', new Date())
    .selectAll()
    .executeTakeFirst();
}

export async function getAllByOrgId(orgId: OrgId): Promise<Invitation[]> {
  return await db
    .selectFrom('invitation')
    .where('orgId', '=', orgId)
    .where('isUsed', '=', false)
    .selectAll()
    .execute();
}

export async function update(id: string, updateWith: InvitationUpdate) {
  return await db
    .updateTable('invitation')
    .set(updateWith)
    .where('id', '=', id)
    .execute();
}

export async function deleteInvitation(id: string) {
  return await db.deleteFrom('invitation').where('id', '=', id).execute();
}
