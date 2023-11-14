'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { PrimaryButton } from '@/components/button';
import { delay } from '@/lib/util';

import type { AuditId } from '@/types';

export function GenerateFinancialStatementButton({
  auditId,
}: {
  auditId: AuditId;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  return (
    <PrimaryButton
      submitting={submitting}
      onClick={async (ev) => {
        setSubmitting(true);
        await delay(5000);
        toast.success('Report generated. Downloading');
        router.push(`/audit/${auditId}/generate`);
        setSubmitting(false);
      }}
      label="Generate Financial Statement"
    />
  );
}
