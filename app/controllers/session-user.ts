import { cache } from 'react';

import { auth } from '@/lib/auth';
import { getByEmail } from './user';

import type { User } from '@/types';

export async function getCurrent(): Promise<User> {
  const session = await auth();
  if (!session) {
    throw new Error('No session found');
  }

  // TODO: we _should_ use sesion.user?.id here, but
  // the next-auth type is currently only set for client-side methods
  // which does not include the id. Use email for now.
  const email = session.user?.email;
  if (email) {
    const user = await getByEmailCached(email);
    if (user) {
      return user;
    }
  }
  throw new Error('No session found');
}

const getByEmailCached = cache(async (email: string) => {
  return await getByEmail(email, { comment: 'getByEmailCached' });
});
