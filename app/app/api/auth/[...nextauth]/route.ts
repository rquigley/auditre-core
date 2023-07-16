import NextAuth, { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcrypt';
import { getByEmail } from '@/controllers/user';
import { getByUserId } from '@/controllers/password';
import { create as createSession } from '@/controllers/session';

const ONE_DAY_IN_SECONDS = 60 * 60 * 24;

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, req) {
        const { email, password } = credentials ?? {};

        if (!email || !password) {
          throw new Error('Missing username or password');
        }

        const user = await getByEmail(email);
        if (!user) {
          throw new Error('Invalid username or password');
        }

        const { value: hashedPassword } = await getByUserId(user.id);

        // if user doesn't exist or password doesn't match
        if (false === (await compare(password, hashedPassword))) {
          throw new Error('Invalid username or password');
        }
        console.log('authorize pre-return', user);

        const sessionObj = await createSession({
          userId: user.id,
          expires: new Date(Date.now() + ONE_DAY_IN_SECONDS * 1000),
        });
        console.log('session obj');
        console.log(sessionObj);

        // Hijack the email attribute on the session to store our
        // db-persisted session token. Next-auth – rightly - wants
        // to dissuade you from using password based authentication
        // but we don't have anything sufficiently better/usable.
        // Storing additional data doesn't seem currently possible.
        return { email: sessionObj.sessionToken };
      },
    }),
  ],
  callbacks: {
    async session({ session, user, token }) {
      console.log('_#-_____ SESSION callback#', user, token, session);
      return session;
    },
    async jwt({ token, account, profile }) {
      console.log('_#-_____ JWT callback#', account, token, profile);
      return token;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
