import { unstable_cache } from 'next/cache';
import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { getById, getUserRole } from './user';

import type { OrgId, User, UserId, UserRole } from '@/types';

export type SessionUser = Pick<User, 'id' | 'name' | 'email' | 'image'> & {
  orgId: OrgId;
  role: UserRole['role'];
};

export async function getCurrent(): Promise<
  | {
      user: SessionUser;
      authRedirect: undefined;
    }
  | {
      user: undefined;
      authRedirect: () => typeof redirect;
    }
> {
  const session = await auth();
  if (!session) {
    return {
      user: undefined,
      authRedirect: () => redirect('/login'),
    };
  }

  // @ts-expect-error
  const userId: UserId | undefined = session?.user?.id;
  if (!userId) {
    return {
      user: undefined,
      authRedirect: () => redirect('/login'),
    };
  }
  const user = await getByIdCached(userId);
  if (!user) {
    return {
      user: undefined,
      authRedirect: () => redirect('/login'),
    };
  }

  const orgId = await getCurrentOrgId(user.id);
  if (!orgId) {
    return {
      user: undefined,
      authRedirect: () => redirect('/org-select'),
    };
  }
  const role = await getUserRole(user.id, orgId);
  if (!role) {
    return {
      user: undefined,
      authRedirect: () => redirect('/login'),
    };
  }

  const sessionUser: SessionUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    orgId,
    role,
  };

  return {
    user: sessionUser,
    authRedirect: undefined,
  };
}

const getByIdCached = unstable_cache(
  async (id) => getById(id),
  ['user-by-id'],
  {
    revalidate: 60 * 5,
  },
);

export async function getCurrentOrgId(
  userId: UserId,
): Promise<OrgId | undefined> {
  const res = await db
    .selectFrom('userCurrentOrg')
    .select('orgId')
    .where('userId', '=', userId)
    .executeTakeFirst();
  return res?.orgId;
}

export class UnauthorizedError extends Error {
  statusCode: number;

  constructor(message: string = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
    this.statusCode = 401;
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}
