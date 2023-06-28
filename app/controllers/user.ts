import { getDb } from "@/lib/db";
import { UserUpdate, User, NewUser } from "@/types";

export async function create(user: NewUser): Promise<User> {
  return getDb()
    .insertInto("user")
    .values(user)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function getById(id: number): Promise<User> {
  return getDb()
    .selectFrom("user")
    .where("id", "=", id)
    .selectAll()
    .executeTakeFirstOrThrow();
}

export async function getByEmail(email: string): Promise<User> {
  return getDb()
    .selectFrom("user")
    .where("email", "=", email)
    .selectAll()
    .executeTakeFirstOrThrow();
}

export async function update(id: number, updateWith: UserUpdate) {
  await getDb()
    .updateTable("user")
    .set(updateWith)
    .where("id", "=", id)
    .execute();
}
