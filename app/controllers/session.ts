import { db } from "@/lib/db";
import { SessionUpdate, Session, NewSession } from "@/types";

export async function create(user: NewSession): Promise<Session> {
  return db
    .insertInto("session")
    .values(user)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteBySessionToken(
  sessionToken: string
): Promise<number> {
  return db
    .deleteFrom("session")
    .where("sessionToken", "=", sessionToken)
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

export async function updateBySessionToken(
  sessionToken: string,
  updateWith: SessionUpdate
) {
  return db
    .updateTable("session")
    .set(updateWith)
    .where("sessionToken", "=", sessionToken)
    .execute();
}
