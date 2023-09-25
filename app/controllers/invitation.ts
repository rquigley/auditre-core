// import 'server-only';
import { db } from '@/lib/db';
import type {
  Invitation,
  InvitationUpdate,
  NewInvitation,
  OrgId,
} from '@/types';

export function create(invitation: NewInvitation): Promise<Invitation> {
  return db
    .insertInto('invitation')
    .values({ ...invitation })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export function getById(id: string): Promise<Invitation | undefined> {
  return db
    .selectFrom('invitation')
    .where('id', '=', id)
    .where('expiresAt', '>', new Date())
    .selectAll()
    .executeTakeFirst();
}

export function getByEmail(email: string): Promise<Invitation | undefined> {
  return db
    .selectFrom('invitation')
    .where('email', '=', email)
    .where('isUsed', '=', false)
    .where('expiresAt', '>', new Date())
    .selectAll()
    .executeTakeFirst();
}

export function getAllByOrgId(orgId: OrgId): Promise<Invitation[]> {
  return db
    .selectFrom('invitation')
    .where('orgId', '=', orgId)
    .where('isUsed', '=', false)
    .selectAll()
    .execute();
}

export async function update(id: string, updateWith: InvitationUpdate) {
  return db
    .updateTable('invitation')
    .set(updateWith)
    .where('id', '=', id)
    .execute();
}

export async function deleteInvitation(id: string) {
  return db.deleteFrom('invitation').where('id', '=', id).execute();
}
