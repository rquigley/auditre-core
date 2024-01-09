import { db } from '@/lib/db';

import type { NewSession, Session, SessionUpdate, UserId } from '@/types';

export async function createSession(session: NewSession): Promise<Session> {
  return await db
    .insertInto('auth.session')
    .values({ ...session })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteSession(
  sessionToken: string,
): Promise<Session | undefined> {
  return await db
    .deleteFrom('auth.session')
    .where('sessionToken', '=', sessionToken)
    .returningAll()
    .executeTakeFirst();
}

export async function getById(id: number): Promise<Session> {
  return await db
    .selectFrom('auth.session')
    .where('id', '=', id)
    .selectAll()
    .executeTakeFirstOrThrow();
}

export async function getBySessionToken(
  sessionToken: string,
): Promise<Session> {
  return await db
    .selectFrom('auth.session')
    .where('sessionToken', '=', sessionToken)
    .selectAll()
    .executeTakeFirstOrThrow();
}

export async function getAllByUserId(userId: UserId): Promise<Session[]> {
  return await db
    .selectFrom('auth.session')
    .where('userId', '=', userId)
    .selectAll()
    .execute();
}

export async function updateSession(
  sessionToken: string,
  updateWith: SessionUpdate,
) {
  return await db
    .updateTable('auth.session')
    .set(updateWith)
    .where('sessionToken', '=', sessionToken)
    .execute();
}
