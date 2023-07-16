import { db } from '@/lib/db';
import { sql } from 'kysely';
import { SessionUpdate, Session, NewSession } from '@/types';

export function create(session: NewSession): Promise<Session> {
  return db
    .insertInto('session')
    .values({
      userId: session.userId,
      expires: session.expires,
      sessionToken: sql`gen_random_uuid()`,
    })
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

export function getBySessionToken(sessionToken: string): Promise<Session> {
  return db
    .selectFrom('session')
    .where('sessionToken', '=', sessionToken)
    .selectAll()
    .executeTakeFirstOrThrow();
}

export function getAllByUserId(userId: number): Promise<Session[]> {
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
