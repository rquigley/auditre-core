import { revalidateTag } from 'next/cache';

import {
  getByEmail as getInviteByEmail,
  update as updateInvite,
} from '@/controllers/invitation';
import {
  createSession,
  deleteSession,
  updateSession,
} from '@/controllers/session';
import {
  createUser,
  getBySessionTokenCached,
  getByAccountProviderAndProviderId as getUserByAccountProviderAndProviderId,
  getByEmail as getUserByEmail,
  getById as getUserById,
  updateUser,
} from '@/controllers/user';
import {
  createUserAccount,
  deleteUserAccount,
} from '@/controllers/user-account';
import {
  createVerificationToken,
  deleteVerificationToken,
  getByIdentifier as getVerificationTokenByIdentifier,
} from '@/controllers/verification-token';

import type { User } from '@/types';
import type {
  Adapter,
  AdapterAccount,
  AdapterSession,
  AdapterUser,
  VerificationToken,
} from '@auth/core/adapters';

function userToAdapterUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    emailVerified: user.emailVerified,
  };
}

export function AuthAdapter(): Adapter {
  return {
    createUser: async (data) => {
      const invite = await getInviteByEmail(data.email);
      if (!invite) {
        throw new Error('No invite found for email');
      }
      await updateInvite(invite.id, {
        isUsed: true,
      });
      const user = await createUser({
        orgId: invite.orgId,
        name: data.name,
        email: data.email,
        image: data.image,
        emailVerified: data.emailVerified,
      });
      return userToAdapterUser(user) as AdapterUser;
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

    deleteUser: async (id) => {
      const user = await getUserById(id);
      await updateUser(user.id, {
        isDeleted: true,
      });
    },

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

    unlinkAccount: ({ provider, providerAccountId }) => {
      return deleteUserAccount(
        provider,
        providerAccountId,
      ) as unknown as AdapterAccount;
    },

    getSessionAndUser: async (sessionToken) => {
      const userAndSession = await getBySessionTokenCached(sessionToken);
      if (!userAndSession) {
        return null;
      }
      const { user, session } = userAndSession;
      // expires is cast to string to allow it to be cached by next/cache unstable_cache.
      // See https://github.com/vercel/next.js/issues/51613
      const expires = new Date(session.expires);
      return {
        user: user as AdapterUser,
        session: {
          ...session,
          expires,
        } as AdapterSession,
      };
    },

    createSession: async (data) => {
      const user = await getUserById(data.userId);
      const session = await createSession({
        sessionToken: data.sessionToken,
        userId: user.id,
        expires: data.expires,
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
      const verificationToken = await createVerificationToken({
        expires: data.expires,
        token: data.token,
      });

      return verificationToken as VerificationToken;
    },

    useVerificationToken: async ({ identifier, token }) => {
      const verificationToken =
        await getVerificationTokenByIdentifier(identifier);
      if (verificationToken && verificationToken.token === token) {
        await deleteVerificationToken(identifier);
      } else {
        return null;
      }
      return verificationToken;
    },
  };
}
