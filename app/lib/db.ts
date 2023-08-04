//import 'server-only';

import { Pool } from 'pg';
import {
  Kysely,
  PostgresDialect,
  CamelCasePlugin,
  RawBuilder,
  sql,
} from 'kysely';
import { z } from 'zod';
import type { Database } from '@/types';
const dBConfig = z.object({
  database: z.string().min(3).max(40),
  host: z.string().min(3).max(128),
  user: z.string().min(3).max(40),
  password: z.string().min(3).max(255),
});

const dialect = new PostgresDialect({
  pool: async () => {
    const config = {
      database: process.env.DB_DATABASE,
      host: process.env.DB_HOSTNAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    };
    try {
      dBConfig.parse(config);
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error(err.message);
      }
      process.exit(1);
    }

    return new Pool(config);
  },
});

export function json<T>(value: T): RawBuilder<T> {
  return sql`CAST(${JSON.stringify(value)} AS JSONB)`;
}

export const db = new Kysely<Database>({
  dialect,
  plugins: [new CamelCasePlugin()],
});
