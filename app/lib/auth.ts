import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import { AuthAdapter } from '@/lib/auth-adapter';
import { getByEmail as getInviteByEmail } from '@/controllers/invitation';
import {
  getByExternalId as getUserByExternalId,
  getByEmail as getUserByEmail,
} from '@/controllers/user';

export const {
  handlers: { GET, POST },
  auth,
  CSRF_experimental,
} = NextAuth({
  // debug: true,
  useSecureCookies: false,
  providers: [
    // GitHubProvider({
    //   //allowDangerousEmailAccountLinking: true,
    //   clientId: process.env.GITHUB_ID as string,
    //   clientSecret: process.env.GITHUB_SECRET as string,
    //   profile(profile) {
    //     return {
    //       id: profile.id.toString(),
    //       name: profile.name || profile.login,
    //       gh_username: profile.login,
    //       email: profile.email,
    //       image: profile.avatar_url,
    //     };
    //   },
    // }),
    GoogleProvider({
      allowDangerousEmailAccountLinking: true,

      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      // https://next-auth.js.org/providers/google#example
    }),
  ],
  pages: {
    //signIn: `/login`,
    verifyRequest: `/login`, // (used for check email message)
    //signOut: '/auth/signout',
    //verifyRequest: '/auth/verify-request', // (used for check email message)
    newUser: '/', // New users will be directed here on first sign in (leave the property out if not of interest)
    //error: '/login', // Error code passed in query string as ?error=
  },
  adapter: AuthAdapter(),
  cookies: {
    sessionToken: {
      name: `${
        process.env.ENVIRONMENT !== 'development' ? '__Secure-' : ''
      }next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        // When working on localhost, the cookie domain must be omitted entirely (https://stackoverflow.com/a/1188145)
        domain:
          process.env.ENVIRONMENT !== 'development'
            ? `.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`
            : undefined,
        secure: process.env.ENVIRONMENT !== 'development',
      },
    },
    pkceCodeVerifier: {
      name: 'next-auth.pkce.code_verifier',
      options: {
        httpOnly: true,
        //sameSite: 'none',
        sameSite: 'lax',
        path: '/',
        secure: process.env.ENVIRONMENT !== 'development',
      },
    },
  },
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
    // session: async ({
    //   session,
    //   token,
    //   user,
    // }: {
    //   session: any;
    //   token: any;
    //   user: unknown;
    // }) => {
    //   console.log('session callback', { session, token, user });
    //   session.user = {
    //     ...session.user,
    //     id: token.sub,
    //     username: token?.user?.username || token?.user?.gh_username,
    //   };
    //   return session;
    // },

    signIn: async ({
      user,
      account,
      profile,
      email,
      credentials,
    }: {
      user: any;
      account: any;
      profile?: any;
      email?: any;
      credentials?: any;
    }) => {
      console.log({
        label: 'signIn callback2',
        user,
        account,
        profile,
        email,
        credentials,
      });
      // TEMP TEST
      return true;
      if (user) {
        try {
          // console.log('this might be an oauth google user id', user.id);

          const existingUser = await getUserByExternalId(user.id);
          if (existingUser && existingUser.email === user.email) {
            // console.log('HERE, existing user exists');
            return true;
          }
        } catch (err) {
          // console.log('might be fine', err);
          // not doing anything here because this might be an oauth user id
        }
      }

      // oauth updates
      // read up on potential solution here:
      // https://github.com/nextauthjs/next-auth/issues/3599#issuecomment-1069777477
      const newEmail = user?.email || profile?.email;
      if (newEmail) {
        const invite = await getInviteByEmail(newEmail);
        if (invite) {
          // console.log('HERE, using invite code');
          return true;
        }
        const existingUser = await getUserByEmail(newEmail);
        if (existingUser) {
          // console.log('HERE, using existing email');
          return true;
        }
      }

      // console.log('HERE, not allowed to sign up/in');
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
