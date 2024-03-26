import { notFound } from 'next/navigation';

import {
  getAllAccountBalancesByAuditId,
  getStatus,
} from '@/controllers/account-mapping';
import { getByIdForClientCached } from '@/controllers/audit';
import { getCurrent } from '@/controllers/session-user';

import type { AuditId } from '@/types';

export type AccountBalance = Awaited<
  ReturnType<typeof getAllAccountBalancesByAuditId>
>[0];
export type AccountBalanceResp = {
  rows: AccountBalance[];
  isProcessing: boolean;
  numProcessed: number;
  numToProcessTotal: number;
};
export async function GET(
  req: Request,
  {
    params: { audit: auditId },
  }: {
    params: { audit: AuditId };
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

  const rowsP = getAllAccountBalancesByAuditId(auditId);
  const statusP = getStatus(auditId);

  const [rows, status] = await Promise.all([rowsP, statusP]);

  return Response.json({
    rows,
    ...status,
  } satisfies AccountBalanceResp);
}
