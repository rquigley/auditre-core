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
): Promise<Pick<RequestData, 'id' | 'data'> | undefined> {
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
type NormalizedData =
  | { isDocuments: true; documentIds: DocumentId[] }
  | unknown;
export function normalizeRequestData(
  rt: string,
  defaultValues: Record<string, unknown>,
  data: Array<DataObj>,
): {
  data: Record<string, NormalizedData>;
  uninitializedFields: Array<string>;
  form: Record<string, FormField>;
  requestType: string;
} {
  const form = getRequestTypeForId(rt).form;
  let dataMatchesConfig = true;
  let uninitializedFields = [];

  // First check if we've never saved data for this request type
  if (data.length === 0) {
    dataMatchesConfig = false;
  }

  const ret: Record<string, NormalizedData> = {};
  for (const key of Object.keys(defaultValues)) {
    const d = data.find((r) => r.requestId === key);
    if (!d) {
      dataMatchesConfig = false;
      uninitializedFields.push(key);

      ret[key] = defaultValues[key] as NormalizedData;
    } else if (form[key].input === 'fileupload') {
      ret[key] = {
        isDocuments: true,
        // @ts-expect-error
        documentIds: d.data?.documentIds as Array<DocumentId>,
      };
    } else if (d.data && 'value' in d.data) {
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
