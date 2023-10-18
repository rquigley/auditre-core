import { notFound } from 'next/navigation';

import { getById } from '@/controllers/audit';
import { getAuditData } from '@/controllers/audit-output';
import { getCurrent } from '@/controllers/session-user';

export async function GET(
  req: Request,
  {
    params: { audit: id },
  }: {
    params: { audit: string };
  },
) {
  const user = await getCurrent();
  const audit = await getById(id);
  if (audit.orgId !== user.orgId) {
    return notFound();
  }
  const auditData = await getAuditData(id);
  return Response.json(auditData);
}
