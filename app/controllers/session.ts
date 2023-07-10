import { db } from '@/lib/db';
import { SessionUpdate, Session, NewSession } from '@/types';

export function create(session: NewSession): Promise<Session> {
  return db
    .insertInto('session')
    .values(session)
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

export function getById(id: number): Promise<Session> {
  return db
    .selectFrom('session')
    .where('id', '=', id)
    .selectAll()
    .executeTakeFirstOrThrow();
}

export function getByUserId(userId: number): Promise<Session> {
  return db
    .selectFrom('session')
    .where('userId', '=', userId)
    .selectAll()
    .executeTakeFirstOrThrow();
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
