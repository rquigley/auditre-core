const { Client } = require('pg');
const Sentry = require('@sentry/serverless');

Sentry.AWSLambda.init({
  dsn: 'https://4a678412a51451ebc6affa5566ec4bd0@o4505774316060672.ingest.sentry.io/4505784753324032',

  // We recommend adjusting this value in production, or using tracesSampler
  // for finer control
  tracesSampleRate: 0,
});

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

async function __UNSAFE_IN_PROD__resetDb() {
  try {
    console.log('Resetting database');
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
    console.log('Resetting database successful');
  } catch (err) {
    console.log('Error resetting database. rolling back');
    await db.query('ROLLBACK');
    throw err;
  }
}

const handler = Sentry.AWSLambda.wrapHandler(async (event) => {
  console.log('Started migration');
  try {
    await connect();
    await __UNSAFE_IN_PROD__resetDb();
    await db.end();

    return {
      statusCode: 200,
      body: JSON.stringify(`Success`),
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
