import { db } from '@/lib/db';

import type {
  NewUserAccount,
  UserAccount,
  UserAccountId,
  UserAccountUpdate,
} from '@/types';

export async function createUserAccount(
  user: NewUserAccount,
): Promise<UserAccount> {
  return await db
    .insertInto('userAccount')
    .values(user)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteUserAccount(
  provider: string,
  providerAccountId: string,
): Promise<UserAccount | undefined> {
  return await db
    .deleteFrom('userAccount')
    .where('provider', '=', provider)
    .where('providerAccountId', '=', providerAccountId)
    .returningAll()
    .executeTakeFirst();
}
export async function getById(id: UserAccountId): Promise<UserAccount> {
  return await db
    .selectFrom('userAccount')
    .where('id', '=', id)
    .selectAll()
    .executeTakeFirstOrThrow();
}

export async function update(id: UserAccountId, updateWith: UserAccountUpdate) {
  return await db
    .updateTable('userAccount')
    .set(updateWith)
    .where('id', '=', id)
    .execute();
}
