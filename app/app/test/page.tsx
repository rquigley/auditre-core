import { headers } from 'next/headers';

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
      <pre>{JSON.stringify({ other }, null, 2)}</pre>n
    </div>
  );
}
