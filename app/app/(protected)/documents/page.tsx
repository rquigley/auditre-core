import Row from './row';
import Header from '@/components/header';
import { getById as getAuditById } from '@/controllers/audit';
import { getAllByOrgId } from '@/controllers/document';
import { getById as getRequestById } from '@/controllers/request';
import { getCurrent } from '@/controllers/session-user';
import { clientSafe } from '@/lib/util';
import type { ClientSafeDocument, Document } from '@/types';

export default async function DocumentsPage() {
  const user = await getCurrent();
  const documents = await getAllByOrgId(user.orgId);

  for (const document of documents) {
    if (document.requestId) {
      const request = await getRequestById(document.requestId);
      const audit = await getAuditById(request.auditId);
      // @ts-ignore
      document.auditName = audit.name;
      // @ts-ignore
      document.requestName = request.name;
    }
    // TODO: look into FF and dayjs date handling.
    // @ts-ignore
    document.createdAt = document.createdAt.toString();
  }
  const clientSafeDocuments = clientSafe(documents) as ClientSafeDocument[] &
    {
      auditName?: string;
      requestName?: string;
    }[];

  return (
    <>
      <Header title="Documents" />
      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <table className="min-w-full divide-y divide-gray-300">
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0"
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
                    className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                  >
                    Added by
                  </th>
                  <th
                    scope="col"
                    className=" py-3.5 text-right text-sm font-semibold text-gray-900"
                  >
                    Uploaded
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {clientSafeDocuments.map((document) => (
                  <Row document={document} key={document.id} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
