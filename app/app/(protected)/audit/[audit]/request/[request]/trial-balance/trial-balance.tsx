import { Table } from './table';

import type { AuditId } from '@/types';

export async function TrialBalance({ auditId }: { auditId: AuditId }) {
  return (
    <div className="mt-8">
      <Table auditId={auditId} />
    </div>
  );
}
