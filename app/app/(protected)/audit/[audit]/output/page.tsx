import { notFound } from 'next/navigation';

import { getByIdForClientCached } from '@/controllers/audit';
import { getAllByAuditId } from '@/controllers/document';
import { getCurrent } from '@/controllers/session-user';
import { GenerateFinancialStatementButton } from './generate-financial-statement-button';
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
      <div className="mt-4 flex">
        <GenerateFinancialStatementButton auditId={audit.id} />
      </div>

      <div className="mt-4">
        <div className="font-lg border-b pb-1 mb-3">Documents</div>
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
