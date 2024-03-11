import DataLoader from 'dataloader';
import { unstable_cache } from 'next/cache';

import { db, sql } from '@/lib/db';
import { deleteInvitationsByEmail, getInvitationsByEmail } from './invitation';

import type { AuthRole, NewUser, OrgId, UserId, UserUpdate } from '@/types';

export async function invitesToUser(
  email: string,
  extra?: {
    name: string | null | undefined;
    image: string | null | undefined;
    emailVerified: Date | null;
  },
) {
  const invites = await getInvitationsByEmail(email);

  if (invites.length === 0) {
    return { success: false, error: 'no-invites' };
  }

  let ret;
  const existingUser = await getUserByEmail(email);
  if (existingUser) {
    ret = {
      id: existingUser.id,
      email: existingUser.email,
      name: existingUser.name,
      image: existingUser.image,
      emailVerified: existingUser.emailVerified,
    };
  } else {
    const user = await createUser({
      email,
      name: extra?.name || undefined,
      image: extra?.image || undefined,
      emailVerified: extra?.emailVerified || undefined,
    });
    ret = {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      emailVerified: user.emailVerified,
    };
  }

  for (const orgId of invites.map((i) => i.orgId)) {
    await addUserRole({ userId: ret.id, orgId });
  }

  await deleteInvitationsByEmail(email);
  return { success: true, user: ret };
}

export async function createUser(user: NewUser) {
  return await db
    .insertInto('auth.user')
    .values({
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      image: user.image,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function addUserRole({
  userId,
  orgId,
}: {
  userId: UserId;
  orgId: OrgId;
}) {
  if (await getUserRole(userId, orgId)) {
    return;
  }

  const orgHasUsers = await db
    .selectFrom('auth.userRole')
    .where('orgId', '=', orgId)
    .limit(1)
    .executeTakeFirst();

  return await db
    .insertInto('auth.userRole')
    .values({
      userId,
      orgId,
      role: orgHasUsers ? 'USER' : 'OWNER',
    })
    .execute();
}

export async function changeUserRole(userId: UserId, role: AuthRole) {
  await db
    .updateTable('auth.userRole')
    .set({
      role,
    })
    .where('userId', '=', userId)
    .execute();
  // TODO: log this!
}

export async function getById(id: UserId) {
  return await db
    .selectFrom('auth.user')
    .where('id', '=', id)
    .where('isDeleted', '=', false)
    .selectAll()
    .executeTakeFirstOrThrow();
}

export async function getAllByOrgId(orgId: OrgId) {
  return await db
    .selectFrom('auth.user as u')
    .innerJoin('auth.userRole as ur', 'ur.userId', 'u.id')
    .select([
      'u.id',
      'u.name',
      'u.email',
      'u.image',
      'u.emailVerified',
      'ur.role',
    ])
    .where('orgId', '=', orgId)
    .where('u.isDeleted', '=', false)
    .execute();
}

export async function getMultipleById(ids: UserId[]) {
  return await db
    .selectFrom('auth.user')
    .where('id', 'in', ids)
    .where('isDeleted', '=', false)
    .selectAll()
    .execute();
}
export const userLoader = new DataLoader((userIds) =>
  getMultipleById(userIds as UserId[]),
);

type QueryOpts = {
  comment?: string;
};
export async function getUserByEmail(email: string, queryOpts?: QueryOpts) {
  let commentStr = sql.raw('');
  if (queryOpts?.comment) {
    commentStr = sql.raw('-- ' + queryOpts.comment);
  }
  return await db
    .selectFrom('auth.user')
    .where('email', '=', email)
    .where('isDeleted', '=', false)
    .modifyEnd(sql`${commentStr}`)
    .selectAll()
    .executeTakeFirst();
}

export async function getByAccountProviderAndProviderId(
  provider: string,
  providerAccountId: string,
) {
  return await db
    .selectFrom('auth.user as u')
    .innerJoin('auth.userAccount as ua', 'ua.userId', 'u.id')
    .where('ua.provider', '=', provider)
    .where('ua.providerAccountId', '=', providerAccountId)
    .selectAll('u')
    .executeTakeFirst();
}

export const sessionUserLoader = new DataLoader((sessionTokenArgs) =>
  getBySessionTokens(sessionTokenArgs as string[]),
);
async function getBySessionTokens(sessionTokenArgs: string[]) {
  const res = await db
    .selectFrom('auth.session as s')
    .innerJoin('auth.user as u', 'u.id', 's.userId')
    .select(['u.id', 'u.name', 'u.email', 'u.image', 'u.emailVerified'])
    .select(['s.id as sessionId', 's.userId', 's.sessionToken', 's.expires'])
    .where('s.sessionToken', 'in', sessionTokenArgs)
    .where('u.isDeleted', '=', false)
    .execute();
  const ret = sessionTokenArgs.map((sessionTokenArg) => {
    const res2 = res.find((r) => r.sessionToken === sessionTokenArg);
    if (!res2) {
      return null;
    }
    const { sessionId, userId, sessionToken, expires, ...user } = res2;
    return {
      user: { ...user },
      session: { id: sessionId, userId: user.id, sessionToken, expires },
    };
  });
  return ret;
}

export const getBySessionTokenCached = unstable_cache(
  async (sessionTokenArg: string) => getBySessionToken(sessionTokenArg),
  ['session-token-user'],
  {
    revalidate: 60,
    tags: ['session-token-user'],
  },
);

export async function getBySessionToken(sessionTokenArg: string) {
  const res = await db
    .selectFrom('auth.session as s')
    .innerJoin('auth.user as u', 'u.id', 's.userId')
    .select(['u.id', 'u.name', 'u.email', 'u.image', 'u.emailVerified'])
    .select([
      's.id as sessionId',
      's.userId',
      's.sessionToken',
      's.expires',
      's.currentOrgId',
    ])
    .where('s.sessionToken', '=', sessionTokenArg)
    .where('u.isDeleted', '=', false)
    .executeTakeFirst();
  if (!res) {
    return null;
  }
  const { sessionId, userId, sessionToken, expires, ...user } = res;
  return {
    user: { ...user },
    session: {
      id: sessionId,
      userId: user.id,
      sessionToken,
      currentOrgId: res.currentOrgId,
      // Cast this to string to allow it to be cached by next/cache unstable_cache.
      // See https://github.com/vercel/next.js/issues/51613
      expires: expires.toISOString(),
    },
  };
}

export async function updateUser(id: UserId, updateWith: UserUpdate) {
  return await db
    .updateTable('auth.user')
    .set(updateWith)
    .where('id', '=', id)
    .execute();
}

export async function getOrgsForUserId(userId: UserId) {
  let orgs = await db
    .selectFrom('auth.userRole as ur')
    .innerJoin('org', 'org.id', 'ur.orgId')
    .select([
      'org.id',
      'org.name',
      'org.canHaveChildOrgs',
      'org.parentOrgId',
      'ur.role',
    ])
    .where('userId', '=', userId)
    .orderBy('org.id')
    .execute();

  orgs = dedupeOrgsByPriv(orgs);

  let orgsToConsider = orgs;
  while (true) {
    const orgIdsWithChildren = orgsToConsider
      .map((org) =>
        org.canHaveChildOrgs &&
        ['SUPERUSER', 'OWNER', 'ADMIN'].includes(org.role)
          ? org.id
          : null,
      )
      .filter(Boolean);

    if (orgIdsWithChildren.length === 0) {
      break;
    }
    const childOrgs = await db
      .selectFrom('org')
      .select(['id', 'name', 'parentOrgId', 'canHaveChildOrgs'])
      .where('parentOrgId', 'in', orgIdsWithChildren)
      .orderBy('id')
      .execute();

    const childOrgsWithRole = childOrgs.map((org) => ({
      ...org,
      role: orgs.find((m) => m.id === org.parentOrgId)?.role as AuthRole,
    }));

    orgsToConsider = childOrgsWithRole;
    orgs = orgs.concat(childOrgsWithRole);
  }

  return dedupeOrgsByPriv(orgs).sort((a, b) => a.id.localeCompare(b.id));
}

function dedupeOrgsByPriv<T extends { id: string; role: string }[]>(orgs: T) {
  // if there are two orgs with the same id, take the one with the higher role
  // This prevents a child org user from adding a higher priviledged order
  // and clobering their perms.
  const orgMap = new Map<string, (typeof orgs)[number]>();
  for (const org of orgs) {
    const existingOrg = orgMap.get(org.id);
    if (!existingOrg) {
      orgMap.set(org.id, org);
    } else if (['SUPERUSER', 'OWNER', 'ADMIN'].includes(org.role)) {
      orgMap.set(org.id, org);
    }
  }
  return Array.from(orgMap, ([_, org]) => org);
}

export const getOrgsForUserIdCached = unstable_cache(
  async (id) => getOrgsForUserId(id),
  ['orgs-for-user'],
  {
    tags: ['orgs-for-user'],
    revalidate: 60 * 5,
  },
);

export async function getUserRole(userId: OrgId, orgId: OrgId) {
  return await db
    .selectFrom('auth.userRole')
    .select(['role'])
    .where('userId', '=', userId)
    .where('orgId', '=', orgId)
    .executeTakeFirst();
}
