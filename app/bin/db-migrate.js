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
    CREATE TABLE IF NOT EXISTS migration_version (
      migration varchar(255) NOT NULL PRIMARY KEY,
      timestamp TIMESTAMP DEFAULT NOW()
    );
  `);
}

const applyMigration = async (migrationName) => {
  const filePath = path.join(migrationDir, migrationName);
  const sql = fs.readFileSync(filePath, 'utf-8');
  await db.query('BEGIN');
  try {
    await db.query(sql);

    await db.query('INSERT INTO migration_version (migration) VALUES ($1)', [
      migrationName,
    ]);

    await db.query('COMMIT');
  } catch (err) {
    await db.query('ROLLBACK');
    console.error(`
-------------------------------------------------------------
Error applying migration: ${migrationName}
-------------------------------------------------------------
Code: ${err.code}
Message: ${err.message}
-------------------------------------------------------------
${sql}
-------------------------------------------------------------
`);
    throw err;
  }
};

function takeAfter(array, value) {
  const index = array.indexOf(value);
  return index !== -1 ? array.slice(index + 1) : [];
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
    .filter((file) => file.endsWith('.sql'));
  if (lastMigration) {
    files = takeAfter(files, lastMigration);
  }

  if (files.length) {
    for (const file of files) {
      !runSilent && console.log(`Applying migration: ${file}`);
      try {
        await applyMigration(file);
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
