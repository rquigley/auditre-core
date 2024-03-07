import { customAlphabet } from 'nanoid/non-secure';
import NextAuth from 'next-auth';
import EmailProvider from 'next-auth/providers/email';
import GoogleProvider from 'next-auth/providers/google';
import { revalidateTag } from 'next/cache';

import { getInvitationsByEmail } from '@/controllers/invitation';
import { getByEmail as getUserByEmail, updateUser } from '@/controllers/user';
//import GitHubProvider from 'next-auth/providers/github';
import { AuthAdapter } from '@/lib/auth-adapter';
import { sendVerificationRequest } from '@/lib/email';
import { OrgId } from '@/types';

import type { AdapterSession, AdapterUser } from '@auth/core/adapters';
import type { JWT } from '@auth/core/jwt';
import type { Session } from '@auth/core/types';

// from https://github.com/nextauthjs/next-auth/blob/f9306df3e6190d9bfa6fe938554eadae61e69e13/apps/dev/nextjs/auth.config.ts
// declare module "next-auth" {
//   /**
//    * Returned by `useSession`, `getSession`, `auth` and received as a prop on the `SessionProvider` React Context
//    */
//   interface Session {
//     user: {
//       /** The user's postal address. */
//       address: string
//     } & User
//   }

//   interface User {
//     foo?: string
//   }
// }

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  providers: [
    EmailProvider({
      server: {},
      name: 'email',
      from: 'AuditRe <noreply@auditre.co>',
      sendVerificationRequest,
      generateVerificationToken,
    }),
    GoogleProvider({
      allowDangerousEmailAccountLinking: true,

      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      account: (account) => {
        // If you are using a database adapter and passing it additional fields from your provider, the default behaviour has changed. We used to automatically pass on all fields from the provider to the adapter. We no longer pass on all returned fields from your provider(s) to the adapter by default. We listened to the community, and decided to revert this to a similar state as it was in v3. You must now manually pass on your chosen fields in the provider's account callback, if the default is not working for you. See: account() docs.
        // https://authjs.dev/reference/core/providers#account
      },
    }),
  ],

  pages: {
    signIn: '/login',
    signOut: '/login',
    // error: '/login',
    verifyRequest: '/login',
    newUser: '/',
  },
  adapter: AuthAdapter(),
  // cookies: {
  //   sessionToken: {
  //     name: `${
  //       process.env.ENVIRONMENT !== 'development' ? '__Secure-' : ''
  //     }next-auth.session-token`,
  //     options: {
  //       httpOnly: true,
  //       sameSite: 'lax',
  //       path: '/',
  //       // When working on localhost, the cookie domain must be omitted entirely (https://stackoverflow.com/a/1188145)
  //       domain:
  //         process.env.ENVIRONMENT !== 'development'
  //           ? `.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`
  //           : undefined,
  //       secure: process.env.ENVIRONMENT !== 'development',
  //     },
  //   },
  //   pkceCodeVerifier: {
  //     name: 'next-auth.pkce.code_verifier',
  //     options: {
  //       httpOnly: true,
  //       //sameSite: 'none',
  //       sameSite: 'lax',
  //       path: '/',
  //       secure: process.env.ENVIRONMENT !== 'development',
  //     },
  //   },
  // },
  callbacks: {
    // https://authjs.dev/reference/core/types#jwt
    session: async (
      params:
        | {
            session: Session;
            user: AdapterUser;
            // newSession: any;
            // trigger?: 'update';
          }
        | {
            session: Session;
            token: JWT;
          },
    ) => {
      if ('token' in params) {
        throw new Error(
          'token is used with JWT, not db sessions. If this is hit, something is misconfigured.',
        );
      }
      const { session, user } = params;

      return {
        expires: session.expires,
        user: {
          ...session.user,
          id: user.id,
        },
        // @ts-expect-error - we hijack and extend currentOrgId
        currentOrgId: user.currentOrgId,
      };
    },
    // redirect: async ({ url, baseUrl }) => {
    //   console.log('redirect callback', { url, baseUrl });
    // },

    signIn: async ({
      user,
      account,
      profile,
      email,
      credentials,
    }: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      user: any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      account: any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      profile?: any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      email?: any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      credentials?: any;
    }) => {
      // oauth updates
      // read up on potential solution here:
      // https://github.com/nextauthjs/next-auth/issues/3599#issuecomment-1069777477
      const newEmail = user?.email || profile?.email;
      if (newEmail) {
        const existingUser = await getUserByEmail(newEmail);
        if (existingUser) {
          const changes: {
            name?: string;
            image?: string;
            emailVerified?: Date;
          } = {};
          if (profile) {
            if (
              profile.name &&
              (!existingUser.name || existingUser.name !== profile.name)
            ) {
              changes.name = profile.name;
            }
            if (
              typeof profile.picture === 'string' &&
              profile.picture.startsWith('https://') &&
              (!existingUser.image || existingUser.image !== profile.picture)
            ) {
              changes.image = profile.picture;
            }
            if (changes.name || changes.image) {
              await updateUser(existingUser.id, changes);
              revalidateTag('user-by-id');
            }
          }
          return true;
        }
        const invites = await getInvitationsByEmail(newEmail);
        if (invites.length > 0) {
          return true;
        }
      }

      // Return false to display a default error message
      return false;
      // Or you can return a URL to redirect to:
      // return '/unauthorized'
    },
  },
  // logger: {
  //   error(code, metadata) {
  //     console.error('auth error', code, metadata);
  //   },
  //   warn(code) {
  //     console.warn('auth warn', code);
  //   },
  //   debug(code, metadata) {
  //     console.debug('auth debug', code, metadata);
  //   },
  // },
});

// https://github.com/nextauthjs/next-auth/issues/4965
// https://github.com/nextauthjs/next-auth/issues/4965#issuecomment-1189094806
// https://www.ramielcreations.com/nexth-auth-magic-code
async function generateVerificationToken() {
  const nanoid = customAlphabet('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', 6);
  const token = nanoid();
  return `${token.slice(0, 3)}-${token.slice(3)}`;
}
