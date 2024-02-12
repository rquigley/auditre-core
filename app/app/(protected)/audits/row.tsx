'use client';

import Link from 'next/link';

// import Datetime from '@/components/datetime';

import type { AuditWithRequestCounts } from '@/controllers/audit';

export default function Row({
  audit,
}: {
  audit: AuditWithRequestCounts & { firstRequestSlug: string };
}) {
  // const pctComplete = (audit.numCompletedRequests / audit.numRequests) * 100;
  return (
    <Link
      href={`/audit/${audit.id}/request/${audit.firstRequestSlug}`}
      // className="flex items-center gap-x-1"
    >
      <li className="border-b border-gray-200 flex items-center p-0 pl-4 hover:bg-gray-100 text-gray-500">
        <span className="py-2 text-sm">
          {audit.name} ({audit.year})
        </span>

        {/* <div className="ml-auto mt-2 h-1 w-20 bg-gray-200">
          <div
            className="h-1 bg-sky-700"
            style={{ width: `${pctComplete}%` }}
          ></div>
        </div> */}
      </li>
    </Link>
  );
}
