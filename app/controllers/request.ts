import { getById as getAuditById } from '@/controllers/audit';
import {
  getRequestTypeForId,
  getSchemaForId,
  requestTypes,
} from '@/lib/request-types';
import {
  create as addRequestData,
  getDataForRequestType,
} from './request-data';

import type { RequestType } from '@/lib/request-types';
import type { AuditId, OrgId, UserId } from '@/types';

export type ClientSafeRequest = Pick<
  RequestType,
  'id' | 'name' | 'group' | 'description'
> & {
  auditId: AuditId;
  orgId: OrgId;
};
export async function getAllByAuditId(auditId: AuditId) {
  const audit = await getAuditById(auditId);

  return requestTypes.map((rt) => {
    return {
      id: rt.id,
      auditId,
      orgId: audit.orgId,
      name: rt.name,
      group: rt.group,
      description: rt.description,
    };
  });
}

export async function saveRequestData({
  auditId,
  requestType,
  data: newDataRaw,
  actorUserId,
}: {
  auditId: AuditId;
  requestType: string;
  data: Record<string, unknown>;
  actorUserId?: UserId;
}) {
  const audit = await getAuditById(auditId);
  const rt = getRequestTypeForId(requestType);
  const { data: requestData, uninitializedFields } =
    await getDataForRequestType(auditId, rt);

  const newData = getSchemaForId(rt.id).parse(newDataRaw);

  // Ensure that all changes have the same timestamp
  const createdAt = new Date();

  for (const key of Object.keys(requestData)) {
    if (
      uninitializedFields.includes(key) ||
      (newData[key] !== undefined && newData[key] !== requestData[key])
    ) {
      let data = null;
      let documentId = null;
      if (rt.form[key].input === 'fileupload') {
        documentId = newData[key] || null;
      } else {
        data = { value: newData[key] };
      }
      await addRequestData({
        auditId: auditId,
        orgId: audit.orgId,
        requestType: rt.id,
        requestId: key,
        data,
        documentId,
        actorUserId,
        createdAt,
      });
    }
  }
}

export type Request = Pick<
  RequestType,
  'id' | 'name' | 'group' | 'description' | 'form'
> & {
  auditId: AuditId;
  orgId: OrgId;
};
export async function getRequestBySlug(
  auditId: AuditId,
  slug: string,
): Promise<Request | false> {
  const audit = await getAuditById(auditId);
  if (!audit) {
    return false;
  }
  const rt = getRequestTypeForId(slug);

  return {
    id: rt.id,
    name: rt.name,
    group: rt.group,
    description: rt.description,
    form: rt.form,
    auditId: audit.id,
    orgId: audit.orgId,
  };
}

export function getDocumentIds(
  request: Request,
  requestData: Record<string, unknown>,
) {
  const documentIds = [];
  for (const key of Object.keys(requestData)) {
    if (
      request.form[key].input === 'fileupload' &&
      typeof requestData[key] === 'string'
    ) {
      documentIds.push({ field: key, documentId: requestData[key] as string });
    }
  }
  return documentIds;
}
