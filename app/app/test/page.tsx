import { headers, cookies } from 'next/headers';
import Form from './form';
import { create as createOrg } from '@/controllers/org';
import { create as createAudit } from '@/controllers/audit';
import { create as createInvitation } from '@/controllers/invitation';
import { upsertDefault } from '@/controllers/request';

export default function Home() {
  async function setupDemo() {
    'use server';
    try {
      const org = await createOrg({ name: 'Test Org2' });

      const audit1 = await createAudit({
        orgId: org.id,
        name: 'Our First Audit',
        year: 2023,
      });
      await upsertDefault({ auditId: audit1.id, orgId: org.id });

      await createInvitation({
        orgId: org.id,
        email: 'ryan@auditre.co',
      });
      await createInvitation({
        orgId: org.id,
        email: 'jason@auditre.co',
      });
    } catch (error) {
      console.log(error);
    }
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
      <Form setupDemo={setupDemo} />
    </div>
  );
}
