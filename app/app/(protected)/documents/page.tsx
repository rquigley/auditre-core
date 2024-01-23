import { Suspense } from 'react';

import { Await } from '@/components/await';
import { Content } from '@/components/content';
import { Header } from '@/components/header';
import { PageSpinner } from '@/components/spinner';
import { getAllByOrgId } from '@/controllers/document';
import { getCurrent } from '@/controllers/session-user';
import Row from './row';

export type Document = Awaited<ReturnType<typeof getAllByOrgId>>[number];

export default async function DocumentsPage() {
  const { user, authRedirect } = await getCurrent();
  if (!user) {
    return authRedirect();
  }
  const documents = getAllByOrgId(user.orgId);

  return (
    <>
      <Header title="Documents" />
      <Content>
        <table className="min-w-full divide-y divide-gray-300">
          <thead>
            <tr className="text-xs font-normal text-gray-900">
              <th
                scope="col"
                className="py-3.5 pl-5 pr-3 text-left font-normal"
              >
                Name
              </th>
              <th scope="col" className="px-3 py-3.5 text-left font-normal">
                Created
              </th>
              {/* <th
                    scope="col"
                    className="px-3 py-3.5 text-left font-normal"
                  >
                    Last modified
                  </th> */}

              <th scope="col" className="pr-5 py-3.5 text-right font-normal">
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
