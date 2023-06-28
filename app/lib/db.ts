import { Connection, Pool } from "pg";
import { Kysely, PostgresDialect, CamelCasePlugin } from "kysely";
import { Database } from "@/types";

// const db = new Kysely<Database>({
//   dialect: new PostgresDialect({
//     pool: new Pool({
//       host: "localhost",
//       database: "auditre",
//     }),
//   }),
//   plugins: [new CamelCasePlugin()],
// });

//let __DB_INSTANCE__: Kysely<Database> | undefined;

export const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: async () =>
      new Pool({
        database: process.env.DB_DATABASE,
        host: process.env.DB_HOSTNAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
      }),
  }),
  plugins: [new CamelCasePlugin()],
});
