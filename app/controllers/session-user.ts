import { Session } from 'next-auth';
import { revalidateTag, unstable_cache } from 'next/cache';
import { redirect } from 'next/navigation';
import { cache } from 'react';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { getById, getOrgsAvailableforSwitching, getUserRole } from './user';

import type { AuthRole, OrgId, UserId } from '@/types';

const permissions = {
  SUPERUSER: ['ai:view', 'ai:create', 'documents:view'],
  OWNER: [],
  ADMIN: [],
  USER: [],
} as const;

type OrgAgnosticPermission = 'orgs:manage';

type Permission =
  | (typeof permissions)[AuthRole][number]
  | OrgAgnosticPermission;

export class User {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  orgId: OrgId;
  role: AuthRole;
  orgs: Awaited<ReturnType<typeof getOrgsAvailableforSwitching>>;

  constructor({
    id,
    name,
    email,
    image,
    orgId,
    role,
    orgs,
  }: {
    id: UserId;
    name: string | null;
    email: string | null;
    image: string | null;
    orgId: OrgId;
    role: AuthRole;
    orgs: Awaited<ReturnType<typeof getOrgsAvailableforSwitching>>;
  }) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.image = image;
    this.orgId = orgId;
    this.role = role;
    this.orgs = orgs;
  }

  hasPerm(perm: Permission) {
    // Org agnostic perms
    if (perm === 'orgs:manage') {
      return this.orgs.some((org) =>
        ['SUPERUSER', 'OWNER', 'ADMIN'].includes(org.role),
      );
    }
    const org = this.orgs.find((org) => org.id === this.orgId);
    throw new Error(`Unknown permission: ${perm}`);
  }

  get orgName() {
    return this.orgs.find((org) => org.id === this.orgId)?.name || '';
  }
}

export const getCurrent = cache(async () => {
  return await _getCurrent();
});

export async function _getCurrent(): Promise<
  | {
      user: User;
      authRedirect: undefined;
    }
  | {
      user: undefined;
      authRedirect: () => typeof redirect;
    }
> {
  const session = (await auth()) as (Session & { currentOrgId: OrgId }) | null;
  if (session) {
    const userId: UserId | undefined = session?.user?.id;
    if (userId) {
      const userRes = await getByIdCached(userId);
      // TODO make parallel
      const orgs = await getOrgsAvailableforSwitching(userRes.id);
      const role = orgs.find((org) => org.id === session.currentOrgId)?.role;

      if (role) {
        const user = new User({
          id: userRes.id,
          name: userRes.name,
          email: userRes.email,
          image: userRes.image,
          orgId: session.currentOrgId,
          orgs: orgs,
          role,
        });

        return {
          user,
          authRedirect: undefined,
        };
      }
    }
  }
  return {
    user: undefined,
    authRedirect: () => redirect('/login'),
  };
}

const getByIdCached = unstable_cache(
  async (id) => getById(id),
  ['user-by-id'],
  {
    revalidate: 60 * 5,
  },
);

export class UnauthorizedError extends Error {
  statusCode: number;

  constructor(message: string = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
    this.statusCode = 401;
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

export async function switchOrg(userId: UserId, orgId: OrgId) {
  const role = await getUserRole(userId, orgId);
  if (!role) {
    throw new UnauthorizedError();
  }
  await db
    .updateTable('auth.session')
    .set({ currentOrgId: orgId })
    .where('userId', '=', userId)
    .execute();

  revalidateTag('session-token-user');
}
