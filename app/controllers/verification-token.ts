import { z } from 'zod';

import { db } from '@/lib/db';

import type { NewVerificationToken } from '@/types';

export async function createVerificationToken(user: NewVerificationToken) {
  return await db
    .insertInto('auth.verificationToken')
    .values(user)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteVerificationTokens(identifier: string) {
  return await db
    .deleteFrom('auth.verificationToken')
    .where('identifier', '=', identifier)
    .returningAll()
    .executeTakeFirst();
}

export async function getVerificationToken(identifier: string, token: string) {
  return await db
    .selectFrom('auth.verificationToken')
    .where('identifier', '=', identifier)
    .where('token', '=', token)
    .selectAll()
    .executeTakeFirst();
}

export async function checkVerificationToken(email: string, token: string) {
  const schema = z.object({
    token: z.string().length(7),
    email: z.string().email(),
  });
  const res = schema.safeParse({ email, token });
  if (!res.success) {
    return { success: false, status: 'invalid' };
  }
  const hashedToken = await _createHash(
    `${res.data.token}${process.env.AUTH_SECRET}`,
  );
  const verificationToken = await getVerificationToken(
    res.data.email,
    hashedToken,
  );
  if (!verificationToken) {
    return { success: false, status: 'invalid' };
  }
  console.log(verificationToken.expires, new Date());
  if (verificationToken.expires < new Date()) {
    return { success: false, message: 'expired' };
  }
  return { success: true, status: 'valid' };
}

// Copied from https://github.com/nextauthjs/next-auth/blob/239dfcf71fb3267272e2d972f9551f6f8aea0105/packages/core/src/lib/utils/web.ts#L97
// This function is not exported from the next-auth package, so we have to copy it here.
export async function _createHash(message: string) {
  const data = new TextEncoder().encode(message);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toString();
}
