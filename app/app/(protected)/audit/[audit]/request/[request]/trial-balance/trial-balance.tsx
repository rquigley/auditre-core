import { Suspense } from 'react';

import { Errors } from '@/components/errors';
import { PageSpinner } from '@/components/spinner';
import { checkDates } from '@/controllers/account-mapping';
import { Table } from './table';

import type { AuditId } from '@/types';

export async function TrialBalance({ auditId }: { auditId: AuditId }) {
  return (
    <div className="mt-8">
      <Suspense fallback={<PageSpinner />}>
        <Checks auditId={auditId} />
      </Suspense>
      <Table auditId={auditId} />
    </div>
  );
}

async function Checks({ auditId }: { auditId: AuditId }) {
  const errors = await checkDates(auditId, false);
  if (!errors.length) {
    return null;
  }
  return <Errors messages={errors} />;
}
