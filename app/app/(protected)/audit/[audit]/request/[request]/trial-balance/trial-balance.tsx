import { Suspense } from 'react';

import { Errors } from '@/components/errors';
import { PageSpinner } from '@/components/spinner';
import { checkDates } from '@/controllers/account-mapping';
import { getCurrent } from '@/controllers/session-user';
import { TrialBalanceTable } from './trial-balance-table';

import type { AuditId } from '@/types';

export async function TrialBalance({ auditId }: { auditId: AuditId }) {
  const { user, authRedirect } = await getCurrent();
  if (!user) {
    return authRedirect();
  }
  return (
    <div className="mt-8">
      <Suspense fallback={<PageSpinner />}>
        <Checks auditId={auditId} />
      </Suspense>
      <TrialBalanceTable auditId={auditId} currentUser={user.toJSON()} />
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
