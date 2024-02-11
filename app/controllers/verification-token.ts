import { db } from '@/lib/db';

import type { NewVerificationToken } from '@/types';

export async function createVerificationToken(user: NewVerificationToken) {
  return await db
    .insertInto('auth.verificationToken')
    .values(user)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteVerificationTokens(identifier: string) {
  return await db
    .deleteFrom('auth.verificationToken')
    .where('identifier', '=', identifier)
    .returningAll()
    .executeTakeFirst();
}
export async function getVerificationToken(identifier: string, token: string) {
  return await db
    .selectFrom('auth.verificationToken')
    .where('identifier', '=', identifier)
    .where('token', '=', token)
    .selectAll()
    .executeTakeFirst();
}
