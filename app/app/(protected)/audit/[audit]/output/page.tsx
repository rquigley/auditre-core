import { notFound } from 'next/navigation';

import { getByIdForClientCached } from '@/controllers/audit';
import { getAllByAuditId } from '@/controllers/document';
import { getCurrent } from '@/controllers/session-user';
import Row from './row';

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

  const documents = await getAllByAuditId(id);

  return (
    <>
      <table className="min-w-full divide-y divide-gray-300">
        <thead>
          <tr>
            <th
              scope="col"
              className="py-3.5 pl-4 sm:pl-2 pr-3 text-left text-sm font-semibold text-gray-900"
            >
              Name
            </th>
            <th
              scope="col"
              className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
            >
              Created
            </th>
            {/* <th
                    scope="col"
                    className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                  >
                    Last modified
                  </th> */}

            <th
              scope="col"
              className="pr-4 sm:pr-2 py-3.5 text-right text-sm font-semibold text-gray-900"
            >
              Uploaded
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {documents.map((document) => (
            <Row auditId={audit.id} document={document} key={document.id} />
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex">
        <a
          type="button"
          href={`/audit/${audit.id}/generate`}
          className="rounded-full bg-white px-3.5 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
        >
          Generate Financial Statement
        </a>
      </div>
    </>
  );
}
