import { Fragment } from 'react';

import { getAllByAuditId, getRequestBySlug } from '@/controllers/request';
import { getStatusesForAuditId } from '@/controllers/request-data';
import Request from './request';

import type { AuditId } from '@/types';

export async function Requests({ auditId }: { auditId: AuditId }) {
  console.log('RERENDER');
  const requestsP = await getAllByAuditId(auditId);

  const [requests] = await Promise.all([requestsP]);

  const statusesP = getStatusesForAuditId(auditId);

  const groupedRequests = sortRows(requests, [
    'Background',
    'Accounting Information',
    'Business Operations',
    'Other',
  ]);
  return (
    <ul className="min-w-full ">
      {groupedRequests.map((group) => {
        if (group.rows.length === 0) {
          return null;
        }
        return (
          <Fragment key={group.name}>
            <li className=" py-2 pl-4 pr-3 text-left text-xs font-medium text-gray-900 border-b border-gray-200">
              {group.name}
            </li>
            {group.rows.map((row) => (
              <Request
                request={row}
                statusesP={statusesP}
                key={row.id}
                group={group.name}
              />
            ))}
            <li className="h-4"></li>
          </Fragment>
        );
      })}
    </ul>
  );
}

interface Row {
  name: string;
  group: string;
}

function sortRows<T extends Row>(
  rows: T[],
  groupOrder: string[],
): {
  name: string;
  rows: T[];
}[] {
  const groupMap: Record<string, T[]> = {};

  // Group rows by their 'group' property
  for (const row of rows) {
    if (!groupMap[row.group]) {
      groupMap[row.group] = [];
    }
    groupMap[row.group].push(row);
  }

  // Sort each group by 'name'
  for (const group of Object.keys(groupMap)) {
    groupMap[group] = groupMap[group].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }

  // Create SortedRowGroup based on groupOrder
  const sortedRows = groupOrder.map((groupName) => ({
    name: groupName,
    rows: groupMap[groupName] || [],
  }));

  return sortedRows;
}
