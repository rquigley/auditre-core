import { notFound } from 'next/navigation';

import { Content } from '@/components/content';
import { DeleteModal } from '@/components/delete-modal';
import { AuditSettings, Header } from '@/components/header';
import { getByIdForClientCached } from '@/controllers/audit';
import { getCurrent } from '@/controllers/session-user';
import { deleteAudit } from '@/lib/actions';
import { AuditHeader } from './audit-header';

export default async function AuditLayout({
  params: { audit: auditId },
  children,
}: {
  params: { audit: string };
  children: React.ReactNode;
}) {
  const { user, authRedirect } = await getCurrent();
  if (!user) {
    return authRedirect();
  }
  const audit = await getByIdForClientCached(auditId);
  if (!audit || audit.orgId !== user.orgId) {
    return notFound();
  }

  return (
    <>
      <Header
        title={audit.name}
        subtitle={audit.year}
        breadcrumbs={[{ name: 'Audits', href: '/audits' }]}
        settings={<AuditSettings auditId={auditId} />}
      />

      <Content>
        {' '}
        <AuditHeader audit={audit} request0Slug="basic-info" />
        {children}
      </Content>

      <DeleteModal
        toDelete="audit"
        description="Are you sure you want to delete this audit? It cannot be undone"
        action={async () => {
          'use server';
          const { user } = await getCurrent();
          if (!user) {
            return notFound();
          }
          await deleteAudit(auditId);
        }}
        postActionUrl="/audits"
      />
    </>
  );
}
