import { auth } from '@/lib/auth';
import { cache } from 'react';

import { getByEmail } from './user';

export async function getCurrent() {
  const session = await auth();
  if (!session) {
    return false;
  }

  // TODO: we _should_ use sesion.user?.id here (externalId), but
  // the next-auth type is currently only set for client-side methods
  // which does not include the id. Use email for now.
  const email = session.user?.email;
  if (email) {
    const user = await getByEmail(email);
    if (!user) {
      return false;
    }
    return user;
  }
}
