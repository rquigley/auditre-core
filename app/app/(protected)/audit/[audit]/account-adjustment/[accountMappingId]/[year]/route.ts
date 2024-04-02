import { notFound } from 'next/navigation';

import { getAdjustments } from '@/controllers/account-mapping';
import { getByIdForClientCached } from '@/controllers/audit';
import { getCurrent } from '@/controllers/session-user';

import type { AuditId } from '@/types';

export type AccountAdjustmentResp = Awaited<ReturnType<typeof getAdjustments>>;
export async function GET(
  req: Request,
  {
    params: { audit: auditId, accountMappingId, year },
  }: {
    params: { audit: AuditId; accountMappingId: string; year: string };
  },
) {
  const { user } = await getCurrent();
  if (!user) {
    return notFound();
  }
  const audit = await getByIdForClientCached(auditId);
  if (!audit || audit.orgId !== user.orgId) {
    return notFound();
  }

  const res = await getAdjustments(accountMappingId, year);

  return Response.json(res);
}
