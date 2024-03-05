'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Spinner } from '@/components/spinner';
import { getAccountMappingStatus } from '@/lib/actions';
import { AuditId } from '@/types';

type StatusRes = {
  numToProcess: number;
  numToProcessTotal: number;
};

export function StatusSpinner({ auditId }: { auditId: AuditId }) {
  const router = useRouter();
  const [status, setStatus] = useState<StatusRes | null>(null);
  const [prevNum, setPrevNum] = useState(0);

  useEffect(() => {
    const idx = setInterval(() => {
      getAccountMappingStatus(auditId).then((data) => {
        setStatus(data);
        // This is a hack to force a refresh when the number of accounts
        // to process changes.
        if (prevNum !== data?.numToProcess) {
          router.refresh();
        }
        setPrevNum(data?.numToProcess || 0);
      });
    }, 1000);
    return () => clearInterval(idx);
  }, [auditId, router, prevNum]);

  if (!status?.numToProcess) {
    return null;
  }
  return (
    <div className="flex">
      <div className="mt-3 flex items-center text-sm text-gray-600">
        <Spinner />
        Mapping {status?.numToProcessTotal - status?.numToProcess}/
        {status?.numToProcessTotal} accounts
      </div>
    </div>
  );
}
