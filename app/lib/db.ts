import { Pool } from "pg";
import { Kysely, PostgresDialect, CamelCasePlugin } from "kysely";
import { Database } from "@/types";

const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: new Pool({
      host: "localhost",
      database: "auditre",
    }),
  }),
  plugins: [new CamelCasePlugin()],
});

let __DB_INSTANCE__: Kysely<Database> | undefined;

export function getDb() {
  if (!__DB_INSTANCE__) {
    __DB_INSTANCE__ = new Kysely<Database>({
      dialect: new PostgresDialect({
        pool: new Pool({
          host: "localhost",
          database: "auditre",
        }),
      }),
    });
  }
  return __DB_INSTANCE__;
}
