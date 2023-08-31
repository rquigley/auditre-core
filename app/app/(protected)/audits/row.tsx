'use client';

import { DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import Datetime from '@/components/datetime';
import type { Audit } from '@/types';

export default function Row({ audit }: { audit: Audit }) {
  return (
    <tr
      key={audit.id}
      className="hover:bg-gray-100"
      onClick={() => console.log('sdfsdf')}
    >
      <td className="py-5 pl-4 pr-3 text-sm sm:pl-0">
        <a href={`/audit/${audit.id}`} className="flex items-center gap-x-1">
          <span className="text-gray-900 font-semibold">{audit.name}</span>
        </a>
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

      <td className="whitespace-nowrap px-3 py-5 text-sm text-gray-500">
        [x of y completed requests]
      </td>
      <td className="relative whitespace-nowrap py-5 pl-3 pr-4 text-right text-sm sm:pr-0">
        settings
        {/* {audit.requestId && (
          <>
            <span className="text-xs">
              {audit.auditName}
              <br />
              <Link
                href={`/request/${audit.requestId}`}
                className="text-indigo-600 hover:text-indigo-900"
              >
                {document.requestName}
              </Link>
            </span>
          </>
        )} */}
      </td>
    </tr>
  );
}
