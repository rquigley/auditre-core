import { notFound } from 'next/navigation';

import { getById } from '@/controllers/audit';
import { getDataForAuditId } from '@/controllers/request-data';
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
  const auditData = await getDataForAuditId(id);
  return Response.json(auditData);
}
