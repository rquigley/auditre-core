import { notFound } from 'next/navigation';
import { NextResponse } from 'next/server';

import { getById as getAuditById } from '@/controllers/audit';
import { generateTBAdjustments } from '@/controllers/output/excel';
import { getCurrent } from '@/controllers/session-user';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  {
    params: { audit: auditId },
  }: {
    params: { audit: string };
  },
) {
  const { user } = await getCurrent();
  if (!user) {
    return notFound();
  }
  const audit = await getAuditById(auditId);
  if (audit.orgId !== user.orgId) {
    return notFound();
  }

  const { document, documentName } = await generateTBAdjustments(auditId);
  const buffer = await document.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      'content-disposition': `attachment; filename=${documentName}`,
    },
  });
}
