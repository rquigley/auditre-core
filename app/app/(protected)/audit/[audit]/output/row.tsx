'use client';

import Link from 'next/link';

import { Document } from '@/components/document';
import { kebabToHuman } from '@/lib/util';

import type { AuditDocument } from './page';

export default function Row({
  auditId,
  document,
}: {
  auditId: string;
  document: AuditDocument;
}) {
  return (
    <div key={document.id}>
      <Document
        documentId={document.id}
        docKey={document.key}
        name={document.name}
      />
      {document.requestId && (
        <div className="-mt-2 ml-9 text-xs text-gray-500">
          <a
            href={`/document/${document.id}/download`}
            className="mr-4 text-sky-700 hover:text-slate-700"
          >
            Download
          </a>
          <Link
            href={`/audit/${auditId}/request/${document.requestType}`}
            className="text-sky-700 hover:text-slate-700"
          >
            {kebabToHuman(document.requestType)}
          </Link>
        </div>
      )}
      {/* <Datetime
        className="py-0.5 text-xs text-gray-500"
        dateTime={document.createdAt}
      /> */}
    </div>
  );
}
