import DataLoader from 'dataloader';
import { unstable_cache } from 'next/cache';

import { db, sql } from '@/lib/db';

import type {
  NewUser,
  OrgId,
  User,
  UserId,
  UserRole,
  UserUpdate,
} from '@/types';

export async function createUser(
  orgId: OrgId,
  user: NewUser,
): Promise<Pick<User, 'id' | 'name' | 'email' | 'image' | 'emailVerified'>> {
  return await db.transaction().execute(async (trx) => {
    const userRes = await trx
      .insertInto('user')
      .values({
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        image: user.image,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    await trx
      .insertInto('userRole')
      .values({
        userId: userRes.id,
        orgId,
        role: 'user', // Always start as 'user', then can be promoted to 'admin'
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

export async function getById(id: UserId): Promise<User> {
  return await db
    .selectFrom('user')
    .where('id', '=', id)
    .where('isDeleted', '=', false)
    .selectAll()
    .executeTakeFirstOrThrow();
}

export async function getAllByOrgId(orgId: OrgId): Promise<User[]> {
  return await db
    .selectFrom('user')
    .innerJoin('userRole as ur', 'ur.userId', 'user.id')
    .where('orgId', '=', orgId)
    .where('ur.isDeleted', '=', false)
    .where('user.isDeleted', '=', false)
    .selectAll()
    .execute();
}

export async function getMultipleById(ids: UserId[]): Promise<User[]> {
  return await db
    .selectFrom('user')
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
    .selectFrom('user')
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
    .selectFrom('user')
    .innerJoin('userAccount as ua', 'ua.userId', 'user.id')
    .where('ua.provider', '=', provider)
    .where('ua.providerAccountId', '=', providerAccountId)
    .selectAll('user')
    .executeTakeFirst();
}

export const sessionUserLoader = new DataLoader((sessionTokenArgs) =>
  getBySessionTokens(sessionTokenArgs as string[]),
);
async function getBySessionTokens(sessionTokenArgs: string[]) {
  const res = await db
    .selectFrom('session')
    .innerJoin('user', 'user.id', 'session.userId')
    .select([
      'user.id',
      'user.name',
      'user.email',
      'user.image',
      'user.emailVerified',
    ])
    .select([
      'session.id as sessionId',
      'session.userId',
      'session.sessionToken',
      'session.expires',
    ])
    .where('session.sessionToken', 'in', sessionTokenArgs)
    .where('user.isDeleted', '=', false)
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
    .selectFrom('session')
    .innerJoin('user', 'user.id', 'session.userId')
    .select([
      'user.id',
      'user.name',
      'user.email',
      'user.image',
      'user.emailVerified',
    ])
    .select([
      'session.id as sessionId',
      'session.userId',
      'session.sessionToken',
      'session.expires',
    ])
    .where('session.sessionToken', '=', sessionTokenArg)
    .where('user.isDeleted', '=', false)
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
      // Cast this to string to allow it to be cached by next/cache unstable_cache.
      // See https://github.com/vercel/next.js/issues/51613
      expires: expires.toISOString(),
    },
  };
}

export async function updateUser(id: UserId, updateWith: UserUpdate) {
  return await db
    .updateTable('user')
    .set(updateWith)
    .where('id', '=', id)
    .execute();
}

export async function getUserRole(
  userId: UserId,
  orgId: OrgId,
): Promise<UserRole['role'] | undefined> {
  const res = await db
    .selectFrom('userRole')
    .select('role')
    .where('userId', '=', userId)
    .where('orgId', '=', orgId)
    .executeTakeFirst();
  return res?.role;
}
