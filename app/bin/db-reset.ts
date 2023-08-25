import { Client } from 'pg';
import { migrateToLatest } from './db-migrate';

const IS_RUN_FROM_CLI = require.main === module;

async function reCreateDb() {
  const client = new Client({
    database: 'postgres',
    host: process.env.DB_HOSTNAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  const database = process.env.DB_DATABASE;

  if (!database) {
    throw new Error('DB_DATABASE is not set');
  }
  console.log(`Recreating Database ${database}`);
  await client.connect();
  await client.query(`DROP DATABASE IF EXISTS ${database}`);
  await client.query(`CREATE DATABASE ${database}`);
  await client.end();
}

export async function run() {
  await reCreateDb();
  await migrateToLatest();
}

if (IS_RUN_FROM_CLI) {
  run().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
