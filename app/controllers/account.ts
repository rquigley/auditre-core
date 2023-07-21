// import 'server-only';
import { db } from '@/lib/db';
import { AccountUpdate, Account, NewAccount } from '@/types';

export function create(user: NewAccount): Promise<Account> {
  return db
    .insertInto('account')
    .values(user)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export function deleteAccount(
  provider: string,
  providerAccountId: string,
): Promise<Account | undefined> {
  return db
    .deleteFrom('account')
    .where('provider', '=', provider)
    .where('providerAccountId', '=', providerAccountId)
    .returningAll()
    .executeTakeFirst();
}
export function getById(id: number): Promise<Account> {
  return db
    .selectFrom('account')
    .where('id', '=', id)
    .selectAll()
    .executeTakeFirstOrThrow();
}

export function TEMPgetByUserId(id: number): Promise<Account> {
  return db
    .selectFrom('account')
    .where('userId', '=', id)
    .selectAll()
    .executeTakeFirstOrThrow();
}

export function update(id: number, updateWith: AccountUpdate) {
  return db
    .updateTable('account')
    .set(updateWith)
    .where('id', '=', id)
    .execute();
}
