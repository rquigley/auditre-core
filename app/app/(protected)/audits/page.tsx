import { Suspense } from 'react';

import { Await } from '@/components/await';
import { Content } from '@/components/content';
import Header from '@/components/header';
import { PageSpinner } from '@/components/spinner';
import { getAllByOrgId } from '@/controllers/audit';
import { getFirstRequestId } from '@/controllers/request';
import { getCurrent } from '@/controllers/session-user';
import NewAuditButton from './new-audit-button';
import NewAuditModal from './new-audit-modal';
import Row from './row';

export default async function AuditsPage() {
  const user = await getCurrent();
  const audits = getAllByOrgId(user.orgId);

  return (
    <>
      <Header title="Audits" />
      <Content>
        <div className="my-5 ml-5">
          <NewAuditButton />
        </div>

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

              <th
                scope="col"
                className="w-20 pr-5 py-3.5 text-right font-normal"
              >
                Progress
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
              <Await promise={audits}>
                {(rows) => (
                  <>
                    {rows.map((audit) => {
                      const a = {
                        ...audit,
                        firstRequestSlug: getFirstRequestId(audit.id),
                      };
                      return <Row audit={a} key={audit.id} />;
                    })}
                  </>
                )}
              </Await>
            </Suspense>
          </tbody>
        </table>
      </Content>

      <NewAuditModal />
    </>
  );
}
