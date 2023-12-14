import {
  getAllAccountBalancesByAuditId,
  getStatus as getExtractionStatus,
} from '@/controllers/account-mapping';
import { Table } from './table';

import type { AuditId } from '@/types';

export async function TrialBalance({ auditId }: { auditId: AuditId }) {
  const rows = await getAllAccountBalancesByAuditId(auditId);
  const status = await getExtractionStatus(auditId);

  return (
    <div className="mt-8">
      <Table
        auditId={auditId}
        prefetchRows={rows}
        isProcessing={status.isProcessing}
      />
    </div>
  );
}
