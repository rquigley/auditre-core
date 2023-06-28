import { db } from "@/lib/db";
import { AccountUpdate, Account, NewAccount } from "@/types";

export async function create(user: NewAccount): Promise<Account> {
  return db
    .insertInto("account")
    .values(user)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteAccount(
  provider: string,
  providerAccountId: string
): Promise<void> {
  return db
    .deleteFrom("account")
    .where("provider", "=", provider)
    .where("providerAccountId", "=", providerAccountId)
    .returningAll()
    .executeTakeFirst();
}
export async function getById(id: number): Promise<Account> {
  return db
    .selectFrom("account")
    .where("id", "=", id)
    .selectAll()
    .executeTakeFirstOrThrow();
}

export async function update(id: number, updateWith: AccountUpdate) {
  return db
    .updateTable("account")
    .set(updateWith)
    .where("id", "=", id)
    .execute();
}
