import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';

export const {
  handlers: { GET, POST },
  auth,
  CSRF_experimental,
  // @ts-ignore
} = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    }),
  ],
  callbacks: {
    // @ts-ignore
    async jwt({ token }) {
      token.userRole = 'admin';
      return token;
    },
  },
});
