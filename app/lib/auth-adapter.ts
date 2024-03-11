import * as Sentry from '@sentry/node';
import { revalidatePath, revalidateTag } from 'next/cache';

import {
  createSession,
  deleteSession,
  updateSession,
} from '@/controllers/session';
import {
  getBySessionTokenCached,
  getOrgsForUserIdCached,
  getByAccountProviderAndProviderId as getUserByAccountProviderAndProviderId,
  getUserByEmail,
  getById as getUserById,
  invitesToUser,
  updateUser,
} from '@/controllers/user';
import { createUserAccount } from '@/controllers/user-account';
import {
  createVerificationToken,
  deleteVerificationTokens,
  getVerificationToken,
} from '@/controllers/verification-token';

import type { OrgId, User } from '@/types';
import type {
  Adapter,
  AdapterAccount,
  AdapterSession,
  AdapterUser,
} from '@auth/core/adapters';

function userToAdapterUser(
  user: Pick<User, 'id' | 'name' | 'email' | 'image'> & {
    emailVerified: Date | null;
  },
): AdapterUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email || '',
    image: user.image,
    emailVerified: user.emailVerified,
  };
}

export function AuthAdapter(): Adapter {
  return {
    createUser: async (data) => {
      const res = await invitesToUser(data.email, {
        name: data.name,
        image: data.image,
        emailVerified: data.emailVerified,
      });
      if (!res.success || !res.user) {
        const err = new Error('Failed to create user');
        Sentry.captureException(err);
        throw err;
      }

      revalidatePath('/');
      return userToAdapterUser(res.user) as AdapterUser;
    },

    getUser: async (id: string) => {
      const user = await getUserById(id);
      if (!user) {
        return null;
      }
      return userToAdapterUser(user) as AdapterUser;
    },

    getUserByEmail: async (email: string) => {
      const user = await getUserByEmail(email);
      if (!user) {
        return null;
      }

      return userToAdapterUser(user) as AdapterUser;
    },

    getUserByAccount: async ({ provider, providerAccountId }) => {
      const user = await getUserByAccountProviderAndProviderId(
        provider,
        providerAccountId,
      );
      if (!user) {
        return null;
      }

      return userToAdapterUser(user) as AdapterUser;
    },

    updateUser: async ({ id, ...data }) => {
      const user = await getUserById(id);

      await updateUser(user.id, {
        name: data.name,
        email: data.email,
        emailVerified: data.emailVerified,
        image: data.image,
      });
      const user2 = await getUserById(id);

      return userToAdapterUser(user2) as AdapterUser;
    },

    // Not yet invoked by Auth.js
    // https://authjs.dev/guides/adapters/creating-a-database-adapter#user-management
    // deleteUser: async (id) => {
    //   const user = await getUserById(id);
    //   await updateUser(user.id, {
    //     isDeleted: true,
    //   });
    //   revalidatePath('/');
    // },

    linkAccount: async (account) => {
      // https://github.com/nextauthjs/next-auth/discussions/1601
      const {
        type,
        provider,
        providerAccountId,
        access_token: accessToken,
        expires_at: expiresAt,
        token_type: tokenType,
        scope,
        id_token: idToken,
        userId,
      } = account;
      const user = await getUserById(userId);
      return createUserAccount({
        userId: user.id,
        type,
        provider,
        providerAccountId,
        accessToken,
        expiresAt,
        tokenType,
        scope,
        idToken,
      }) as unknown as AdapterAccount;
    },

    // Not yet invoked by Auth.js
    // https://authjs.dev/guides/adapters/creating-a-database-adapter#user-management
    // unlinkAccount: ({ provider, providerAccountId }) => {
    //   return deleteUserAccount(
    //     provider,
    //     providerAccountId,
    //   ) as unknown as AdapterAccount;
    // },

    getSessionAndUser: async (sessionToken) => {
      const userAndSession = await getBySessionTokenCached(sessionToken);
      if (!userAndSession) {
        return null;
      }
      const { user, session } = userAndSession;
      user.currentOrgId = session.currentOrgId;
      // expires is cast to string to allow it to be cached by next/cache unstable_cache.
      // See https://github.com/vercel/next.js/issues/51613
      const expires = new Date(session.expires);
      return {
        user: user as AdapterUser & { currentOrgId: OrgId },
        session: {
          ...session,
          expires,
        } as AdapterSession,
      };
    },

    createSession: async (data) => {
      const user = await getUserById(data.userId);
      const availableOrgs = await getOrgsForUserIdCached(data.userId);
      let currentOrgId;
      if (availableOrgs.length > 0) {
        currentOrgId = availableOrgs[0].id;
      } else {
        throw new Error('No orgs found for user');
      }
      const session = await createSession({
        sessionToken: data.sessionToken,
        userId: user.id,
        expires: data.expires,
        currentOrgId,
      });
      return {
        sessionToken: session.sessionToken,
        userId: user.id,
        expires: session.expires,
      } as AdapterSession;
    },

    updateSession: async (data) => {
      await updateSession(data.sessionToken, {
        expires: data.expires,
      });

      revalidateTag('session-token-user');

      return {
        sessionToken: data.sessionToken,
        userId: data.userId,
        expires: data.expires,
      } as AdapterSession;
    },

    deleteSession: async (sessionToken) => {
      await deleteSession(sessionToken);
      revalidateTag('session-token-user');
    },

    createVerificationToken: async (data) => {
      return await createVerificationToken(data);
    },

    useVerificationToken: async ({ identifier, token }) => {
      const verificationToken = await getVerificationToken(identifier, token);
      if (verificationToken) {
        await deleteVerificationTokens(identifier);
      } else {
        return null;
      }
      return verificationToken;
    },
  };
}
