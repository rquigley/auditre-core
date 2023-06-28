import { getDb } from "@/lib/db";
import { AccountUpdate, Account, NewAccount } from "@/types";

export async function create(user: NewAccount): Promise<Account> {
  return getDb()
    .insertInto("account")
    .values(user)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteAccount(
  provider: string,
  providerAccountId: string
): Promise<void> {
  return getDb()
    .deleteFrom("account")
    .where("provider", "=", provider)
    .where("providerAccountId", "=", providerAccountId)
    .returningAll()
    .executeTakeFirst();
}
export async function getById(id: number): Promise<Account> {
  return getDb()
    .selectFrom("account")
    .where("id", "=", id)
    .selectAll()
    .executeTakeFirstOrThrow();
}

export async function update(id: number, updateWith: AccountUpdate) {
  await getDb()
    .updateTable("account")
    .set(updateWith)
    .where("id", "=", id)
    .execute();
}
