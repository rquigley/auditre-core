import { getById as getAuditById } from '@/controllers/audit';
import {
  getRequestTypeForId,
  getSchemaForId,
  isFormFieldFile,
  requestTypes,
} from '@/lib/request-types';
import {
  create as addRequestData,
  createRequestDataDocument,
  deleteRequestDataDocument,
  getDataForRequestAttribute,
  getDataForRequestType,
} from './request-data';

import type { FormField, RequestType } from '@/lib/request-types';
import type { AuditId, DocumentId, OrgId, UserId } from '@/types';

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

export function getFirstRequestId(auditId: AuditId) {
  return requestTypes[0].id;
}

export async function saveRequestData({
  auditId,
  requestType,
  data: newDataRaw,
  actorUserId,
}: {
  auditId: AuditId;
  requestType: string;
  data: Record<string, FormField['defaultValue']>;
  actorUserId?: UserId;
}) {
  const rt = getRequestTypeForId(requestType);
  const { data: requestData, uninitializedFields } =
    await getDataForRequestType(auditId, rt);

  const newData = getSchemaForId(rt.id).parse(newDataRaw);
  // Ensure that all changes have the same timestamp
  const createdAt = new Date();

  for (const key of Object.keys(requestData)) {
    // don't try and save data if keys aren't included. The user might
    // only be seeing a subset of the fields.
    if (!newData.hasOwnProperty(key)) {
      continue;
    }
    if (isFormFieldFile(rt.form[key])) {
      const oldDocumentIds = requestData[key] as DocumentId[];
      const newDocumentIds = newData[key];
      const mods = getDocumentIdMods(oldDocumentIds, newDocumentIds);
      if (
        mods.toDelete.length === 0 &&
        mods.toAdd.length === 0 &&
        !uninitializedFields.includes(key)
      ) {
        continue;
      }
      const oldRdObj = await getDataForRequestAttribute(auditId, rt.id, key);
      const rdObj = await addRequestData({
        auditId: auditId,
        requestType: rt.id,
        requestId: key,
        // We save documentIds here in addition to RequestDataDocuments to reflect that a change
        // has occurred. I don't love that we're duplicating data here, but the simplicity tradeoff
        // feels worth it.
        data: { value: newDocumentIds },
        actorUserId,
        createdAt,
      });

      for (const documentId of mods.toAdd) {
        await createRequestDataDocument({
          documentId,
          requestDataId: rdObj.id,
        });
      }
      if (oldRdObj) {
        for (const documentId of mods.toDelete) {
          await deleteRequestDataDocument({
            documentId,
            requestDataId: oldRdObj.id,
          });
        }
      }
    } else if (
      uninitializedFields.includes(key) ||
      (newData[key] !== undefined && newData[key] !== requestData[key])
    ) {
      await addRequestData({
        auditId: auditId,
        requestType: rt.id,
        requestId: key,
        data: { value: newData[key] },
        actorUserId,
        createdAt,
      });
    }
  }
}

function getDocumentIdMods(oldDocumentIds: string[], newDocumentIds: string[]) {
  const toDelete = oldDocumentIds.filter((id) => !newDocumentIds.includes(id));
  const toAdd = newDocumentIds.filter((id) => !oldDocumentIds.includes(id));
  return { toDelete, toAdd };
}

export type Request = ReturnType<typeof getRequestBySlug>;

export function getRequestBySlug(slug: string) {
  const rt = getRequestTypeForId(slug);

  return {
    id: rt.id,
    name: rt.name,
    group: rt.group,
    description: rt.description,
    form: rt.form,
  };
}
