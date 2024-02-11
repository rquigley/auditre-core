import { notFound } from 'next/navigation';
import { Fragment } from 'react';

import { getByIdForClientCached } from '@/controllers/audit';
import { getAllByAuditId } from '@/controllers/request';
import { getStatusesForAuditId } from '@/controllers/request-data';
import { getCurrent } from '@/controllers/session-user';
import Row from './row';

export default async function AuditPage({
  params: { audit: auditId },
}: {
  params: { audit: string };
}) {
  const { user, authRedirect } = await getCurrent();
  if (!user) {
    return authRedirect();
  }
  const auditP = await getByIdForClientCached(auditId);
  const requestsP = await getAllByAuditId(auditId);

  const [audit, requests] = await Promise.all([auditP, requestsP]);

  if (!audit || audit.orgId !== user.orgId) {
    return notFound();
  }

  const statusesP = getStatusesForAuditId(auditId);

  const groupedRequests = groupRows(requests, [
    'Background',
    'Accounting Information',
    'Business Operations',
    'Other',
  ]);
  return (
    <table className="min-w-full divide-y divide-gray-300">
      <thead>
        <tr>
          <th
            scope="col"
            className="w-20 pl-4 sm:pl-2 py-3.5 text-left text-sm font-semibold text-gray-900"
          >
            Status
          </th>
          <th
            scope="col"
            className="py-3.5 text-left text-sm font-semibold text-gray-900"
          >
            Request
          </th>

          <th
            scope="col"
            className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
          >
            Owners
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200 bg-white">
        {groupedRequests.map((group) => {
          if (group.rows.length === 0) {
            return null;
          }
          return (
            <Fragment key={group.name}>
              <tr className="border-t border-gray-200">
                <th
                  colSpan={3}
                  scope="colgroup"
                  className="bg-gray-50 py-2 pl-4 pr-3 text-left text-sm font-normal text-gray-900 sm:pl-3"
                >
                  {group.name}
                </th>
              </tr>
              {group.rows.map((row) => (
                <Row request={row} statusesP={statusesP} key={row.id} />
              ))}
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}

interface Row {
  name: string;
  group: string;
}

function groupRows<T extends Row>(
  rows: T[],
  groupOrder: string[],
): {
  name: string;
  rows: T[];
}[] {
  const groupMap: Record<string, T[]> = {};

  for (const row of rows) {
    if (!groupMap[row.group]) {
      groupMap[row.group] = [];
    }
    groupMap[row.group].push(row);
  }

  const sortedRows = groupOrder.map((groupName) => ({
    name: groupName,
    rows: groupMap[groupName] || [],
  }));

  return sortedRows;
}
