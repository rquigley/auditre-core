import { db } from '@/lib/db';

import type {
  NewVerificationToken,
  VerificationToken,
  VerificationTokenUpdate,
} from '@/types';

export async function createVerificationToken(
  user: NewVerificationToken,
): Promise<VerificationToken> {
  return await db
    .insertInto('auth.verificationToken')
    .values(user)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteVerificationToken(
  identifier: string,
): Promise<VerificationToken | undefined> {
  return await db
    .deleteFrom('auth.verificationToken')
    .where('identifier', '=', identifier)
    .returningAll()
    .executeTakeFirst();
}
export async function getByIdentifier(
  identifier: string,
): Promise<VerificationToken> {
  return await db
    .selectFrom('auth.verificationToken')
    .where('identifier', '=', identifier)
    .selectAll()
    .executeTakeFirstOrThrow();
}

export async function updateVerificationToken(
  identifier: string,
  updateWith: VerificationTokenUpdate,
) {
  return await db
    .updateTable('auth.verificationToken')
    .set(updateWith)
    .where('identifier', '=', identifier)
    .execute();
}
