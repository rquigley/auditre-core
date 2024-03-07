import { db } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { getOrgById } from './org';

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

export async function getInvitationsByEmail(email: string) {
  return await db
    .selectFrom('auth.invitation')
    .where('email', '=', email)
    .where('expiresAt', '>', new Date())
    .select(['id', 'orgId'])
    .execute();
}

export async function getInvitationsByOrgId(orgId: OrgId) {
  return await db
    .selectFrom('auth.invitation')
    .where('orgId', '=', orgId)
    .selectAll()
    .execute();
}

export async function getInvitationByOrgAndEmail(orgId: OrgId, email: string) {
  return await db
    .selectFrom('auth.invitation')
    .where('orgId', '=', orgId)
    .where('email', '=', email)
    .selectAll()
    .executeTakeFirst();
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

export async function deleteInvitationsByEmail(email: string) {
  return await db
    .deleteFrom('auth.invitation')
    .where('email', '=', email)
    .execute();
}

export async function sendInviteEmail(inviteId: InvitationId) {
  const invite = await getInvitationById(inviteId);
  if (!invite) {
    throw new Error('Invitation not found');
  }
  const org = await getOrgById(invite.orgId);
  if (!org) {
    throw new Error('Organization not found');
  }

  const inviteLink = getInviteLink(invite);
  const html = `
    <p>You have been invited to join ${org.name} on AuditRe</p>
    <p>
      <a href="${inviteLink}">Click here to accept the invitation</a>
    </p>
  `;

  const plainText = `
    You have been invited to join ${org.name} on AuditRe.

    Visit ${inviteLink} to accept the invitation.
  `;

  // TODO: Remove this debug log
  console.log(`DEBUG, sendInviteEmail: ${inviteLink}`);

  await sendEmail({
    from: 'noreply@auditre.co',
    to: invite.email,
    subject: `You have been invited to join ${org.name} on AuditRe`,
    html,
    plainText,
  });
}

export function getInviteLink(invite: { id: InvitationId; email: string }) {
  return `${process.env.BASE_URL}/invite?id=${invite.id}&email=${encodeURIComponent(invite.email)}`;
}
