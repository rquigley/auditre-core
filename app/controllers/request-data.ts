import { db } from '@/lib/db';
import {
  getAllDefaultValues,
  getDefaultValues,
  getRequestTypeForId,
  getStatusForRequestType,
} from '@/lib/request-types';

import type { RequestType } from '@/lib/request-types';
import type { AuditId, NewRequestData, RequestData, UserId } from '@/types';

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
  //includeDefaultValues: boolean = true,
): Promise<{
  data: Record<string, unknown>;

  // If we haven't yet saved data to a field ensure that it gets saved
  uninitializedFields: Array<string>;
}> {
  const rows = await db
    .selectFrom('requestData')
    .select(['requestId', 'data', 'documentId'])
    .distinctOn(['auditId', 'requestType', 'requestId'])
    .where('auditId', '=', auditId)
    .where('requestType', '=', rt.id)
    .orderBy(['auditId', 'requestType', 'requestId', 'createdAt desc'])
    .execute();

  const defaultValues = getDefaultValues(rt);
  const normalizedData = normalizeRequestData(defaultValues, rows);
  return {
    data: normalizedData.data,
    uninitializedFields: normalizedData.uninitializedFields,
  };
}

export async function getDataForAuditId(auditId: AuditId) {
  const rows = await db
    .selectFrom('requestData')
    .select(['requestType', 'requestId', 'data', 'documentId'])
    .distinctOn(['auditId', 'requestType', 'requestId'])
    .where('auditId', '=', auditId)
    .orderBy(['auditId', 'requestType', 'requestId', 'createdAt desc'])
    .execute();


export type DataObj = {
  requestId: string;
  data: Record<string, unknown> | null;
  documentId: string | null;
};
export function normalizeRequestData(
  defaultValues: Record<string, FormField['defaultValue']>,
  data: Array<DataObj>,
) {
  let dataMatchesConfig = true;
  let uninitializedFields = [];

  // First check if we've never saved data for this request type
  if (data.length === 0) {
    dataMatchesConfig = false;
  }

  const ret: Record<string, unknown> = {};
  for (const key of Object.keys(defaultValues)) {
    const d = data.find((r) => r.requestId === key);
    if (!d) {
      dataMatchesConfig = false;
      uninitializedFields.push(key);

      ret[key] = defaultValues[key];
    } else if (d.documentId) {
      ret[key] = d.documentId;
    } else if (d.data && 'value' in d.data) {
      ret[key] = d.data.value;
    }
  }

  return {
    data: ret,
    dataMatchesConfig,
    uninitializedFields,
  };
}
  for (const rt of Object.keys(data)) {
    const rtData = data[rt];
    for (const key of Object.keys(rtData)) {
      const d = rows.find((r) => r.requestId === key);
      if (!d) {
        continue;
      }
      if (d.documentId) {
        rtData[key] = d.documentId;
      } else if (d.data) {
        rtData[key] = d.data.value;
      }
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
