import { headers } from 'next/headers';

export default async function Home() {
  const headersList = headers();
  const other = {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,

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
      <pre>{JSON.stringify({ other }, null, 2)}</pre>
    </div>
  );
}
