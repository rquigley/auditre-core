'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
      case 'started':
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className="w-6 h-6 text-gray-200"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      // case 'started':
      //   return (
      //     <span className="inline-flex items-center rounded-full bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20">
      //       Started
      //     </span>
      //   );
      case 'complete':
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className="w-6 h-6 text-green-500"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      // case 'overdue':
      //   return (
      //     <span className="inline-flex items-center rounded-md bg-red-400/10 px-2 py-1 text-xs font-medium text-red-400 ring-1 ring-inset ring-red-400/20">
      //       Overdue
      //     </span>
      //   );
      default:
        return (
          <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
            {status}
          </span>
        );
    }
  }, [status]);
}

export default function Request({
  request,
  statusesP,
  group,
}: {
  request: ClientSafeRequest;
  statusesP: Promise<Record<string, { status: string }>>;
  group: string;
}) {
  const pathname = usePathname();
  const pathId = pathname.slice(pathname.lastIndexOf('/') + 1);

  return (
    <Link
      href={`/audit/${request.auditId}/request/${request.id}`}
      //   className="hover:underline hover:text-blue-500"
      scroll={false}
      key={request.id}
    >
      <li
        className={clsx(
          pathId === request.id
            ? 'text-gray-900 bg-gray-50'
            : 'hover:bg-gray-100 text-gray-500',
          'border-b border-gray-200 flex items-center p-0 pl-4',
        )}
      >
        {/* <td className="pl-4 sm:pl-2 py-3 text-sm "> */}
        <div className="flex items-center space-x-3 w-7">
          <Suspense fallback={<StatusBadge status="loading" />}>
            <Await promise={statusesP}>
              {(s) => <StatusBadge status={s[request.id].status} />}
            </Await>
          </Suspense>
        </div>

        <div className="py-2 text-sm">{request.name}</div>
      </li>
    </Link>
  );
}
