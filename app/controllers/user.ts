// import 'server-only';
import { db } from '@/lib/db';
import type { NewUser, OrgId, User, UserId, UserUpdate } from '@/types';
import DataLoader from 'dataloader';

export function create(user: NewUser): Promise<User> {
  return db
    .insertInto('user')
    .values({ ...user })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export function getById(id: UserId): Promise<User> {
  return db
    .selectFrom('user')
    .where('id', '=', id)
    .where('isDeleted', '=', false)
    .selectAll()
    .executeTakeFirstOrThrow();
}

export function getAllByOrgId(orgId: OrgId): Promise<User[]> {
  return db
    .selectFrom('user')
    .where('orgId', '=', orgId)
    .where('isDeleted', '=', false)
    .selectAll()
    .execute();
}

export function getMultipleById(ids: UserId[]): Promise<User[]> {
  return db
    .selectFrom('user')
    .where('id', 'in', ids)
    .where('isDeleted', '=', false)
    .selectAll()
    .execute();
}
export const userLoader = new DataLoader((userIds) =>
  getMultipleById(userIds as UserId[]),
);

export function getByEmail(email: string): Promise<User | undefined> {
  return db
    .selectFrom('user')
    .where('email', '=', email)
    .where('isDeleted', '=', false)
    .selectAll()
    .executeTakeFirst();
}

export function getByAccountProviderAndProviderId(
  provider: string,
  providerAccountId: string,
): Promise<User | undefined> {
  return db
    .selectFrom('user')
    .innerJoin('account', 'account.userId', 'user.id')
    .where('account.provider', '=', provider)
    .where('account.providerAccountId', '=', providerAccountId)
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
    session: { id: sessionId, userId: user.id, sessionToken, expires },
  };
}

export async function update(id: UserId, updateWith: UserUpdate) {
  return db.updateTable('user').set(updateWith).where('id', '=', id).execute();
}
