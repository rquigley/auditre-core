import { db } from '@/lib/db';

import type { NewSession, SessionUpdate } from '@/types';

export async function createSession(session: NewSession) {
  return await db
    .insertInto('auth.session')
    .values({ ...session })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteSession(sessionToken: string) {
  return await db
    .deleteFrom('auth.session')
    .where('sessionToken', '=', sessionToken)
    .returningAll()
    .executeTakeFirst();
}

export async function getBySessionToken(sessionToken: string) {
  return await db
    .selectFrom('auth.session')
    .where('sessionToken', '=', sessionToken)
    .selectAll()
    .executeTakeFirstOrThrow();
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
