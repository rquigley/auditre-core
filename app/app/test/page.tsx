import { headers, cookies } from 'next/headers';

export default async function Home() {
  async function testCookie() {
    'use server';
    cookies().set('yep', 'nope');
  }

  const headersList = headers();
  const other = {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,

    referer: headersList.get('referer'),
    host: headersList.get('host'),
    Origin: headersList.get('Origin'),
    'x-forwarded-host': headersList.get('x-forwarded-host'),
    'x-forwarded-for': headersList.get('x-forwarded-for'),
    'CloudFront-Forwarded-Proto': headersList.get('CloudFront-Forwarded-Proto'),
  };

  return (
    <div>
      <pre>{JSON.stringify({ other }, null, 2)}</pre>
      <form action={testCookie}>
        <button type="submit">Add to Cart</button>
      </form>
    </div>
  );
}
