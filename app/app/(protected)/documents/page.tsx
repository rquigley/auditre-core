import { Suspense } from 'react';

import { Await } from '@/components/await';
import { Content } from '@/components/content';
import Header from '@/components/header';
import { PageSpinner } from '@/components/spinner';
import { getAllByOrgId } from '@/controllers/document';
import { getCurrent } from '@/controllers/session-user';
import Row from './row';

export default async function DocumentsPage() {
  const user = await getCurrent();
  const documents = getAllByOrgId(user.orgId);

  // for (const document of documents) {
  //   if (document.requestId) {
  //     const request = await getRequestById(document.requestId);
  //     const audit = await getAuditById(request.auditId, {
  //       includeDeleted: true,
  //     });
  //     // @ts-expect-error
  //     document.auditName = audit && !audit.isDeleted ? audit.name : '';
  //     // @ts-expect-error
  //     document.requestName = audit && !audit.isDeleted ? request.name : '';
  //   }
  //   // TODO: look into FF and dayjs date handling.
  //   // @ts-expect-error
  //   document.createdAt = document.createdAt.toString();
  // }
  // const clientSafeDocuments = clientSafe(documents) as ClientSafeDocument[] &
  //   {
  //     auditName?: string;
  //     requestName?: string;
  //   }[];

  return (
    <>
      <Header title="Documents" />
      <Content>
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
            <Suspense
              fallback={
                <tr>
                  <td colSpan={4}>
                    <PageSpinner />
                  </td>
                </tr>
              }
            >
              <Await promise={documents}>
                {(rows) => (
                  <>
                    {rows.map((document) => (
                      <Row document={document} key={document.id} />
                    ))}
                  </>
                )}
              </Await>
            </Suspense>
          </tbody>
        </table>
      </Content>
    </>
  );
}
