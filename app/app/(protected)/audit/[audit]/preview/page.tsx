import { notFound } from 'next/navigation';

import { getByIdForClientCached } from '@/controllers/audit';
import { AuditPreview } from '@/controllers/output/react';
import { getCurrent } from '@/controllers/session-user';
import { ShowChangesToggle } from './show-changes-toggle';
import { ViewDataButton } from './view-data-button';

export default async function AuditPage({
  params: { audit: auditId },
  searchParams,
}: {
  params: { audit: string };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const { user, authRedirect } = await getCurrent();
  if (!user) {
    return authRedirect();
  }
  const audit = await getByIdForClientCached(auditId);
  if (!audit || audit.orgId !== user.orgId) {
    return notFound();
  }

  const highlightData = searchParams['show-changes'] === '1';

  return (
    <div className="m-5">
      <div className="mb-4 flex space-x-7">
        <ViewDataButton />
        <ShowChangesToggle />
      </div>

      <AuditPreview auditId={auditId} highlightData={highlightData} />
    </div>
  );
}
