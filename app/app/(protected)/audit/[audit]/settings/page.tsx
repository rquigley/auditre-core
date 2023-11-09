import { notFound } from 'next/navigation';

import { getByIdForClientCached } from '@/controllers/audit';
import { getCurrent } from '@/controllers/session-user';
import { DeleteAuditButton } from './delete-audit-button';
import { SettingsForm } from './settings-form';

export default async function AuditPage({
  params: { audit: id },
}: {
  params: { audit: string };
}) {
  const user = await getCurrent();
  const audit = await getByIdForClientCached(id);

  if (audit.orgId !== user.orgId) {
    return notFound();
  }

  return (
    <>
      <SettingsForm audit={audit} />
      <div className="mt-4">
        <DeleteAuditButton auditId={audit.id} />
      </div>
    </>
  );
}
