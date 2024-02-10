'use client';

// import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import Datetime from '@/components/datetime';

import type { Document } from './page';

export default function Row({ document }: { document: Document }) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <tr key={document.id} className="hover:bg-gray-100">
      <td className="py-5 pl-5 pr-3 text-sm">
        {/* <Link href={`/document/${document.id}`}>
          <span className="text-gray-900">{document.name}</span>
        </Link> */}
        {/* <Link href={`/document/${document.id}`}> */}
        <span
          onClick={() => {
            router.replace(pathname + '?show-document-id=' + document.id);
          }}
          className="text-gray-900"
        >
          {document.name}
        </span>
        {/* </Link> */}
        <div>
          {/* <a
            href={`/document/${document.id}/download`}
            className="flex items-center gap-x-1"
          >
            <DocumentArrowDownIcon
              className="size-4 text-green-700"
              aria-hidden="true"
            />

            <span className="text-gray-900">Download</span>
          </a> */}
          {/* <a
            href="#"
            onClick={() => {
              navigator.clipboard.writeText(document.id);
            }}
          >
            Copy Id to clipboard
          </a> */}
        </div>
      </td>
      <td className="whitespace-nowrap px-3 py-5 text-sm text-gray-500">
        <Datetime
          className="py-0.5 text-xs text-gray-500"
          dateTime={document.createdAt}
        />
      </td>

      <td className="relative whitespace-nowrap py-5 pr-5 text-right text-sm">
        {/* {document.auditId && (
          <>
            <span className="text-xs">
              {document.auditName}
              <br />
              <Link
                href={`/audit/${document.auditId}/request/${document.requestType}`}
                className="text-sky-700 hover:text-sky-700"
              >
                {document.requestType}
              </Link>
            </span>
          </>
        )} */}
      </td>
    </tr>
  );
}
