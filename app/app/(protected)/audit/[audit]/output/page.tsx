import { notFound } from 'next/navigation';

import { getByIdForClientCached } from '@/controllers/audit';
import { getAllByAuditId } from '@/controllers/document';
import { getCurrent } from '@/controllers/session-user';
import { GenerateDocButton, GenerateExcelButton } from './generate-button';
import Row from './row';

export default async function AuditPage({
  params: { audit: id },
}: {
  params: { audit: string };
}) {
  const { user, authRedirect } = await getCurrent();
  if (!user) {
    return authRedirect();
  }
  const audit = await getByIdForClientCached(id);
  if (!audit || audit.orgId !== user.orgId) {
    return notFound();
  }

  const documents = await getAllByAuditId(id);

  return (
    <div className="m-5">
      <div className="mt-4 flex space-x-4">
        <GenerateDocButton auditId={audit.id} />
        <GenerateExcelButton auditId={audit.id} />
      </div>

      <div className="mt-4">
        <div className="font-lg border-b pb-1 mb-3">Source Documents</div>
        {documents.map((document) => (
          <div key={document.id}>
            <Row auditId={audit.id} document={document} />
            <div className="w-48 border-b my-4"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
