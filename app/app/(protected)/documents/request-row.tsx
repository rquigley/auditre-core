'use client';

import { DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import Datetime from '@/components/datetime';
import type { ClientSafeDocument } from '@/types';

export default function RequestRow({
  document,
}: {
  document: ClientSafeDocument & {
    auditName?: string;
    requestName?: string;
  };
}) {
  return (
    <tr
      key={document.id}
      className="hover:bg-gray-100"
      onClick={() => console.log('sdfsdf')}
    >
      <td className="py-5 pl-4 pr-3 text-sm sm:pl-0">
        <a
          href={`/document/${document.id}/download`}
          className="flex items-center gap-x-1"
        >
          <DocumentArrowDownIcon
            className="h-4 w-4 text-green-700"
            aria-hidden="true"
          />

          <span className="text-gray-900 font-semibold">{document.name}</span>
        </a>
      </td>
      <td className="whitespace-nowrap px-3 py-5 text-sm text-gray-500">
        <Datetime
          className="py-0.5 text-xs text-gray-500"
          dateTime={document.createdAt}
        />
      </td>

      <td className="whitespace-nowrap px-3 py-5 text-sm text-gray-500">
        [Added by user]
      </td>
      <td className="relative whitespace-nowrap py-5 pl-3 pr-4 text-right text-sm sm:pr-0">
        {document.requestId && (
          <>
            <span className="text-xs">
              {document.auditName}
              <br />
              <Link
                href={`/request/${document.requestId}`}
                className="text-indigo-600 hover:text-indigo-900"
              >
                {document.requestName}
              </Link>
            </span>
          </>
        )}
      </td>
    </tr>
  );
}
