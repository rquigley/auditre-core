import { headers } from 'next/headers';
import fs from 'fs';

async function getEnvFileContents() {
  let data = await fs.promises.readFile('.env.local', 'utf8');
  data = data.replace(/OPENAI_API_KEY.*/g, '');
  data = data.replace(/GOOGLE_CLIENT_ID.*/g, '');
  data = data.replace(/GOOGLE_CLIENT_SECRET.*/g, '');
  data = data.replace(/NEXTAUTH_SECRET.*/g, '');
  data = data.replace(/DB_HOSTNAME.*/g, '');
  data = data.replace(/DB_USER.*/g, '');
  return data;
}

export default async function Home() {
  const headersList = headers();
  const NEXTAUTH = process.env.NEXTAUTH_URL;
  const other = {
    NEXTAUTH: process.env.NEXTAUTH_URL,
    referer: headersList.get('referer'),
    host: headersList.get('host'),
    Host: headersList.get('Host'),
    Origin: headersList.get('Origin'),
    'x-forwarded-host': headersList.get('x-forwarded-host'),
    'x-forwarded-for': headersList.get('x-forwarded-for'),
    'CloudFront-Forwarded-Proto': headersList.get('CloudFront-Forwarded-Proto'),
  };

  return (
    <div>
      <pre>{JSON.stringify({ headers: headersList.entries() }, null, 2)}</pre>n
      <pre>{JSON.stringify({ other }, null, 2)}</pre>
      <pre>{await getEnvFileContents()}</pre>
    </div>
  );
}
