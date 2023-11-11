import { notFound } from 'next/navigation';

import { getByIdForClientCached } from '@/controllers/audit';
import { getCurrent } from '@/controllers/session-user';
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
    <div className="m-5">
      <SettingsForm audit={audit} />
    </div>
  );
}
