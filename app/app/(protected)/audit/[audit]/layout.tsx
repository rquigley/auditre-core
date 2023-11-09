import { notFound } from 'next/navigation';

import { Content } from '@/components/content';
import Header from '@/components/header';
import { getByIdForClientCached } from '@/controllers/audit';
import { getFirstRequestId } from '@/controllers/request';
import { getCurrent } from '@/controllers/session-user';
import { AuditHeader } from './audit-header';

export default async function AuditLayout({
  params: { audit: auditId },
  children,
}: {
  params: { audit: string };
  children: React.ReactNode;
}) {
  const userP = getCurrent();
  const auditP = getByIdForClientCached(auditId);

  const [user, audit] = await Promise.all([userP, auditP]);
  if (audit.orgId !== user.orgId) {
    return notFound();
  }

  return (
    <>
      <Header title={audit.name} />

      <Content>{children}</Content>
    </>
  );
}
