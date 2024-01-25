import { unstable_cache } from 'next/cache';

import { getBalancesByAccountType } from '@/controllers/account-mapping';
import {
  getAiDataForDocumentId,
  getAllByAuditId as getAllDocumentsByAuditId,
} from '@/controllers/document';
import { db } from '@/lib/db';
import { FormField, isFormFieldFile } from '@/lib/request-types';
import { getLastDayOfMonth, getMonthName, kebabToCamel } from '@/lib/util';
import {
  getDataForAuditId,
  getDataForRequestAttribute2,
  getStatusesForAuditId,
} from './request-data';

import type {
  Audit,
  AuditId,
  AuditUpdate,
  DocumentId,
  NewAudit,
  OrgId,
} from '@/types';

export async function create(audit: NewAudit): Promise<Audit> {
  return await db
    .insertInto('audit')
    .values({ ...audit })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function getById(
  id: OrgId,
  params?: { includeDeleted?: boolean },
): Promise<Audit> {
  let query = db.selectFrom('audit').where('id', '=', id);
  if (!params?.includeDeleted) {
    query = query.where('isDeleted', '=', false);
  }
  return await query.selectAll().executeTakeFirstOrThrow();
}

// TODO: let's figure out a better pattern for where this lives.
export async function getByIdForClient(auditId: AuditId) {
  const audit = await db
    .selectFrom('audit')
    .select(['id', 'name', 'createdAt', 'orgId'])
    .where('id', '=', auditId)
    .where('isDeleted', '=', false)
    .executeTakeFirst();

  if (!audit) {
    return undefined;
  }

  const year = (await getDataForRequestAttribute2(
    audit.id,
    'audit-info',
    'year',
  )) as string;

  return {
    ...audit,
    year,
  };
}

export const getByIdForClientCached = unstable_cache(
  async (auditId: AuditId) => getByIdForClient(auditId),
  ['audit-getByIdForClient'],
  {
    tags: [`client-audit`],
  },
);

export type AuditWithRequestCounts = Pick<
  Audit,
  'id' | 'name' | 'createdAt'
> & {
  year: string;
  numCompletedRequests: number;
  numRequests: number;
};
export async function getAllByOrgId(
  orgId: OrgId,
): Promise<AuditWithRequestCounts[]> {
  const audits = await db
    .selectFrom('audit')
    .select(['id', 'name', 'createdAt'])
    .where('orgId', '=', orgId)
    .where('isDeleted', '=', false)
    .orderBy(['name'])
    .execute();

  const ret: AuditWithRequestCounts[] = [];
  for (const audit of audits) {
    const year = (await getDataForRequestAttribute2(
      audit.id,
      'audit-info',
      'year',
    )) as string;

    const statuses = await getStatusesForAuditId(audit.id);
    ret.push({
      ...audit,
      year,
      numCompletedRequests: Object.values(statuses).reduce(
        (acc, s) => s.completedTasks + acc,
        0,
      ),
      numRequests: Object.values(statuses).reduce(
        (acc, s) => s.totalTasks + acc,
        0,
      ),
    });
  }
  return ret;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AuditData = Record<string, any>;
// export type AuditData = Awaited<ReturnType<typeof getAuditData>> & {
//   [key: string]: any;
// };

/**
 *
 * This pulls all necessary data for an audit for the following formats:
 * - Word .docx export
 * - Preview page
 * - Excel export
 *
 */
export async function getAuditData(auditId: AuditId): Promise<AuditData> {
  const requestData = await getDataForAuditId(auditId);
  const documents = await getAllDocumentsByAuditId(auditId);
  // console.log(documents);

  const aiData: Record<string, Record<string, string>> = {};
  for (const document of documents) {
    // TODO: slow
    aiData[document.id] = await getAiDataForDocumentId(document.id);
  }

  type RequestFieldData = Record<
    string,
    | FormField['defaultValue']
    | Record<string, string>
    | Record<string, string>[]
  >;
  const requestDataObj: Record<string, RequestFieldData> = {};
  for (const [key, fields] of Object.entries(requestData)) {
    const fieldsData: RequestFieldData = {};

    for (const [field, fieldVal] of Object.entries(fields.data)) {
      const config = fields.form[field];
      if (isFormFieldFile(config)) {
        const documentIds = fieldVal as DocumentId[];
        if (documentIds.length === 0) {
          fieldsData[field] = {};
          continue;
        }

        if (config.allowMultiple) {
          const d: Record<string, string>[] = [];
          documentIds.forEach((id) => {
            d.push({
              ...aiData[id],
            });
          });
          fieldsData[field] = d;
        } else {
          fieldsData[field] = aiData[documentIds[0]] || {};
        }
      } else {
        fieldsData[field] = fields.data[field];
      }
    }
    requestDataObj[kebabToCamel(key)] = fieldsData;
  }
  const year = String(requestDataObj.auditInfo?.year) || '';

  const totals = await getBalancesByAccountType(auditId, year);

  return {
    auditId,
    totals,
    year,
    fiscalYearEndNoYear: `${getMonthName(
      // @ts-expect-error
      requestDataObj.auditInfo.fiscalYearMonthEnd,
    )} ${getLastDayOfMonth(
      // @ts-expect-error
      requestDataObj.auditInfo.fiscalYearMonthEnd,
      requestDataObj.auditInfo.year,
    )}`,
    fiscalYearEnd: `${requestDataObj.fiscalYearEndNoYear}, ${requestDataObj.year}`,
    ...requestDataObj,
  };
}

export async function update(id: AuditId, updateWith: AuditUpdate) {
  return await db
    .updateTable('audit')
    .set(updateWith)
    .where('id', '=', id)
    .execute();
}
