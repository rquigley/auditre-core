import { notFound } from 'next/navigation';
import { NextResponse } from 'next/server';

import { getById as getAuditById } from '@/controllers/audit';
import { generate } from '@/controllers/audit-output';
import { getCurrent } from '@/controllers/session-user';

const { Packer } = require('docx');

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

  const { document, documentName } = await generate(auditId);

  const b64string = await Packer.toBase64String(document);

  return new NextResponse(Buffer.from(b64string, 'base64'), {
    headers: {
      'content-disposition': `attachment; filename=${documentName}`,
    },
  });
}
