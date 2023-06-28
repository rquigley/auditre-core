//import { db } from '@/lib/db';
import type { Adapter, AdapterAccount } from "@auth/core/adapters";
import { Kysely } from "kysely";
import { Database } from "@/types";
import * as userController from "@/controllers/user";
import * as accountController from "@/controllers/account";
import * as Types from "@/types";

export function AuthAdapter(p: Kysely<Database>): Adapter {
  return {
    createUser: (data) =>
      userController.create({
        name: data.name,
        email: data.email,
        image: data.image,
      }),

    getUser: (id: string) => userController.getById(Number(id)),

    getUserByEmail: (email: string) => userController.getByEmail(email),
    async getUserByAccount(provider_providerAccountId) {
      const account = await p.account.findUnique({
        where: { provider_providerAccountId },
        select: { user: true },
      });
      return account?.user ?? null;
    },

    updateUser: ({ id, ...data }) => userController.update(id, { data }),

    deleteUser: {},
    ///////////////
    linkAccount: (data) =>
      accountController.create({ data }) as unknown as AdapterAccount,

    unlinkAccount: ({ provider, providerAccountId }) =>
      accountController.deleteAccount(
        provider,
        providerAccountId
      ) as unknown as AdapterAccount,

    ///////////////
    async getSessionAndUser(sessionToken) {
      const userAndSession = await p.session.findUnique({
        where: { sessionToken },
        include: { user: true },
      });
      if (!userAndSession) return null;
      const { user, ...session } = userAndSession;
      return { user, session };
    },
    createSession: (data) => p.session.create({ data }),
    updateSession: (data) =>
      p.session.update({ where: { sessionToken: data.sessionToken }, data }),
    deleteSession: (sessionToken) =>
      p.session.delete({ where: { sessionToken } }),

    ///////////////
    async createVerificationToken(data) {
      const verificationToken = await p.verificationToken.create({ data });
      // @ts-expect-errors // MongoDB needs an ID, but we don't
      if (verificationToken.id) delete verificationToken.id;
      return verificationToken;
    },
    async useVerificationToken(identifier_token) {
      try {
        const verificationToken = await p.verificationToken.delete({
          where: { identifier_token },
        });
        // @ts-expect-errors // MongoDB needs an ID, but we don't
        if (verificationToken.id) delete verificationToken.id;
        return verificationToken;
      } catch (error) {
        // If token already used/deleted, just return null
        // https://www.prisma.io/docs/reference/api-reference/error-reference#p2025
        if ((error as Prisma.PrismaClientKnownRequestError).code === "P2025")
          return null;
        throw error;
      }
    },
  };
}
