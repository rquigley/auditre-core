import { db } from "@/lib/db";
import {
  VerificationTokenUpdate,
  VerificationToken,
  NewVerificationToken,
} from "@/types";

export async function create(
  user: NewVerificationToken
): Promise<VerificationToken> {
  return db
    .insertInto("verificationToken")
    .values(user)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteVerificationToken(
  identifier: number
): Promise<void> {
  return db
    .deleteFrom("verificationToken")
    .where("identifier", "=", identifier)
    .returningAll()
    .executeTakeFirst();
}
export async function getByIdentifier(
  identifier: number
): Promise<VerificationToken> {
  return db
    .selectFrom("verificationToken")
    .where("identifier", "=", identifier)
    .selectAll()
    .executeTakeFirstOrThrow();
}

export async function update(
  identifier: number,
  updateWith: VerificationTokenUpdate
) {
  return db
    .updateTable("verificationToken")
    .set(updateWith)
    .where("identifier", "=", identifier)
    .execute();
}
