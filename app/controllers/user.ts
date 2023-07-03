import { db } from "@/lib/db";
import { UserUpdate, User, NewUser } from "@/types";

export async function create(user: NewUser): Promise<User> {
  return db
    .insertInto("user")
    .values(user)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function getById(id: number): Promise<User> {
  return db
    .selectFrom("user")
    .where("id", "=", id)
    .selectAll()
    .executeTakeFirstOrThrow();
}

export async function getByEmail(email: string): Promise<User | undefined> {
  return db
    .selectFrom("user")
    .where("email", "=", email)
    .selectAll()
    .executeTakeFirst();
}

export async function getByAccountProviderAndProviderId(
  provider: string,
  providerAccountId: string
): Promise<User | undefined> {
  return db
    .selectFrom("user")
    .innerJoin("account", "account.userId", "user.id")
    .where("account.provider", "=", provider)
    .where("account.providerAccountId", "=", providerAccountId)
    .selectAll("user")
    .executeTakeFirst();
}

export async function update(id: number, updateWith: UserUpdate) {
  return db.updateTable("user").set(updateWith).where("id", "=", id).execute();
}
