'use client';

import Datetime from '@/components/datetime';
import type { AuditWithRequestCounts } from '@/controllers/audit';
import Link from 'next/link';

export default function Row({ audit }: { audit: AuditWithRequestCounts }) {
  const pctComplete = (audit.numCompletedRequests / audit.numRequests) * 100;
  return (
    <tr key={audit.id} className="hover:bg-gray-100">
      <td className="py-5 pl-4 sm:pl-2 pr-3 text-sm">
        <Link href={`/audit/${audit.id}`} className="flex items-center gap-x-1">
          <span className="text-gray-900 font-semibold">{audit.name}</span>
        </Link>
      </td>

      <td className="whitespace-nowrap px-3 py-5 text-sm text-gray-500">
        {audit.year}
      </td>

      <td className="whitespace-nowrap px-3 py-5 text-sm text-gray-500">
        <Datetime
          className="py-0.5 text-sm text-gray-500"
          dateTime={audit.createdAt}
        />
      </td>

      <td className="w-20 whitespace-nowrap items-center flex pr-4 sm:pr-2 py-5 text-sm text-gray-500">
        <div className="ml-auto mt-2 h-1 w-20 bg-gray-200">
          <div
            className="h-1 bg-sky-700"
            style={{ width: `${pctComplete}%` }}
          ></div>
        </div>
      </td>
    </tr>
  );
}
