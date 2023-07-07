//import { db } from '@/lib/db';
import type {
  Adapter,
  AdapterAccount,
  AdapterSession,
  AdapterUser,
  VerificationToken,
} from "@auth/core/adapters";
import { Kysely } from "kysely";
import { Database } from "@/types";
import * as userController from "@/controllers/user";
import * as accountController from "@/controllers/account";
import * as sessionController from "@/controllers/session";
import * as Types from "@/types";

function isDate(date: any) {
  return (
    new Date(date).toString() !== "Invalid Date" && !isNaN(Date.parse(date))
  );
}

export function format<T>(obj: Record<string, any>): T {
  for (const [key, value] of Object.entries(obj)) {
    if (value === null) {
      delete obj[key];
    }

    if (isDate(value)) {
      obj[key] = new Date(value);
    }
  }

  return obj as T;
}

//export function AuthAdapter(p: Kysely<Database>): Adapter {
export function AuthAdapter(): Adapter {
  return {
    createUser: async (data) => {
      const user = userController.create({
        name: data.name,
        email: data.email,
        image: data.image,
        emailVerified: data.emailVerified,
      });
      return format<AdapterUser>(user);
    },

    getUser: async (id: string) => {
      const data = userController.getById(Number(id));
      if (!data) {
        return null;
      }
      return format<AdapterUser>(data);
    },

    getUserByEmail: async (email: string) => {
      const data = userController.getByEmail(email);
      if (!data) {
        return null;
      }
      return format<AdapterUser>(data);
    },

    getUserByAccount: async ({ provider, providerAccountId }) => {
      const data = await userController.getByAccountProviderAndProviderId(
        provider,
        providerAccountId
      );
      if (!data) {
        return null;
      }
      return format<AdapterUser>(data);
    },

    updateUser: ({ id, ...data }) =>
      userController.update(Number(id), { data }),

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
    createSession: (data) => sessionController.create({ data }),
    updateSession: (data) =>
      sessionController.updateBySessionToken(data.sessionToken, data),
    deleteSession: (sessionToken) =>
      sessionController.deleteBySessionToken(sessionToken),

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
