import { redirect, notFound } from 'next/navigation';
import Nav from '@/app/nav';
import { getAllByOrgId } from '@/controllers/document';
import { getByExternalId } from '@/controllers/request';
import type { Document, ClientSafeDocument } from '@/types';
import { clientSafe } from '@/lib/util';
import RequestRow from './request-row';
import { getCurrent } from '@/controllers/session-user';

export default async function DocumentsPage() {
  const user = await getCurrent();
  if (!user) {
    redirect(`/login?next=/documents`);
  }

  const documents = await getAllByOrgId(user.orgId);
  const clientSafeDocuments = clientSafe(documents) as ClientSafeDocument[];

  // for (const document of documents) {
  //   document.request = await getByExternalId(document.requestId);
  // }

  return (
    <>
      <Nav />

      <main className="py-10 lg:pl-72 bg-slate-100">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="px-4 sm:px-6 lg:px-8 bg-white rounded-sm py-3 px-3">
            <div className="sm:flex sm:items-center">
              <div className="sm:flex-auto">
                <h1 className="text-base font-semibold leading-6 text-gray-900">
                  Documents
                </h1>
                {/* <p className="mt-2 text-sm text-gray-700">All active requests</p> */}
              </div>
              <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
                {/* <button
            type="button"
            className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Add user
          </button> */}
              </div>
            </div>
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
                        <RequestRow
                          document={document}
                          key={document.externalId}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
