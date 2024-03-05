'use client';

import clsx from 'clsx';
import { usePathname, useRouter } from 'next/navigation';

import { FiletypeIcon } from '@/components/filetype-icon';

export function Document({
  documentId,
  docKey,
  name,
}: {
  documentId?: string;
  docKey: string;
  name: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={() => {
          if (documentId) {
            router.replace(pathname + '?show-document-id=' + documentId);
          }
        }}
        disabled={!documentId}
        className={clsx(
          documentId ? 'hover:border-slate-300' : 'cursor-auto',
          'flex h-9 cursor-pointer items-center border  border-white p-1',
        )}
      >
        <FiletypeIcon filename={docKey} />
        <span className="ml-1.5 text-sm text-slate-700">{name}</span>
      </button>
      {/* <div className="text-xs text-slate-500 ml-9">Uploaded Dec 24, 2023</div> */}
    </div>
  );
}
