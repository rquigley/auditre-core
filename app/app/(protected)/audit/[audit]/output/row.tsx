'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import Datetime from '@/components/datetime';

import type { DocumentWithRequestData } from '@/controllers/document';

export default function Row({
  auditId,
  document,
}: {
  auditId: string;
  document: DocumentWithRequestData;
}) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <tr key={document.id} className="hover:bg-gray-100">
      <td className="py-5 pl-4 sm:pl-2 pr-3 text-sm">
        <button
          type="button"
          onClick={() => {
            router.replace(pathname + '?show-document-id=' + document.id);
          }}
        >
          <span className="text-gray-900">{document.name}</span>
        </button>
      </td>
      <td className="whitespace-nowrap px-3 py-5 text-sm text-gray-500">
        <Datetime
          className="py-0.5 text-xs text-gray-500"
          dateTime={document.createdAt}
        />
      </td>

      <td className="relative whitespace-nowrap py-5 pr-4 sm:pr-2 text-right text-sm">
        {document.requestId && (
          <>
            <span className="text-xs">
              <Link
                href={`/audit/${auditId}/request/${document.requestType}`}
                className="text-sky-700 hover:text-sky-700"
              >
                {document.requestType}
              </Link>
            </span>
          </>
        )}
      </td>
    </tr>
  );
}
