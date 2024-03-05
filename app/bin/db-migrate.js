/* eslint-disable @typescript-eslint/no-var-requires */
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const migrationDir = path.join(__dirname, '../migrations');

const runSilent = process.argv.includes('--silent');

let db;
async function connect() {
  db = new Client({
    database: process.env.DB_DATABASE,
    host: process.env.DB_HOSTNAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });
  await db.connect();
}

async function ensureVersionTableExists() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS "migration_version" (
      "migration" varchar(255) NOT NULL PRIMARY KEY,
      "created_at" timestamptz DEFAULT NOW() NOT NULL
    );
  `);
}

const applyMigration = async (migrationName) => {
  const filePath = path.join(migrationDir, migrationName);
  const sql = fs.readFileSync(filePath, 'utf-8');
  try {
    await db.query('BEGIN');
    await db.query(sql);

    await db.query('INSERT INTO migration_version (migration) VALUES ($1)', [
      migrationName,
    ]);

    await db.query('COMMIT');
    return true;
  } catch (err) {
    await db.query('ROLLBACK');

    let buggySchema = '';
    if (err.position) {
      const res = findBuggySchema(sql, err.position);
      buggySchema = `Line: ${res.lineNumber}
-------------------------------------------------------------
      ${res.lines.join('\n')}
      `;
    }
    console.error(`
-------------------------------------------------------------
Error applying migration: ${migrationName}
-------------------------------------------------------------
Code: ${err.code}
Message: ${err.message}
${buggySchema}
-------------------------------------------------------------
    `);
    return false;
  }
};

function takeAfter(array, value) {
  const index = array.indexOf(value);
  return index !== -1 ? array.slice(index + 1) : [];
}

function findBuggySchema(text, offset) {
  // Split the text into lines
  const lines = text.split('\n');

  // Find the line number containing the offset
  let lineIndex = 0;
  let currentOffset = 0;
  for (let i = 0; i < lines.length; i++) {
    currentOffset += lines[i].length + 1; // +1 for the newline character
    if (currentOffset > offset) {
      lineIndex = i;
      break;
    }
  }

  // Extract the target lines
  const start = Math.max(0, lineIndex - 2);
  const end = Math.min(lines.length, lineIndex + 3);
  const extractedLines = lines.slice(start, end);

  // Return the extracted lines and the line number
  return {
    lines: extractedLines,
    lineNumber: lineIndex + 1, // +1 to make it 1-based
  };
}

const migrateToLatest = async () => {
  await connect();
  await ensureVersionTableExists();
  const { rows, rowCount } = await db.query(
    'SELECT migration FROM migration_version ORDER BY migration DESC LIMIT 1',
  );
  const lastMigration = rowCount ? rows[0].migration : '';
  let files = fs
    .readdirSync(migrationDir)
    .filter((file) => file.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));
  console.log(files);
  if (lastMigration) {
    files = takeAfter(files, lastMigration);
  }

  if (files.length) {
    for (const file of files) {
      !runSilent && console.log(`Applying migration: ${file}`);
      try {
        if (!(await applyMigration(file))) {
          console.error(`Migration failed at ${file}`);

          await db.end();
          process.exit(1);
        }
      } catch (err) {
        await db.end();
        process.exit(1);
      }
    }

    !runSilent && console.log('Migration done');
  } else {
    !runSilent && console.log('No migrations to run');
  }

  await db.end();
  process.exit(0);
};

if (process.argv.includes('--squash')) {
  console.log('Squashing migrations');
  // Code to reset and squash migrations
}

const IS_RUN_FROM_CLI = require.main === module;
if (IS_RUN_FROM_CLI) {
  migrateToLatest().catch(async (err) => {
    await db.end();
    console.error(err);
  });
}

module.exports = {
  migrateToLatest,
};
