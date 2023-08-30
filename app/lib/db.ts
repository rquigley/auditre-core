//import 'server-only';

import { Pool } from 'pg';
import {
  Kysely,
  PostgresDialect,
  CamelCasePlugin,
  RawBuilder,
  LogConfig,
  sql,
} from 'kysely';
import { z } from 'zod';
import type { Database } from '../types';
const dBConfig = z.object({
  database: z.string().min(3),
  host: z.string().min(3),
  password: z.string().min(3),
  port: z.number(),
  user: z.string().min(3),
});

const dialect = new PostgresDialect({
  pool: async () => {
    let config;
    if (process.env.AWS_RDS_DB_CREDS) {
      // AWS creds come from an encrypted rds.DatabaseSecret
      const creds = JSON.parse(process.env.AWS_RDS_DB_CREDS) as {
        dbname: string;
        host: string;
        password: string;
        port: number;
        username: string;
      };
      config = {
        database: creds.dbname,
        host: creds.host,
        password: creds.password,
        port: creds.port,
        user: creds.username,
        ssl: {
          rejectUnauthorized: false,
        },
      };
    } else {
      config = {
        database: process.env.DB_DATABASE,
        host: process.env.DB_HOSTNAME,
        password: process.env.DB_PASSWORD,
        port: 5432,
        user: process.env.DB_USER,
      };
    }
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

let log: LogConfig;
if (process.env.LOG_QUERIES) {
  log = ['query', 'error'];
} else {
  log = [];
}
export const db = new Kysely<Database>({
  dialect,
  plugins: [new CamelCasePlugin()],
  log,
});
