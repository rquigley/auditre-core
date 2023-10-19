'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { deleteAudit } from '@/lib/actions';

import type { AuditId } from '@/types';

export function DeleteAuditButton({ auditId }: { auditId: AuditId }) {
  const router = useRouter();
  return (
    <button
      type="submit"
      onClick={async () => {
        await deleteAudit(auditId);
        toast.success('Audit deleted');
        router.push(`/audits`);
      }}
      className="bg-red-700 hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm transition"
    >
      Delete audit
    </button>
  );
}
