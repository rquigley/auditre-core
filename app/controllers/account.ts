import { db } from '@/lib/db';

import type { Account, AccountUpdate, NewAccount } from '@/types';

export async function create(user: NewAccount): Promise<Account> {
  return await db
    .insertInto('account')
    .values(user)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteAccount(
  provider: string,
  providerAccountId: string,
): Promise<Account | undefined> {
  return await db
    .deleteFrom('account')
    .where('provider', '=', provider)
    .where('providerAccountId', '=', providerAccountId)
    .returningAll()
    .executeTakeFirst();
}
export async function getById(id: string): Promise<Account> {
  return await db
    .selectFrom('account')
    .where('id', '=', id)
    .selectAll()
    .executeTakeFirstOrThrow();
}

export async function update(id: string, updateWith: AccountUpdate) {
  return await db
    .updateTable('account')
    .set(updateWith)
    .where('id', '=', id)
    .execute();
}
