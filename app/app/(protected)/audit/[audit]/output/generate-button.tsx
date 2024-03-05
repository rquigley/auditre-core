'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { PrimaryButton } from '@/components/button';

import type { AuditId } from '@/types';

export function GenerateDocButton({ auditId }: { auditId: AuditId }) {
  const [submitting, setSubmitting] = useState(false);

  return (
    <PrimaryButton
      submitting={submitting}
      onClick={async () => {
        setSubmitting(true);
        toast.success('Report generated. Downloading');
        await forceDownload(`/audit/${auditId}/generate-doc`);
        setSubmitting(false);
      }}
      label="Generate Financial Statement (Doc)"
    />
  );
}

export function GenerateExcelButton({ auditId }: { auditId: AuditId }) {
  const [submitting, setSubmitting] = useState(false);

  return (
    <PrimaryButton
      submitting={submitting}
      onClick={async () => {
        setSubmitting(true);
        await forceDownload(`/audit/${auditId}/generate-excel`);
        setSubmitting(false);
      }}
      label="Generate Financial Statement (Excel)"
    />
  );
}

async function forceDownload(url: string) {
  const resp = await fetch(url);
  const disposition = resp.headers.get('content-disposition');
  if (!disposition) {
    throw new Error('No content-disposition header');
  }

  const match = disposition.match(/filename=(.+)/);
  if (!match) {
    throw new Error('No filename in content-disposition header');
  }
  const filename = match[1];

  const blob = await resp.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = filename;
  document.body.appendChild(a);

  a.click();
  a.remove();
}
