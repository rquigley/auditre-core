// import 'server-only';

import { db } from '@/lib/db';
import type { UserUpdate, User, NewUser } from '@/types';
import { nanoid } from 'nanoid';

export function create(user: Omit<NewUser, 'externalId'>): Promise<User> {
  return db
    .insertInto('user')
    .values({ ...user, externalId: nanoid() })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export function getById(id: number): Promise<User> {
  return db
    .selectFrom('user')
    .where('id', '=', id)
    .selectAll()
    .executeTakeFirstOrThrow();
}

export function getByExternalId(externalId: string): Promise<User> {
  return db
    .selectFrom('user')
    .where('externalId', '=', externalId)
    .selectAll()
    .executeTakeFirstOrThrow();
}

export function getByEmail(email: string): Promise<User | undefined> {
  return db
    .selectFrom('user')
    .where('email', '=', email)
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

export async function getBySessionToken(sessionTokenArg: string) {
  const res = await db
    .selectFrom('session')
    .innerJoin('user', 'user.id', 'session.userId')
    .select([
      'user.externalId as id',
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

export async function update(id: number, updateWith: UserUpdate) {
  return db.updateTable('user').set(updateWith).where('id', '=', id).execute();
}
