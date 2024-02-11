import { db } from '@/lib/db';
import { sendEmail } from '@/lib/email';

import type {
  InvitationId,
  InvitationUpdate,
  NewInvitation,
  OrgId,
} from '@/types';

export async function createInvitation(invitation: NewInvitation) {
  return await db
    .insertInto('auth.invitation')
    .values({ ...invitation })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function getInvitationById(id: InvitationId) {
  return await db
    .selectFrom('auth.invitation')
    .where('id', '=', id)
    .where('expiresAt', '>', new Date())
    .selectAll()
    .executeTakeFirst();
}

export async function getInvitationByEmail(email: string) {
  return await db
    .selectFrom('auth.invitation')
    .where('email', '=', email)
    .where('isUsed', '=', false)
    .where('expiresAt', '>', new Date())
    .selectAll()
    .executeTakeFirst();
}

export async function getInvitationsByOrgId(orgId: OrgId) {
  return await db
    .selectFrom('auth.invitation')
    .where('orgId', '=', orgId)
    .where('isUsed', '=', false)
    .selectAll()
    .execute();
}

export async function updateInvitation(
  id: InvitationId,
  updateWith: InvitationUpdate,
) {
  return await db
    .updateTable('auth.invitation')
    .set(updateWith)
    .where('id', '=', id)
    .execute();
}

export async function deleteInvitation(id: InvitationId) {
  return await db.deleteFrom('auth.invitation').where('id', '=', id).execute();
}

export async function sendInviteEmail(inviteId: InvitationId) {
  const invite = await getInvitationById(inviteId);
  if (!invite) {
    throw new Error('Invitation not found');
  }
  await sendEmail({
    to: invite.email,
    subject: 'You have been invited to join an organization',
    html: `
    <p>You have been invited to join an organization.</p>
    <p>
      <a href="${process.env.NEXTAUTH_URL}/invite?id=${invite.id}&email=${encodeURIComponent(invite.email)}">Click here to accept the invitation</a>
    </p>
  `,
  });
}
