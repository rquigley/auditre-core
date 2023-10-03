import { db } from '@/lib/db';

import type { NewSession, Session, SessionUpdate, UserId } from '@/types';

export async function create(session: NewSession): Promise<Session> {
  return await db
    .insertInto('session')
    .values({ ...session })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteBySessionToken(
  sessionToken: string,
): Promise<Session | undefined> {
  return await db
    .deleteFrom('session')
    .where('sessionToken', '=', sessionToken)
    .returningAll()
    .executeTakeFirst();
}

export async function getById(id: string): Promise<Session> {
  return await db
    .selectFrom('session')
    .where('id', '=', id)
    .selectAll()
    .executeTakeFirstOrThrow();
}

export async function getBySessionToken(
  sessionToken: string,
): Promise<Session> {
  return await db
    .selectFrom('session')
    .where('sessionToken', '=', sessionToken)
    .selectAll()
    .executeTakeFirstOrThrow();
}

export async function getAllByUserId(userId: UserId): Promise<Session[]> {
  return await db
    .selectFrom('session')
    .where('userId', '=', userId)
    .selectAll()
    .execute();
}

export async function updateBySessionToken(
  sessionToken: string,
  updateWith: SessionUpdate,
) {
  return await db
    .updateTable('session')
    .set(updateWith)
    .where('sessionToken', '=', sessionToken)
    .execute();
}
