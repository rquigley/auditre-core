import NextAuth from "next-auth";
import Email from "next-auth/providers/email";
import GitHub from "next-auth/providers/github";
import { AuthAdapter } from "@/lib/auth-adapter";
import authConfig from "./auth.config";

// authConfig.providers.push(
//   // Start server with `pnpm email`
//   // @ts-expect-error
//   Email({ server: "smtp://127.0.0.1:1025?tls.rejectUnauthorized=false" })
// );

export const {
  handlers: { GET, POST },
  auth,
  CSRF_experimental,
  // @ts-ignore
} = NextAuth({
  adapter: AuthAdapter(),
  ...authConfig,
});
