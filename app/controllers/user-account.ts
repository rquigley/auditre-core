import { db } from '@/lib/db';

import type { NewUserAccount, UserAccountId, UserAccountUpdate } from '@/types';

export async function createUserAccount(user: NewUserAccount) {
  return await db
    .insertInto('auth.userAccount')
    .values(user)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteUserAccount(
  provider: string,
  providerAccountId: string,
) {
  return await db
    .deleteFrom('auth.userAccount')
    .where('provider', '=', provider)
    .where('providerAccountId', '=', providerAccountId)
    .returningAll()
    .executeTakeFirst();
}
export async function getById(id: UserAccountId) {
  return await db
    .selectFrom('auth.userAccount')
    .where('id', '=', id)
    .selectAll()
    .executeTakeFirstOrThrow();
}

export async function update(id: UserAccountId, updateWith: UserAccountUpdate) {
  return await db
    .updateTable('auth.userAccount')
    .set(updateWith)
    .where('id', '=', id)
    .execute();
}
