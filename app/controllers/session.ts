import { getDb } from "@/lib/db";
import { SessionUpdate, Session, NewSession } from "@/types";

export async function create(user: NewSession): Promise<Session> {
  return getDb()
    .insertInto("session")
    .values(user)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteSession(id: number): Promise<number> {
  return getDb()
    .deleteFrom("session")
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();
}
export async function getById(id: number): Promise<Session> {
  return getDb()
    .selectFrom("session")
    .where("id", "=", id)
    .selectAll()
    .executeTakeFirstOrThrow();
}

export async function getByUserId(userId: number): Promise<Session> {
  return getDb()
    .selectFrom("session")
    .where("userId", "=", userId)
    .selectAll()
    .executeTakeFirstOrThrow();
}

export async function update(id: number, updateWith: SessionUpdate) {
  await getDb()
    .updateTable("session")
    .set(updateWith)
    .where("id", "=", id)
    .execute();
}
