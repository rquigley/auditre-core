import NextAuth from 'next-auth';
import EmailProvider from 'next-auth/providers/email';
import GoogleProvider from 'next-auth/providers/google';

import { getInvitationsByEmail } from '@/controllers/invitation';
import { getByEmail as getUserByEmail, updateUser } from '@/controllers/user';
//import GitHubProvider from 'next-auth/providers/github';
import { AuthAdapter } from '@/lib/auth-adapter';
import { sendVerificationRequest } from '@/lib/email';
import { OrgId } from '@/types';

import type { AdapterUser } from '@auth/core/adapters';

export const {
  handlers: { GET, POST },
  auth,
} = NextAuth({
  providers: [
    EmailProvider({
      name: 'email',
      server: '',
      from: 'AuditRe (eg: team@auditre.co)',
      sendVerificationRequest,
    }),
    GoogleProvider({
      allowDangerousEmailAccountLinking: true,

      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  ],
  // pages: {
  //   //signIn: `/login`,
  //   verifyRequest: `/login`, // (used for check email message)
  //   //signOut: '/auth/signout',
  //   //verifyRequest: '/auth/verify-request', // (used for check email message)
  //   //newUser: '/', // New users will be directed here on first sign in (leave the property out if not of interest)
  //   //error: '/login', // Error code passed in query string as ?error=
  // },
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
    // https://next-auth.js.org/configuration/callbacks#jwt-callback
    // NOT INVOKED IF USING DB SESSIONS
    // jwt: async ({ token, user }) => {
    //   console.log('jwt callback', token, user);
    //   if (user) {
    //     token.user = user;
    //   }
    //   return token;
    // },
    // https://next-auth.js.org/configuration/callbacks#session-callback
    // @ts-expect-error
    session: async ({
      session,
      token,
      user,
    }: {
      session: { user: AdapterUser; expires: string };
      token: unknown;
      user: AdapterUser & { id: string; currentOrgId: OrgId };
    }) => {
      return {
        expires: session.expires,
        user: {
          ...session.user,
          id: user.id,
        },
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
  //     console.error('error', code, metadata);
  //   },
  //   warn(code) {
  //     console.warn('warn', code);
  //   },
  //   debug(code, metadata) {
  //     console.debug('debug', code, metadata);
  //   },
  // },
});
