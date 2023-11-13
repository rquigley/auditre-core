import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { PageSpinner } from '@/components/spinner';
import { getByIdForClientCached as getAuditById } from '@/controllers/audit';
import { getRequestBySlug } from '@/controllers/request';
import { getCurrent } from '@/controllers/session-user';
import Activity from './activity';
import FormContainer from './form-container';

import type { AuditId } from '@/types';

export default async function RequestPage({
  params: { audit: auditId, request: requestSlug },
}: {
  params: { audit: AuditId; request: string };
}) {
  const { user, authRedirect } = await getCurrent();
  if (!user) {
    return authRedirect();
  }
  const auditP = getAuditById(auditId);
  const requestP = getRequestBySlug(auditId, requestSlug);
  const [audit, request] = await Promise.all([auditP, requestP]);

  if (!request || !audit || audit.orgId !== user.orgId) {
    return notFound();
  }

  return (
    <div className="m-8 mt-7">
      <Suspense fallback={<PageSpinner />}>
        <h1 className="text-lg mb-4 leading-6 text-gray-900">{request.name}</h1>
        <FormContainer request={request} user={user} auditId={auditId} />
      </Suspense>
      <h2 className="text-sm font-semibold leading-6 text-gray-900">
        Activity
      </h2>
      <Suspense fallback={<PageSpinner />}>
        <Activity auditId={auditId} request={request} user={user} />
      </Suspense>
    </div>
  );
}
