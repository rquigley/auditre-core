'use client';

import clsx from 'clsx';

import { changeUserRole } from '@/lib/actions';

import type { AuthRole, UserId } from '@/types';

export function RoleSelector({
  userId,
  userRole,
  roles,
}: {
  userId: UserId;
  userRole: AuthRole;
  roles: AuthRole[];
}) {
  return (
    <select
      className={clsx(
        'block w-full rounded-md border-0 py-1.5 pl-3 pr-10 ring-1 ring-inset focus:ring-2 focus:ring-sky-600 sm:text-xs sm:leading-6',
      )}
      value={userRole}
      onChange={async (e) => {
        await changeUserRole({
          userId: userId,
          role: e.target.value as AuthRole,
        });
      }}
    >
      {roles.map((r) => {
        return (
          <option key={r} value={r}>
            {r}
          </option>
        );
      })}
    </select>
  );
}
