import { db } from '@/lib/db';
import {
  getAllDefaultValues,
  getDefaultValues,
  getRequestTypeForId,
  getStatusForRequestType,
} from '@/lib/request-types';

import type { FormField, RequestType } from '@/lib/request-types';
import type {
  AuditId,
  DocumentId,
  NewRequestData,
  RequestData,
  RequestDataId,
  UserId,
} from '@/types';

export async function create(requestData: NewRequestData) {
  return await db
    .insertInto('requestData')
    .values({ ...requestData })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function getDataForRequestType(
  auditId: AuditId,
  rt: Pick<RequestType, 'id' | 'form'>,
) {
  const rows = await db
    .selectFrom('requestData')
    .select(['requestId', 'data'])
    .distinctOn(['auditId', 'requestType', 'requestId'])
    .where('auditId', '=', auditId)
    .where('requestType', '=', rt.id)
    .orderBy(['auditId', 'requestType', 'requestId', 'createdAt desc'])
    .execute();

  const defaultValues = getDefaultValues(rt);
  const normalizedData = normalizeRequestData(rt.id, defaultValues, rows);
  return {
    data: normalizedData.data,
    uninitializedFields: normalizedData.uninitializedFields,
  };
}

export async function getDataForRequestAttribute(
  auditId: AuditId,
  requestType: string,
  requestId: string,
) {
  return await db
    .selectFrom('requestData')
    .select(['id', 'data'])
    .where('auditId', '=', auditId)
    .where('requestType', '=', requestType)
    .where('requestId', '=', requestId)
    .orderBy(['createdAt desc'])
    .limit(1)
    .executeTakeFirst();
}

export async function getDataForRequestAttribute2(
  auditId: AuditId,
  requestType: string,
  requestId: string,
) {
  const res = await db
    .selectFrom('requestData')
    .select(['id', 'data'])
    .where('auditId', '=', auditId)
    .where('requestType', '=', requestType)
    .where('requestId', '=', requestId)
    .orderBy(['createdAt desc'])
    .limit(1)
    .executeTakeFirst();

  return res?.data.value;
}

export async function getDataForAuditId(auditId: AuditId) {
  const rows = await db
    .selectFrom('requestData')
    .select(['requestType', 'requestId', 'data'])
    .distinctOn(['auditId', 'requestType', 'requestId'])
    .where('auditId', '=', auditId)
    .orderBy(['auditId', 'requestType', 'requestId', 'createdAt desc'])
    .execute();

  const ret: Record<string, ReturnType<typeof normalizeRequestData>> = {};
  const allDefaultValues = getAllDefaultValues();
  for (const rt of Object.keys(allDefaultValues)) {
    const requestRows = rows.filter((r) => r.requestType === rt);

    ret[rt] = normalizeRequestData(rt, allDefaultValues[rt], requestRows);
  }

  return ret;
}

export type DataObj = {
  requestId: string;
  data: RequestData['data'];
};

export function normalizeRequestData(
  rt: string,
  defaultValues: Record<string, FormField['defaultValue']>,
  data: Array<DataObj>,
) {
  const form = getRequestTypeForId(rt).form;
  const uninitializedFields = [];

  const ret: Record<string, FormField['defaultValue']> = {};
  for (const key of Object.keys(defaultValues)) {
    const d = data.find((r) => r.requestId === key);
    if (!d) {
      uninitializedFields.push(key);

      ret[key] = defaultValues[key];
    } else if ('value' in d.data) {
      ret[key] = d.data.value;
    }
  }

  return {
    data: ret,
    uninitializedFields,
    form,
    requestType: rt,
  };
}

export async function getStatusesForAuditId(auditId: AuditId) {
  const data = await getDataForAuditId(auditId);

  const statuses: Record<
    string,
    ReturnType<typeof getStatusForRequestType>
  > = {};
  for (const rt of Object.keys(data)) {
    statuses[rt] = getStatusForRequestType(rt, data[rt]);
  }
  return statuses;
}

export async function getChangesForRequestType(
  auditId: AuditId,
  rt: Pick<RequestType, 'id' | 'form'>,
) {
  const rows = await db
    .selectFrom('requestData')
    .leftJoin('auth.user as u', 'requestData.actorUserId', 'u.id')
    .select([
      'requestData.actorUserId',
      'requestData.createdAt',
      'u.name',
      'u.email',
      'u.image',
    ])
    .distinctOn(['requestData.auditId', 'requestData.createdAt'])
    .where('requestData.auditId', '=', auditId)
    .where('requestData.requestType', '=', rt.id)
    .orderBy(['requestData.createdAt desc'])
    .execute();
  return rows;
}

export async function createRequestDataDocument({
  requestDataId,
  documentId,
}: {
  requestDataId: RequestDataId;
  documentId: string;
}) {
  return await db
    .insertInto('requestDataDocument')
    .values({ requestDataId, documentId })
    .execute();
}

export async function deleteRequestDataDocument({
  requestDataId,
  documentId,
}: {
  requestDataId: RequestDataId;
  documentId: string;
}) {
  return await db
    .deleteFrom('requestDataDocument')
    .where('requestDataId', '=', requestDataId)
    .where('documentId', '=', documentId)
    .execute();
}

export async function getAuditIdsForDocument(documentId: DocumentId) {
  const rows = await db
    .selectFrom('requestDataDocument')
    .innerJoin(
      'requestData',
      'requestDataDocument.requestDataId',
      'requestData.id',
    )
    .select(['auditId'])
    .where('documentId', '=', documentId)
    .execute();
  return rows.map((r) => r.auditId);
}

export async function unlinkDocument({
  documentId,
  auditId,
  actorUserId,
}: {
  documentId: DocumentId;
  auditId: AuditId;
  actorUserId: UserId;
}) {
  const rows = await db
    .with('latestRequestData', (qb) =>
      qb
        .selectFrom('requestData')
        .distinctOn(['requestType', 'requestId'])
        .select(['id', 'requestType', 'requestId', 'data'])
        .where('auditId', '=', auditId)
        .orderBy(['requestType', 'requestId', 'createdAt desc']),
    )
    .selectFrom('requestDataDocument')
    .innerJoin(
      'latestRequestData',
      'requestDataDocument.requestDataId',
      'latestRequestData.id',
    )
    .select([
      'requestDataId',
      'latestRequestData.requestId',
      'latestRequestData.requestType',
      'data',
    ])
    .where('documentId', '=', documentId)
    .execute();

  for (const row of rows) {
    if (!Array.isArray(row.data.value)) {
      throw new Error('Request data is not a document type');
    }
    const newDocumentIds = row.data.value.filter((id) => id !== documentId);
    await deleteRequestDataDocument({
      requestDataId: row.requestDataId,
      documentId,
    });

    await create({
      auditId: auditId,
      requestType: row.requestType,
      requestId: row.requestId,
      data: { value: newDocumentIds } as const,
      actorUserId: actorUserId || null,
    });
  }
}
