'use client';

import dayjs from 'dayjs';
import { DocumentArrowDownIcon } from '@heroicons/react/24/outline';

import type { ClientSafeDocument } from '@/types';

export default function RequestRow({
  document,
}: {
  document: ClientSafeDocument;
}) {
  return (
    <tr
      key={document.externalId}
      className="hover:bg-gray-100"
      onClick={() => console.log('sdfsdf')}
    >
      <td className="py-5 pl-4 pr-3 text-sm sm:pl-0">
        <a
          href={`/document/${document.externalId}/download`}
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
        {dayjs(document.createdAt).format('MM/DD/YYYY HH:mma UTC')}
      </td>
      <td className="whitespace-nowrap px-3 py-5 text-sm text-gray-500">
        {dayjs(document.lastModified).format('MM/DD/YYYY HH:mma ')}
      </td>

      <td className="whitespace-nowrap px-3 py-5 text-sm text-gray-500">
        [Added by user]
      </td>
      <td className="relative whitespace-nowrap py-5 pl-3 pr-4 text-right text-sm sm:pr-0">
        <div>
          <a href="#" className="text-indigo-600 hover:text-indigo-900">
            View request
          </a>
        </div>
        <span className="text-xs">Request name</span>
      </td>
    </tr>
  );
}
