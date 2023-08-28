// import 'server-only';

import { db } from '@/lib/db';
import type { SessionUpdate, Session, NewSession, UserId } from '@/types';

export function create(session: NewSession): Promise<Session> {
  return db
    .insertInto('session')
    .values({ ...session })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export function deleteBySessionToken(
  sessionToken: string,
): Promise<Session | undefined> {
  return db
    .deleteFrom('session')
    .where('sessionToken', '=', sessionToken)
    .returningAll()
    .executeTakeFirst();
}

export function getById(id: string): Promise<Session> {
  return db
    .selectFrom('session')
    .where('id', '=', id)
    .selectAll()
    .executeTakeFirstOrThrow();
}

export function getBySessionToken(sessionToken: string): Promise<Session> {
  return db
    .selectFrom('session')
    .where('sessionToken', '=', sessionToken)
    .selectAll()
    .executeTakeFirstOrThrow();
}

export function getAllByUserId(userId: UserId): Promise<Session[]> {
  return db
    .selectFrom('session')
    .where('userId', '=', userId)
    .selectAll()
    .execute();
}

export function updateBySessionToken(
  sessionToken: string,
  updateWith: SessionUpdate,
) {
  return db
    .updateTable('session')
    .set(updateWith)
    .where('sessionToken', '=', sessionToken)
    .execute();
}
