import 'server-only';

import { db } from '@/lib/db';
import {
  VerificationTokenUpdate,
  VerificationToken,
  NewVerificationToken,
} from '@/types';

export function create(user: NewVerificationToken): Promise<VerificationToken> {
  return db
    .insertInto('verificationToken')
    .values(user)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export function deleteVerificationToken(
  identifier: number,
): Promise<VerificationToken | undefined> {
  return db
    .deleteFrom('verificationToken')
    .where('identifier', '=', identifier)
    .returningAll()
    .executeTakeFirst();
}
export function getByIdentifier(
  identifier: number,
): Promise<VerificationToken> {
  return db
    .selectFrom('verificationToken')
    .where('identifier', '=', identifier)
    .selectAll()
    .executeTakeFirstOrThrow();
}

export function update(
  identifier: number,
  updateWith: VerificationTokenUpdate,
) {
  return db
    .updateTable('verificationToken')
    .set(updateWith)
    .where('identifier', '=', identifier)
    .execute();
}
