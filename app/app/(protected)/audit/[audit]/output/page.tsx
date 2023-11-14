import { notFound } from 'next/navigation';

import { PrimaryButton } from '@/components/button';
import { getByIdForClientCached } from '@/controllers/audit';
import { getAllByAuditId } from '@/controllers/document';
import { getCurrent } from '@/controllers/session-user';
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
        <PrimaryButton
          href={`/audit/${audit.id}/generate`}
          label="Generate Financial Statement"
        />
      </div>

      <div className="mt-4">
        <div className="font-lg border-b pb-1 mb-3">Documents</div>
        {documents.map((document) => (
          <>
            <Row auditId={audit.id} document={document} key={document.id} />
            <div className="w-48 border-b my-4"></div>
          </>
        ))}
      </div>
    </div>
  );
}
