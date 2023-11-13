import { ChevronRightIcon } from '@heroicons/react/20/solid';
import { revalidatePath } from 'next/cache';
import Image from 'next/image';
import Link from 'next/link';
import { z } from 'zod';

import { Content } from '@/components/content';
import Datetime from '@/components/datetime';
import { Header } from '@/components/header';
import {
  create as createInvitation,
  deleteInvitation,
  getAllByOrgId as getInvitations,
} from '@/controllers/invitation';
import { getCurrent, UnauthorizedError } from '@/controllers/session-user';
import { getAllByOrgId as getUsers } from '@/controllers/user';
import { classNames } from '@/lib/util';
import InviteSubmenu from './invite-submenu';
import NewInviteForm from './new-invite-form';

import type { Invitation, User } from '@/types';

const createInviteSchema = z.object({
  email: z.string().email(),
});
const deleteInviteSchema = z.object({
  inviteId: z.string(),
});

export default async function OrganizationSettingsPage() {
  const { user, authRedirect } = await getCurrent();
  if (!user) {
    return authRedirect();
  }
  const users = await getUsers(user.orgId);
  const invitations = await getInvitations(user.orgId);

  async function createInvite(prevState: any, formData: FormData) {
    'use server';
    try {
      const { user } = await getCurrent();
      if (!user) {
        throw new UnauthorizedError();
      }
      const data = createInviteSchema.parse({
        email: formData.get('email'),
      });

      await createInvitation({
        email: data.email,
        orgId: user.orgId,
      });
      revalidatePath('/organization-settings');
      return { message: `Invited ${data.email}` };
    } catch (error) {
      return { message: 'Failed to create invite' };
    }
  }

  return (
    <>
      <Header title="Organization Settings" />
      <Content pad={true}>
        <div className="mb-4">
          <div className="font-lg border-b pb-1 mb-3">Users</div>

          <Users users={users} />
        </div>

        <div className="mb-4">
          <div className="font-lg border-b pb-1 mb-3">Invitations</div>
          <Invitations invitations={invitations} />
          <NewInviteForm createInvite={createInvite} />
        </div>
      </Content>
    </>
  );
}

function Users({ users }: { users: User[] }) {
  return (
    <ul role="list" className="divide-y divide-gray-100">
      {users.map((user) => (
        <li
          key={user.email}
          className="relative flex justify-between gap-x-6 py-5"
        >
          <div className="flex min-w-0 gap-x-4">
            {user.image && (
              <Image
                className="h-12 w-12 flex-none rounded-full bg-gray-50"
                src={user.image}
                width="36"
                height="36"
                alt=""
              />
            )}
            <div className="min-w-0 flex-auto">
              <p className="text-sm font-semibold leading-6 text-gray-900">
                <Link href={`/organization-settings/user/${user.id}`}>
                  <span className="absolute inset-x-0 -top-px bottom-0" />
                  {user.name}
                </Link>
              </p>
              <p className="mt-1 flex text-xs leading-5 text-gray-500">
                <span className="relative truncate">{user.email}</span>
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-x-4">
            <div className="hidden sm:flex sm:flex-col sm:items-end">
              {/* <p className="text-sm leading-6 text-gray-900">{user.role}</p>
              {user.lastSeen ? (
                <p className="mt-1 text-xs leading-5 text-gray-500">
                  Last seen{' '}
                  <time dateTime={user.lastSeenDateTime}>{user.lastSeen}</time>
                </p>
              ) : null} */}
            </div>
            <ChevronRightIcon
              className="h-5 w-5 flex-none text-gray-400"
              aria-hidden="true"
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
function Invitations({ invitations }: { invitations: Invitation[] }) {
  async function deleteInvite(prevState: any, formData: FormData) {
    'use server';
    try {
      const data = deleteInviteSchema.parse({
        inviteId: formData.get('inviteId'),
      });

      await deleteInvitation(data.inviteId);

      revalidatePath('/organization-settings');
      return { message: `Deleted` };
    } catch (error) {
      return { message: 'Failed to delete invite' };
    }
  }

  const now = Date.now();
  return (
    <ul role="list" className="divide-y divide-gray-100">
      {invitations.map((user) => {
        const isExpired = user.expiresAt.getTime() - now < 0;
        return (
          <li
            key={user.id}
            className="relative flex justify-between gap-x-6 py-5"
          >
            <div className="flex min-w-0 gap-x-4">
              <div className="min-w-0 flex-auto">
                <p className="text-sm font-semibold leading-6 text-gray-900">
                  <span className="absolute inset-x-0 -top-px bottom-0" />
                  {user.email}
                </p>
                <p
                  className={classNames(
                    isExpired ? 'text-red-700' : '',
                    'mt-1 flex text-xs leading-5 text-gray-500',
                  )}
                >
                  <span className="mr-1">
                    {isExpired ? 'Expired ' : 'Expires '}
                  </span>
                  <Datetime dateTime={user.expiresAt} />
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-x-4">
              <InviteSubmenu invitation={user} deleteInvite={deleteInvite} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
