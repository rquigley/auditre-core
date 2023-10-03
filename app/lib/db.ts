//import 'server-only';

import {
  CamelCasePlugin,
  Kysely,
  LogConfig,
  PostgresDialect,
  RawBuilder,
  sql,
} from 'kysely';
import { Pool } from 'pg';
import pc from 'picocolors';
import { z } from 'zod';

import type { Database } from '../types';

const dBConfig = z.object({
  database: z.string().min(3),
  host: z.string().min(3),
  password: z.string().min(3),
  port: z.number(),
  user: z.string().min(3),
});
export { sql };

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
  log = (event) => {
    if (event.level === 'query' && process.env.LOG_QUERIES) {
      console.log(
        `SQL Query: ${event.query.sql}\n`,
        `  params: ${event.query.parameters}\n`,
        ` queryMs: ${event.queryDurationMillis}\n`,
        `   stack: ${prettyStack(new Error())}\n`,
      );
    } else if (event.level === 'error') {
      console.log(
        pc.red('ERROR\n'),
        pc.red(`SQL Query: ${event.query.sql}\n`),
        // @ts-ignore
        pc.red(` message: ${event.error?.message}\n`),

        process.env.LOG_QUERIES
          ? pc.red(`  params: ${event.query.parameters}\n`)
          : '',
        pc.red(` queryMs: ${event.queryDurationMillis}\n`),
        pc.red(`   stack: ${prettyStack(event.error)}\n`),
      );
    }
  };
} else {
  log = [];
}

export const db = new Kysely<Database>({
  dialect,
  plugins: [new CamelCasePlugin()],
  log,
});

function prettyStack(error: any) {
  const stack = error.stack.split('\n');
  let lines = [];
  while (true) {
    let line: string = stack.pop();
    if (line.indexOf('node_modules') !== -1) {
      break;
    }
    lines.push(line.trim().replace(/webpack-internal.*\.\//, './'));
  }
  return lines.join('\n           ');
}
