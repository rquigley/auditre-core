import { getAllByOrgId } from '@/controllers/document';
import { getById } from '@/controllers/request';
import type { Document, ClientSafeDocument } from '@/types';
import { clientSafe } from '@/lib/util';
import RequestRow from './request-row';
import { getCurrent } from '@/controllers/session-user';
import Header from '@/components/header';

export default async function DocumentsPage() {
  const user = await getCurrent();
  const documents = await getAllByOrgId(user.orgId);
  const clientSafeDocuments = clientSafe(documents) as ClientSafeDocument[];

  // for (const document of documents) {
  //   document.request = await getByExternalId(document.requestId);
  // }

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
                    Uploaded
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                  >
                    Last modified
                  </th>
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
                  <RequestRow document={document} key={document.id} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
