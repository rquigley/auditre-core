import { getDb } from "@/lib/db";
import {
  VerificationTokenUpdate,
  VerificationToken,
  NewVerificationToken,
} from "@/types";

export async function create(
  user: NewVerificationToken
): Promise<VerificationToken> {
  return getDb()
    .insertInto("verificationToken")
    .values(user)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteVerificationToken(
  identifier: number
): Promise<void> {
  return getDb()
    .deleteFrom("verificationToken")
    .where("identifier", "=", identifier)
    .returningAll()
    .executeTakeFirst();
}
export async function getByIdentifier(
  identifier: number
): Promise<VerificationToken> {
  return getDb()
    .selectFrom("verificationToken")
    .where("identifier", "=", identifier)
    .selectAll()
    .executeTakeFirstOrThrow();
}

export async function update(
  identifier: number,
  updateWith: VerificationTokenUpdate
) {
  await getDb()
    .updateTable("verificationToken")
    .set(updateWith)
    .where("identifier", "=", identifier)
    .execute();
}
