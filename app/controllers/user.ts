import DataLoader from 'dataloader';
import { unstable_cache } from 'next/cache';

import { db, sql } from '@/lib/db';

import type {
  AuthRole,
  NewUser,
  OrgId,
  User,
  UserId,
  UserUpdate,
} from '@/types';

export async function createUser(
  orgId: OrgId,
  user: NewUser,
): Promise<Pick<User, 'id' | 'name' | 'email' | 'image' | 'emailVerified'>> {
  // Does any other user exist for this org? If not, make this user an admin.

  const { count: userCount } = await db
    .selectFrom('auth.userRole')
    .select(db.fn.countAll().as('count'))
    .where('orgId', '=', orgId)
    .executeTakeFirstOrThrow();

  return await db.transaction().execute(async (trx) => {
    const userRes = await trx
      .insertInto('auth.user')
      .values({
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        image: user.image,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    await trx
      .insertInto('auth.userRole')
      .values({
        userId: userRes.id,
        orgId,
        role: userCount === 0 ? 'OWNER' : 'USER',
        //role: 'user', // Always start as 'user', then can be promoted to 'admin'
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return {
      id: userRes.id,
      name: userRes.name,
      email: userRes.email,
      image: userRes.image,
      emailVerified: userRes.emailVerified,
    };
  });
}

export async function addUserRole({
  userId,
  orgId,
  role,
}: {
  userId: UserId;
  orgId: OrgId;
  role: AuthRole;
}) {
  return await db
    .insertInto('auth.userRole')
    .values({
      userId,
      orgId,
      role,
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
export async function getByEmail(
  email: string,
  queryOpts?: QueryOpts,
): Promise<User | undefined> {
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
): Promise<User | undefined> {
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
  const memberOrgs = await db
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
  const parentalOrgIds = memberOrgs
    .map((org) =>
      ['SUPERUSER', 'OWNER', 'ADMIN'].includes(org.role) && org.canHaveChildOrgs
        ? org.id
        : null,
    )
    .filter(Boolean);

  if (parentalOrgIds.length === 0) {
    return memberOrgs;
  }
  const parentOrgsRes = await db
    .selectFrom('org')
    .select(['id', 'name', 'parentOrgId', 'canHaveChildOrgs'])
    .where('parentOrgId', 'in', parentalOrgIds)
    .orderBy('id')
    .execute();

  const parentOrgs = parentOrgsRes.map((org) => ({
    ...org,
    role: memberOrgs.find((m) => m.id === org.parentOrgId)?.role as AuthRole,
  }));
  const childOrgIds = parentOrgs.map((org) => org.id);

  memberOrgs.map((org) => {
    if (!childOrgIds.includes(org.id)) {
      parentOrgs.push(org);
    }
  });

  return parentOrgs.sort((a, b) => a.id.localeCompare(b.id));
}

export const getOrgsForUserIdCached = unstable_cache(
  async (id) => getOrgsForUserId(id),
  ['orgs-for-user'],
  {
    revalidate: 60 * 5,
  },
);
