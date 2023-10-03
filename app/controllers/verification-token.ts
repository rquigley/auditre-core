import { db } from '@/lib/db';

import type {
  NewVerificationToken,
  VerificationToken,
  VerificationTokenUpdate,
} from '@/types';

export async function create(
  user: NewVerificationToken,
): Promise<VerificationToken> {
  return await db
    .insertInto('verificationToken')
    .values(user)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteVerificationToken(
  identifier: string,
): Promise<VerificationToken | undefined> {
  return await db
    .deleteFrom('verificationToken')
    .where('identifier', '=', identifier)
    .returningAll()
    .executeTakeFirst();
}
export async function getByIdentifier(
  identifier: string,
): Promise<VerificationToken> {
  return await db
    .selectFrom('verificationToken')
    .where('identifier', '=', identifier)
    .selectAll()
    .executeTakeFirstOrThrow();
}

export async function update(
  identifier: string,
  updateWith: VerificationTokenUpdate,
) {
  return await db
    .updateTable('verificationToken')
    .set(updateWith)
    .where('identifier', '=', identifier)
    .execute();
}
