import { notFound } from 'next/navigation';

import { getByIdForClient } from '@/controllers/audit';
import { getCurrent } from '@/controllers/session-user';
import { AuditHeader } from '../audit-header';
import { DeleteAuditButton } from './delete-audit-button';
import { SettingsForm } from './settings-form';

export default async function AuditPage({
  params: { audit: id },
}: {
  params: { audit: string };
}) {
  const user = await getCurrent();
  const audit = await getByIdForClient(id);

  if (audit.orgId !== user.orgId) {
    return notFound();
  }

  return (
    <>
      <AuditHeader audit={audit} />

      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block py-2 align-middle sm:px-6 lg:px-8">
            <SettingsForm audit={audit} />
            <div className="mt-4">
              <DeleteAuditButton auditId={audit.id} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
