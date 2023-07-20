import 'server-only';

import { db } from '@/lib/db';
import { NewPassword, Password, PasswordUpdate, UserId } from '@/types';
import { generatePassword } from '@/lib/util';
import { hash } from 'bcrypt';

export async function create({
  userId,
  value,
}: {
  userId: UserId;
  value: string | undefined;
}): Promise<Password> {
  if (!value) {
    value = generatePassword();
  }
  value = await hash(value, 4);

  return db
    .insertInto('password')
    .values({
      userId,
      value,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export function getById(id: number): Promise<Password> {
  return db
    .selectFrom('password')
    .where('id', '=', id)
    .selectAll()
    .executeTakeFirstOrThrow();
}

export function getByUserId(userId: UserId): Promise<Password> {
  return db
    .selectFrom('password')
    .where('userId', '=', userId)
    .selectAll()
    .executeTakeFirstOrThrow();
}

export async function updateByUserId(
  userId: UserId,
  updateWith: PasswordUpdate,
) {
  return db
    .updateTable('password')
    .set(updateWith)
    .where('userId', '=', userId)
    .execute();
}
