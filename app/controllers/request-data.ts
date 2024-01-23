import { db } from '@/lib/db';
import {
  getAllDefaultValues,
  getDefaultValues,
  getRequestTypeForId,
  getStatusForRequestType,
} from '@/lib/request-types';

import type {
  FormField,
  RequestType,
  RequestTypeStatus,
} from '@/lib/request-types';
import type {
  AuditId,
  DocumentId,
  NewRequestData,
  RequestData,
  RequestDataId,
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

  let ret: Record<string, ReturnType<typeof normalizeRequestData>> = {};
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
  let dataMatchesConfig = true;
  let uninitializedFields = [];

  // First check if we've never saved data for this request type
  if (data.length === 0) {
    dataMatchesConfig = false;
  }

  const ret: Record<string, FormField['defaultValue']> = {};
  for (const key of Object.keys(defaultValues)) {
    const d = data.find((r) => r.requestId === key);
    if (!d) {
      dataMatchesConfig = false;
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

  let statuses: Record<string, RequestTypeStatus> = {};
  for (const rt of Object.keys(data)) {
    statuses[rt] = getStatusForRequestType(rt, data[rt]);
  }
  return statuses;
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
    .leftJoin('auth.user as u', 'requestData.actorUserId', 'u.id')
    .select([
      'requestData.actorUserId',
      'requestData.createdAt',
      'u.name',
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

export async function unlinkDocumentFromRequestData({
  documentId,
  auditId,
  requestType,
  requestId,
  actorUserId,
}: {
  documentId: DocumentId;
  auditId: AuditId;
  requestType: string;
  requestId: string;
  actorUserId?: UserId;
}) {
  const existingRow = await getDataForRequestAttribute(
    auditId,
    requestType,
    requestId,
  );
  if (!existingRow) {
    throw new Error('No request data found');
  }
  if (!Array.isArray(existingRow.data.value)) {
    throw new Error('Request data is not a document type');
  }
  const newDocumentIds = existingRow.data.value.filter(
    (id) => id !== documentId,
  );

  await create({
    auditId: auditId,
    requestType,
    requestId,
    data: { value: newDocumentIds } as const,
    actorUserId: actorUserId || null,
  });

  await deleteRequestDataDocument({
    requestDataId: existingRow.id,
    documentId,
  });
}
