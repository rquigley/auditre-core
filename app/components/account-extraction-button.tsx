'use client';

import clsx from 'clsx';
import { useState } from 'react';

import { Spinner } from '@/components/spinner';
import { extractAccountMapping } from '@/lib/actions';

import type { AuditId, DocumentId } from '@/types';

export function AccountExtractionButton({
  auditId,
  document,
}: {
  auditId: AuditId;
  document: {
    id: DocumentId;
    name: string;
  };
}) {
  const [isExtracting, setIsExtracting] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        setIsExtracting(true);
        await extractAccountMapping({ auditId, documentId: document.id });
        setIsExtracting(false);
      }}
      className={clsx(
        isExtracting
          ? 'cursor-not-allowed hover:bg-white'
          : 'hover:bg-gray-50 cursor-pointer',
        'inline-flex items-center mb-2 rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300',
      )}
    >
      {isExtracting ? (
        <>
          <Spinner />
          Extracting accounts from {document.name}
        </>
      ) : (
        <>Extract accounts from {document.name}</>
      )}
    </button>
  );
}
