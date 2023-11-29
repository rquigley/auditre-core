const { Client } = require('pg');
const Sentry = require('@sentry/serverless');
const {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
} = require('@aws-sdk/client-s3');

const REGION = 'us-east-2';
const s3Client = new S3Client({ region: REGION });

Sentry.AWSLambda.init({
  dsn: 'https://4a678412a51451ebc6affa5566ec4bd0@o4505774316060672.ingest.sentry.io/4505784753324032',

  // We recommend adjusting this value in production, or using tracesSampler
  // for finer control
  tracesSampleRate: 0,
});

async function getMigrations() {
  const bucketName = process.env.MIGRATION_BUCKET_NAME;
  const prefix = 'migrations/';

  try {
    const listObjectsCommand = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix,
    });
    const objects = await s3Client.send(listObjectsCommand);
    const fileKeys = objects.Contents.map((object) => object.Key);

    const migrations = await Promise.all(
      fileKeys.map(async (key) => {
        const getObjectCommand = new GetObjectCommand({
          Bucket: bucketName,
          Key: key,
        });
        const file = await s3Client.send(getObjectCommand);
        const streamToString = (stream) =>
          new Promise((resolve, reject) => {
            const chunks = [];
            stream.on('data', (chunk) => chunks.push(chunk));
            stream.on('end', () =>
              resolve(Buffer.concat(chunks).toString('utf-8')),
            );
            stream.on('error', reject);
          });

        const sqlContent = await streamToString(file.Body);
        return { name: key, sql: sqlContent };
      }),
    );

    migrations.sort((a, b) => a.name.localeCompare(b.name));

    return migrations;
  } catch (error) {
    console.error('Error processing S3 bucket: ', error);
    throw error;
  }
}

async function getCreds() {
  const url = '/secretsmanager/get?secretId=' + process.env.DB_CREDS_SECRET_ID;
  const port = process.env.PARAMETERS_SECRETS_EXTENSION_HTTP_PORT;
  const response = await fetch(`http://localhost:${port}${url}`, {
    headers: {
      'X-Aws-Parameters-Secrets-Token': process.env.AWS_SESSION_TOKEN,
    },
  });

  const data = await response.json();
  const parsed = JSON.parse(data.SecretString);
  return {
    host: parsed.host,
    port: parsed.port,
    database: parsed.dbname,
    user: parsed.username,
    password: parsed.password,
  };
}

let db;
async function connect() {
  const creds = await getCreds();
  db = new Client({
    ...creds,
    ssl: {
      rejectUnauthorized: false,
    },
    // TODO: implement https://node-postgres.com/features/ssl
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

const applyMigration = async (migration) => {
  await db.query('BEGIN');
  try {
    await db.query(migration.sql);

    await db.query('INSERT INTO migration_version (migration) VALUES ($1)', [
      migration.name,
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
Error applying migration: ${migration.name}
-------------------------------------------------------------
Code: ${err.code}
Message: ${err.message}
${buggySchema}
-------------------------------------------------------------
    `);
    return false;
  }
};

function takeAfter(array, needle) {
  const index = array.findIndex((el) => el.name === needle);
  return index !== -1 ? array.slice(index + 1) : array;
}

const migrateToLatest = async () => {
  await connect();
  await ensureVersionTableExists();
  const { rows, rowCount } = await db.query(
    'SELECT migration FROM migration_version ORDER BY migration DESC LIMIT 1',
  );
  const lastMigration = rowCount ? rows[0].migration : '';
  let migrations = await getMigrations();
  migrations = takeAfter(migrations, lastMigration);

  let numMigrationsApplied = 0;
  if (migrations.length) {
    for (const migration of migrations) {
      console.log(`Applying migration: ${migration.name}`);
      try {
        if (!(await applyMigration(migration))) {
          await db.end();
          return {
            success: false,
            numMigrations: migrations.length,
            numMigrationsApplied,
          };
        }
        numMigrationsApplied++;
      } catch (err) {
        await db.end();
        return;
      }
    }

    console.log('Migration done');
  } else {
    console.log('No migrations to run');
  }

  await db.end();
  return {
    success: true,
    numMigrations: migrations.length,
    numMigrationsApplied,
  };
};

const handler = Sentry.AWSLambda.wrapHandler(async (event) => {
  console.log('Started migration');
  try {
    const { success, numMigrations, numMigrationsApplied } =
      await migrateToLatest();
    return {
      statusCode: 200,
      success,
      numMigrations,
      numMigrationsApplied,
      body: JSON.stringify(`Success: ${success.toString()}`),
    };
  } catch (err) {
    Sentry.captureException(err);
    return {
      statusCode: 500,
      body: JSON.stringify(err.message),
    };
  }
});

module.exports = { handler };
