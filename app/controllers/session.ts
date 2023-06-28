import { db } from "@/lib/db";
import { SessionUpdate, Session, NewSession } from "@/types";

export async function create(user: NewSession): Promise<Session> {
  return db
    .insertInto("session")
    .values(user)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteSession(id: number): Promise<number> {
  return db
    .deleteFrom("session")
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();
}
export async function getById(id: number): Promise<Session> {
  return db
    .selectFrom("session")
    .where("id", "=", id)
    .selectAll()
    .executeTakeFirstOrThrow();
}

export async function getByUserId(userId: number): Promise<Session> {
  return db
    .selectFrom("session")
    .where("userId", "=", userId)
    .selectAll()
    .executeTakeFirstOrThrow();
}

export async function update(id: number, updateWith: SessionUpdate) {
  return db
    .updateTable("session")
    .set(updateWith)
    .where("id", "=", id)
    .execute();
}
