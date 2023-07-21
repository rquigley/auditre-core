// import 'server-only';

import { db } from '@/lib/db';
import { UserUpdate, User, NewUser } from '@/types';
import { getServerSession } from 'next-auth/next';
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
export function getBySessionToken(
  sessionToken: string,
): Promise<User | undefined> {
  return db
    .selectFrom('user')
    .innerJoin('session', 'session.userId', 'user.id')
    .where('session.sessionToken', '=', sessionToken)
    .selectAll('user')
    .executeTakeFirst();
}

export async function update(id: number, updateWith: UserUpdate) {
  return db.updateTable('user').set(updateWith).where('id', '=', id).execute();
}

export async function getCurrentUser(): Promise<User> {
  const session = await getServerSession();
  if (!session) {
    throw new Error('Session does not exist');
  }
  // Hijack the email attribute on the session to store our
  // db-persisted session token. Next-auth – rightly - wants
  // to dissuade you from using password based authentication
  // but we don't have anything sufficiently better/usable.
  // Storing additional data doesn't seem currently possible.
  const sessionToken = session?.user?.email;
  if (!sessionToken) {
    throw new Error('Session token does not exist');
  }
  const user = await getBySessionToken(sessionToken);
  if (!user) {
    throw new Error('Session does not exist for this user');
  }
  return user;
}
