import { Suspense } from 'react';

import { Await } from '@/components/await';
import Header from '@/components/header';
import { getAllByOrgId } from '@/controllers/audit';
import { getCurrent } from '@/controllers/session-user';
import NewAuditButton from './new-audit-button';
import NewAuditModal from './new-audit-modal';
import Row from './row';

import type { AuditWithRequestCounts } from '@/controllers/audit';

export default async function AuditsPage() {
  const user = await getCurrent();
  const audits = getAllByOrgId(user.orgId);

  return (
    <>
      <Header title="Audits" />
      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
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
                    Year
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                  >
                    Created
                  </th>

                  <th
                    scope="col"
                    className="w-20 pr-4 sm:pr-2 py-3.5 text-right text-sm font-semibold text-gray-900"
                  >
                    Progress
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                <Suspense fallback={null}>
                  <Await promise={audits}>
                    {(rows) => (
                      <>
                        {rows.map((audit) => (
                          <Row audit={audit} key={audit.id} />
                        ))}
                      </>
                    )}
                  </Await>
                </Suspense>
              </tbody>
            </table>
            <div className="mt-4">
              <NewAuditButton />
            </div>
          </div>
        </div>

        <NewAuditModal />
      </div>
    </>
  );
}
