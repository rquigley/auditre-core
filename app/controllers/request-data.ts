import { getAll as getAllAudits } from '@/controllers/audit';
import { db } from '@/lib/db';
import { getDefaultValues } from '@/lib/request-types';

import type { RequestType } from '@/lib/request-types';
import type {
  AuditId,
  NewRequestData,
  OrgId,
  RequestData,
  RequestDataUpdate,
  RequestId,
  UserId,
} from '@/types';

export async function create(
  requestData: NewRequestData,
): Promise<RequestData> {
  return await db
    .insertInto('requestData')
    .values({ ...requestData })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function getDataForRequestType(
  auditId: AuditId,
  rt: Pick<RequestType, 'id' | 'form'>,
): Promise<Record<string, unknown>> {
  const rows = await db
    .selectFrom('requestData')
    .select(['requestId', 'data', 'documentId'])
    .distinctOn(['auditId', 'requestType', 'requestId'])
    .where('auditId', '=', auditId)
    .where('requestType', '=', rt.id)
    //  .where('requestId', '=', 'business-name')
    .orderBy(['auditId', 'requestType', 'requestId', 'createdAt desc'])
    .execute();

  const data = getDefaultValues(rt);
  for (const key of Object.keys(data)) {
    const d = rows.find((r) => r.requestId === key);
    if (!d) {
      continue;
    }
    if (d.documentId) {
      data[key] = d.documentId;
    } else if (d.data) {
      data[key] = d.data.value;
    }
  }

  return data;
}

type Change = {
  createdAt: Date;
  actorUserId: UserId | null;
  name: string | null;
  image?: string | null;
};
export async function getChangesForRequestType(
  auditId: AuditId,
  rt: Pick<RequestType, 'id' | 'form'>,
): Promise<Array<Change>> {
  const rows = await db
    .selectFrom('requestData')
    .leftJoin('user', 'requestData.actorUserId', 'user.id')
    .select([
      'requestData.actorUserId',
      'requestData.createdAt',
      'user.name',
      'user.image',
    ])
    .distinctOn(['requestData.auditId', 'requestData.createdAt'])
    .where('requestData.auditId', '=', auditId)
    .where('requestData.requestType', '=', rt.id)
    .orderBy(['requestData.createdAt desc'])
    .execute();
  return rows;
}
