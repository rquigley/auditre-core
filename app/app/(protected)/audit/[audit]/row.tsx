'use client';

import Link from 'next/link';
import { Suspense, useMemo } from 'react';

import { Await } from '@/components/await';

import type { ClientSafeRequest } from '@/controllers/request';

function StatusBadge({ status }: { status: string }) {
  return useMemo(() => {
    switch (status) {
      case 'loading':
        return (
          <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium">
            &nbsp;
          </span>
        );
      case 'todo':
        return (
          <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
            Todo
          </span>
        );
      case 'started':
        return (
          <span className="inline-flex items-center rounded-full bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20">
            Started
          </span>
        );
      case 'complete':
        return (
          <span className="inline-flex items-center rounded-full bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-700/10">
            Done
          </span>
        );
      case 'overdue':
        return (
          <span className="inline-flex items-center rounded-md bg-red-400/10 px-2 py-1 text-xs font-medium text-red-400 ring-1 ring-inset ring-red-400/20">
            Overdue
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
            {status}
          </span>
        );
    }
  }, [status]);
}

export default function Row({
  request,
  statusesP,
}: {
  request: ClientSafeRequest;
  statusesP: Promise<Record<string, { status: string }>>;
}) {
  return (
    <tr key={request.id} className="hover:bg-gray-100">
      <td className="py-5 pl-4 text-sm text-gray-500 sm:pl-2">
        <Suspense fallback={<StatusBadge status="loading" />}>
          <Await promise={statusesP}>
            {(s) => <StatusBadge status={s[request.id].status} />}
          </Await>
        </Suspense>
      </td>
      <td className="py-5 text-sm">
        <div className="font-semibold text-gray-900">
          <Link
            href={`/audit/${request.auditId}/request/${request.id}`}
            className="hover:text-blue-500 hover:underline"
          >
            {request.name}
          </Link>
        </div>

        <div className="text-gray-900">{request.description}</div>
      </td>

      <td className="whitespace-nowrap py-5 pr-4 text-sm text-gray-500 sm:pr-2">
        {/* {request.owners
          ? request.owners.map((owner: string) => (
              <div key={owner}>{owner}</div>
            ))
          : null} */}
      </td>
    </tr>
  );
}
