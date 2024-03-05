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
  const requestP = getRequestBySlug(requestSlug);
  const [audit, request] = await Promise.all([auditP, requestP]);

  if (!request || !audit || audit.orgId !== user.orgId) {
    return notFound();
  }

  for (const field in request.form) {
    const label = request.form[field].label;
    if (label && label.includes('[')) {
      request.form[field].label = label
        .replace('[YEAR]', audit.year)
        .replace('[YEAR2]', String(Number(audit.year) - 1))
        .replace('[YEAR3]', String(Number(audit.year) - 2));
    }
  }

  return (
    <div className="m-8 mt-7">
      <Suspense fallback={<PageSpinner />}>
        <h1 className="mb-4 text-lg leading-6 text-gray-900">{request.name}</h1>
        <FormContainer
          request={request}
          userId={user.id}
          auditId={auditId}
          orgId={audit.orgId}
        />
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
