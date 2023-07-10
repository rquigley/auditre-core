import { Pool } from 'pg';
import { Kysely, PostgresDialect, CamelCasePlugin } from 'kysely';
import { Database } from '@/types';

const dialect = new PostgresDialect({
  pool: async () => {
    if (!process.env.DB_DATABASE) {
      throw new Error('DB_DATABASE not set');
    }
    return new Pool({
      database: process.env.DB_DATABASE,
      host: process.env.DB_HOSTNAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });
  },
});

export const db = new Kysely<Database>({
  dialect,
  plugins: [new CamelCasePlugin()],
});
