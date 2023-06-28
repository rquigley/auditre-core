import { program } from "commander";
import { loadEnvConfig } from "@next/env";
import { Client } from "pg";
import { migrateToLatest } from "./db-migrate";

const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function reCreateDb() {
  const client = new Client({
    database: "postgres",
    host: process.env.DB_HOSTNAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  const database = process.env.DB_DATABASE;
  console.log(process.env);
  console.log(`CREATE DATABASE ${database}`);
  if (!database) {
    throw new Error("DB_DATABASE is not set");
  }
  await client.connect();
  await client.query(`DROP DATABASE IF EXISTS ${database}`);
  await client.query(`CREATE DATABASE ${database}`);
  await client.end();
}

async function run() {
  program.description("Resets DB and runs migrations").parse(process.argv);
  const opts = program.opts();
  await reCreateDb();
  await migrateToLatest();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
