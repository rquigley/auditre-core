import { Pool } from "pg";
import { Kysely, PostgresDialect, CamelCasePlugin } from "kysely";
import { Database } from "@/types";
console.log(process.env);
const dialect = new PostgresDialect({
  pool: async () =>
    new Pool({
      database: process.env.DB_DATABASE,
      host: process.env.DB_HOSTNAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    }),
});

export const db = new Kysely<Database>({
  dialect,
  plugins: [new CamelCasePlugin()],
});
