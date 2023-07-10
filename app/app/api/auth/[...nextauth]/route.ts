import NextAuth, { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcrypt';
import { getByEmail } from '@/controllers/user';
import { TEMPgetByUserId } from '@/controllers/account';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const { email, password } = credentials ?? {};

        if (!email || !password) {
          throw new Error('Missing username or password');
        }

        const user = await getByEmail(email);
        if (!user) {
          throw new Error('Invalid username or password');
        }
        // TODO: this is a hack
        const account = await TEMPgetByUserId(user.id);
        const hashedPassword = account.providerAccountId;

        // if user doesn't exist or password doesn't match
        if (false === (await compare(password, hashedPassword))) {
          throw new Error('Invalid username or password');
        }
        return user;
      },
    }),
  ],
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
