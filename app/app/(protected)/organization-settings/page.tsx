import { ChevronRightIcon } from '@heroicons/react/20/solid';
import clsx from 'clsx';
import Image from 'next/image';

import { Content } from '@/components/content';
import Datetime from '@/components/datetime';
import { Header } from '@/components/header';
import { getInvitationsByOrgId } from '@/controllers/invitation';
import {
  getAvailableRolesForRole,
  getCurrent,
  UnauthorizedError,
} from '@/controllers/session-user';
import { getAllByOrgId as getUsers } from '@/controllers/user';
import InviteSubmenu from './invite-submenu';
import NewInviteForm from './new-invite-form';
import { RoleSelector } from './role-selector';

import type { User as CurrentUser } from '@/controllers/session-user';
import type { Invitation } from '@/types';

type User = Awaited<ReturnType<typeof getUsers>>[number];

export default async function OrganizationSettingsPage() {
  const { user, authRedirect } = await getCurrent();
  if (!user) {
    return authRedirect();
  }
  const orgId = user.orgId;
  const users = await getUsers(orgId);
  const invitations = await getInvitationsByOrgId(orgId);

  return (
    <>
      <Header title="Organization Settings" />
      <Content pad={true}>
        <div className="mb-4 max-w-2xl">
          <div className="font-lg mb-3 border-b pb-1">Users</div>

          <Users users={users} currentUser={user} />
        </div>

        <div className="mb-4 max-w-2xl">
          <div className="font-lg mb-3 border-b pb-1">Invitations</div>
          <Invitations invitations={invitations} />
          <NewInviteForm />
        </div>
      </Content>
    </>
  );
}

async function Users({
  users,
  currentUser,
}: {
  users: User[];
  currentUser: CurrentUser;
}) {
  const { user } = await getCurrent();
  if (!user) {
    throw new UnauthorizedError();
  }

  const availableRoles = getAvailableRolesForRole(user.role);

  return (
    <ul role="list" className="divide-y divide-gray-100">
      {users.length === 0 && (
        <div className="mb-8 text-xs text-slate-700">No users</div>
      )}
      {users.map((user) => (
        <li
          key={user.email}
          className="relative flex max-w-xl justify-between gap-x-2 pb-5 pt-3"
        >
          <div className="flex min-w-0 gap-x-4">
            {user.image ? (
              <Image
                className="h-12 w-12 flex-none rounded-full bg-gray-50"
                src={user.image}
                width="36"
                height="36"
                alt=""
              />
            ) : (
              <div className="h-12 w-12 flex-none rounded-full bg-gray-200" />
            )}
            <div className="min-w-0 flex-auto">
              <p className="text-sm font-semibold leading-6 text-gray-900">
                {/* <Link href={`/organization-settings/user/${user.id}`}> */}
                {/* <span className="absolute inset-x-0 -top-px bottom-0" /> */}
                {user.name || user.email?.substring(0, user.email.indexOf('@'))}
                {/* </Link> */}
              </p>
              <p className="mt-1 flex text-xs leading-5 text-gray-500">
                <span className="relative truncate">{user.email}</span>
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-x-4">
            <div className="hidden sm:flex sm:flex-col sm:items-end">
              {currentUser.hasPerm('org:manage-users') &&
              currentUser.id !== user.id ? (
                <RoleSelector
                  userId={user.id}
                  userRole={user.role}
                  roles={availableRoles}
                />
              ) : (
                <p className="text-xs leading-6 text-gray-900">{user.role}</p>
              )}
              {/* {user.lastSeen ? (
                <p className="mt-1 text-xs leading-5 text-gray-500">
                  Last seen{' '}
                  <time dateTime={user.lastSeenDateTime}>{user.lastSeen}</time>
                </p>
              ) : null} */}
            </div>
            <ChevronRightIcon
              className="size-5 flex-none text-gray-400"
              aria-hidden="true"
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Invitations({ invitations }: { invitations: Invitation[] }) {
  const now = Date.now();
  return (
    <ul role="list" className="divide-y divide-gray-100">
      {invitations.length === 0 && (
        <div className="mb-8 text-xs text-slate-700">No invitations</div>
      )}
      {invitations.map((invite) => {
        const isExpired = invite.expiresAt.getTime() - now < 0;
        return (
          <li
            key={invite.id}
            className="relative flex justify-between gap-x-6 pb-5"
          >
            <div className="flex min-w-0 gap-x-4">
              <div className="min-w-0 flex-auto">
                <p className="text-sm font-semibold leading-6 text-gray-900">
                  <span className="absolute inset-x-0 -top-px bottom-0" />
                  {invite.email}
                </p>
                <p
                  className={clsx(
                    isExpired ? 'text-red-700' : '',
                    'mt-1 flex text-xs leading-5 text-gray-500',
                  )}
                >
                  <span className="mr-1">
                    {isExpired ? 'Expired ' : 'Expires '}
                  </span>
                  <Datetime dateTime={invite.expiresAt} />
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-x-4">
              <InviteSubmenu invitation={invite} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
