/* eslint-disable @typescript-eslint/no-var-requires */
const { Client } = require('pg');
const { migrateToLatest } = require('./db-migrate');

const database = process.env.DB_DATABASE;

async function createDb() {
  const client = new Client({
    database: 'postgres',
    host: process.env.DB_HOSTNAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });
  await client.connect();
  await client.query(`CREATE DATABASE ${database}`);
  await client.end();
}

let db;
async function resetDb() {
  db = new Client({
    database,
    host: process.env.DB_HOSTNAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  if (!database) {
    throw new Error('DB_DATABASE is not set');
  }
  console.log(`Recreating Database ${database}`);
  await db.connect();
  try {
    await db.query('BEGIN');
    await db.query(`
do $do$ declare
  r record;
begin
  -- drop tables
  for r in (select tablename from pg_tables where
    schemaname != 'pg_catalog'
    AND schemaname != 'information_schema'
  ) loop
      execute 'drop table if exists ' || quote_ident(r.tablename) || ' cascade';
  end loop;

  -- drop schemas
  for r in (select schema_name from information_schema.schemata where
    schema_name != 'public'
    AND schema_name != 'information_schema'
    AND schema_name NOT LIKE 'pg_%'
  ) loop
      execute 'drop schema if exists ' || quote_ident(r.schema_name) || ' cascade';
  end loop;

  -- drop extensions
  for r in (select extname from pg_extension where
    extname != 'plpgsql'
  ) loop
      execute 'drop extension if exists ' || quote_ident(r.extname) || ' cascade';
  end loop;
end $do$;
`);
    await db.query('COMMIT');
  } catch (err) {
    await db.query('ROLLBACK');
    throw err;
  }
  await db.end();
}

async function run() {
  try {
    await resetDb();
  } catch (err) {
    await db.end();

    if (err.code == '3D000') {
      await createDb();
      await resetDb();
    } else {
      throw err;
    }
  }
  await migrateToLatest();
}

const IS_RUN_FROM_CLI = require.main === module;
if (IS_RUN_FROM_CLI) {
  run().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
