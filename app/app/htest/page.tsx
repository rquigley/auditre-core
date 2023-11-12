import { cookies, headers } from 'next/headers';

export default function Home() {
  const headersList = headers();
  const other = {
    referer: headersList.get('referer'),
    host: headersList.get('host'),
    Origin: headersList.get('Origin'),
    'x-forwarded-host': headersList.get('x-forwarded-host'),
    'X-AR-CF-Header': headersList.get('X-AR-CF-Header'),
    'x-forwarded-for': headersList.get('x-forwarded-for'),
    'CloudFront-Forwarded-Proto': headersList.get('CloudFront-Forwarded-Proto'),
  };

  return (
    <div>
      <pre>{JSON.stringify({ other }, null, 2)}</pre>
    </div>
  );
}
