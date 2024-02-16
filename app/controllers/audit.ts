import { unstable_cache } from 'next/cache';

import { getBalancesByAccountType } from '@/controllers/account-mapping';
import {
  getAiDataForDocumentId,
  getAllByAuditId as getAllDocumentsByAuditId,
} from '@/controllers/document';
import { db } from '@/lib/db';
import { getParser } from '@/lib/formula-parser';
import { isFormFieldFile } from '@/lib/request-types';
import { getLastDayOfMonth, getMonthName, kebabToCamel } from '@/lib/util';
import {
  buildBalanceSheet,
  buildIncomeStatement,
} from './financial-statement/table';
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

export async function create(audit: NewAudit) {
  return await db
    .insertInto('audit')
    .values({ ...audit })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function getById(
  id: OrgId,
  params?: { includeDeleted?: boolean },
) {
  return await db
    .selectFrom('audit')
    .where('id', '=', id)
    .$if(Boolean(params?.includeDeleted), (q) =>
      q.where('isDeleted', '=', false),
    )
    .selectAll()
    .executeTakeFirstOrThrow();
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
export async function getAllByOrgId(orgId: OrgId) {
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
// export type AuditData = Record<string, any>;
export type AuditData = Awaited<ReturnType<typeof getAuditData>>;

/**
 *
 * This pulls all necessary data for an audit for the following formats:
 * - Word .docx export
 * - Preview page
 * - Excel export
 *
 */
export async function getAuditData(auditId: AuditId) {
  const requestData = await getDataForAuditId(auditId);
  const documents = await getAllDocumentsByAuditId(auditId);
  // console.log(documents);

  const aiData: Record<string, Record<string, string>> = {};
  for (const document of documents) {
    // TODO: slow
    aiData[document.id] = await getAiDataForDocumentId(document.id);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type RequestFieldData = Record<string, any>;
  // type RequestFieldData = Record<
  //   string,
  //   | FormField['defaultValue']
  //   | Record<string, string>
  //   | Record<string, string>[]
  // >;
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
  const prevYear = String(Number(year) - 1);

  const fiscalYearEndNoYear = `${getMonthName(
    requestDataObj.auditInfo.fiscalYearMonthEnd,
  )} ${getLastDayOfMonth(
    requestDataObj.auditInfo.fiscalYearMonthEnd,
    requestDataObj.auditInfo.year,
  )}`;
  const totals = await getBalancesByAccountType(auditId, year);
  const totals2 = await getBalancesByAccountType(auditId, prevYear);
  return {
    auditId,
    totals,
    totalsNew: {
      [year]: totals,
      [prevYear]: totals2,
    },
    incomeStatementTable: buildIncomeStatement({
      year,
      prevYear,
      fiscalYearEndNoYear,
    }),
    year,
    prevYear,
    totals2,
    fiscalYearEndNoYear,
    fiscalYearEnd: `${fiscalYearEndNoYear}, ${year}`,
    rt: requestDataObj,
  };
}

export function getWarningsForAudit(data: AuditData) {
  const warnings: {
    previewSection: string;
    previewUrl: string;
    message: string;
  }[] = [];
  const bs = buildBalanceSheet(data);
  const parser = getParser(bs, data);
  for (const year of [data.year, data.prevYear]) {
    if (!year) {
      continue;
    }
    const idx = year === data.year ? 1 : 2;

    if (
      parser.parse(String(bs.getValue('TOTAL-ASSETS', idx)).substring(1))
        ?.result !==
      parser.parse(
        String(
          bs.getValue('TOTAL-LIABILITIES-AND-STOCKHOLDERS-DEFICIT', idx),
        ).substring(1),
      )?.result
    ) {
      warnings.push({
        previewSection: 'Consolidated balance sheet',
        previewUrl: '#section-balance-sheet',
        message: `Total assets don't equal total liabilities and stockholders' deficit for ${year}`,
      });
    }
  }

  return warnings;
}

export async function update(id: AuditId, updateWith: AuditUpdate) {
  return await db
    .updateTable('audit')
    .set(updateWith)
    .where('id', '=', id)
    .execute();
}
