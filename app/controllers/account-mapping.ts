import dedent from 'dedent';
import leven from 'leven';
import { PassjoinIndex } from 'mnemonist';
import { inferSchema, initParser } from 'udsv';
import * as z from 'zod';

import {
  createAiQuery,
  pollGetByDocumentIdAndIdentifier,
} from '@/controllers/ai-query';
import {
  getById as getDocumentById,
  PAGE_DELIMITER,
} from '@/controllers/document';
import { getDataForRequestAttribute } from '@/controllers/request-data';
import { call } from '@/lib/ai';
import { db } from '@/lib/db';
import {
  documentAiQuestions,
  isAIQuestionJSON,
} from '@/lib/document-ai-questions';
import { bucket } from '@/lib/util';

import type { OpenAIMessage } from '@/lib/ai';
import type {
  AccountMapping,
  AccountMappingId,
  AccountMappingUpdate,
  AuditId,
  Document,
  DocumentId,
  NewAccountMapping,
  OpenAIModel,
} from '@/types';

export const accountTypes = {
  ASSET_CASH_AND_CASH_EQUIVALENTS: 'Cash and cash equivalents',
  ASSET_INTANGIBLE_ASSETS: 'Intangible assets, net',
  ASSET_INVENTORY: 'Inventory',
  ASSET_OPERATING_LEASE_RIGHT_OF_USE: 'Operating lease right-of-use assets',
  ASSET_OTHER: 'Other assets',
  ASSET_PREPAID_EXPENSES: 'Prepaid expenses',
  ASSET_PROPERTY_AND_EQUIPMENT: 'Property and equipment, net',

  LIABILITY_ACCOUNTS_PAYABLE: 'Accounts payable',
  LIABILITY_ACCRUED_INTEREST: 'Accrued interest',
  LIABILITY_ACCRUED_LIABILITIES: 'Accrued liabilities',
  LIABILITY_CONVERTIBLE_NOTES_PAYABLE: 'Convertible notes payable',
  LIABILITY_DEBT: 'Long-term debt',
  LIABILITY_DEFERRED_REVENUE: 'Deferred revenue',
  LIABILITY_OPERATING_LEASE_LIABILITIES_CURRENT:
    'Operating lease liabilities, current',
  LIABILITY_OPERATING_LEASE_LIABILITIES_NET_OF_CURRENT_PORTION:
    'Operating lease liabilities, net of current portion',
  LIABILITY_OTHER: 'Other current liabilities',

  EQUITY_ACCUMULATED_DEFICIT: 'Accumulated deficit',
  EQUITY_COMMON_STOCK: 'Common stock',
  EQUITY_PAID_IN_CAPITAL: 'Additional paid-in capital',
  EQUITY_PREFERRED_STOCK: 'Convertible preferred stock',
  EQUITY_RETAINED_EARNINGS: 'Retained earnings',

  INCOME_STATEMENT_COST_OF_REVENUE: 'Cost of revenue',
  INCOME_STATEMENT_G_AND_A: 'General and administrative',
  INCOME_STATEMENT_INTEREST_EXPENSE: 'Interest expense',
  INCOME_STATEMENT_INTEREST_INCOME: 'Interest income',
  INCOME_STATEMENT_OTHER_INCOME: 'Other income',
  INCOME_STATEMENT_RESEARCH_AND_DEVELOPMENT: 'Research and development',
  INCOME_STATEMENT_REVENUE: 'Revenue',
  INCOME_STATEMENT_SALES_AND_MARKETING: 'Sales and marketing',
  INCOME_TAXES: 'Income taxes',

  UNKNOWN: `You are unsure of the account type or it doesn't map to one of the other values`,
} as const;

export type AccountType = keyof typeof accountTypes;

export function createAccountMapping(
  accountMapping: NewAccountMapping,
): Promise<AccountMapping | undefined> {
  return db
    .insertInto('accountMapping')
    .values({ ...accountMapping })
    .onConflict((oc) =>
      oc.columns(['auditId', 'accountNumber', 'accountName']).doNothing(),
    )
    .returningAll()
    .executeTakeFirst();
}

export function getAccountMappingById(
  id: AccountMappingId,
): Promise<AccountMapping> {
  return db
    .selectFrom('accountMapping')
    .where('id', '=', id)
    .where('isDeleted', '=', false)
    .selectAll()
    .executeTakeFirstOrThrow();
}

export type AccountMappingAll = Pick<
  AccountMapping,
  'id' | 'accountNumber' | 'accountName' | 'accountType'
>;
export async function getAllAccountMappingsByAuditId(
  auditId: AuditId,
): Promise<AccountMappingAll[]> {
  return await db
    .selectFrom('accountMapping')
    .select(['id', 'accountNumber', 'accountName', 'accountType'])
    .where('auditId', '=', auditId)
    .where('isDeleted', '=', false)
    .orderBy(['accountNumber', 'accountName'])
    .execute();
}

export async function updateAccountMappingType(
  id: AccountMappingId,
  accountType: AccountType | null,
) {
  if (accountType !== null && !accountTypes[accountType]) {
    throw new Error(`Invalid account type: ${accountType}}`);
  }

  await db
    .updateTable('accountMapping')
    .set({ accountType })
    .where('id', '=', id)
    .execute();
}

// export type AccountBalanceAll = Pick<
//   AccountBalance,
//   'id' | 'accountNumber' | 'accountName' | 'accountType'
// >;
export async function getAllAccountBalancesByAuditId(
  auditId: AuditId,
  includeDeleted = false,
) {
  let query = db
    .selectFrom('accountBalance as ab')
    .leftJoin('accountMapping as am', 'ab.accountMappingId', 'am.id')
    .select([
      'ab.id',
      'ab.isDeleted',
      'ab.accountNumber',
      'ab.accountName',
      'ab.accountMappingId',
      'am.accountName as mappedToAccountName',
      'am.accountType',
      'credit',
      'debit',
      'currency',
      'ab.context',
    ])
    .where('ab.auditId', '=', auditId);
  if (!includeDeleted) {
    query = query.where('ab.isDeleted', '=', includeDeleted);
  }
  return await query.orderBy(['accountNumber', 'accountName']).execute();
}

export async function extractChartOfAccountsMapping(
  auditId: AuditId,
): Promise<boolean> {
  const documentIdRes = await getDataForRequestAttribute(
    auditId,
    'chart-of-accounts',
    'documentId',
  );
  if (
    !documentIdRes ||
    !documentIdRes.data ||
    'value' in documentIdRes.data ||
    !documentIdRes.data.isDocuments
  ) {
    return false;
  }
  const documentIds = documentIdRes.data.documentIds;
  if (documentIds.length !== 1) {
    return false;
  }
  const document = await getDocumentById(documentIds[0]);

  if (document.classifiedType !== 'CHART_OF_ACCOUNTS') {
    throw new Error('Invalid classified type');
  }

  const { rows, colIdxs, schema } = await getSheetData(document);
  if (
    colIdxs.accountIdColumnIdx === -1 &&
    colIdxs.accountNameColumnIdx === -1
  ) {
    console.log(
      'COA extraction, neither account id or account num columns present',
      colIdxs,
    );
    return false;
  }

  const existingRows = await getAllAccountMappingsByAuditId(auditId);
  const existingMap = new Map(
    existingRows.map((r) => [
      `${r.accountNumber || ''}${r.accountName || ''}`,
      r,
    ]),
  );

  const existingDeletedWithTypeRows = await db
    .selectFrom('accountMapping')
    .select(['id', 'accountNumber', 'accountName', 'accountType'])
    .where('auditId', '=', auditId)
    .where('isDeleted', '=', true)
    .where('accountType', 'is not', null)
    .execute();
  const existingTypeMap = new Map(
    existingDeletedWithTypeRows.map((r) => [
      `${r.accountNumber || ''}${r.accountName || ''}`,
      r.accountType,
    ]),
  );

  const newMap = new Map();
  const toAdd = [];
  for (const row of rows) {
    const accountNumber = row[colIdxs.accountIdColumnIdx] || '';
    const accountName = row[colIdxs.accountNameColumnIdx] || '';
    if (!accountNumber && !accountName) {
      continue;
    }
    newMap.set(`${accountNumber}${accountName}`, {
      accountNumber,
      accountName,
    });
    if (!existingMap.has(`${accountNumber}${accountName}`)) {
      // Try and provide the AI with any helpful non-balance data
      const context = schema.cols.reduce((obj, col, idx) => {
        if (!row[idx] || col.name.toLowerCase().includes('balance')) {
          return obj;
        }
        return { ...obj, [col.name]: row[idx] };
      }, {});

      toAdd.push({
        auditId: auditId,
        accountNumber,
        accountName,
        accountType: existingTypeMap.get(`${accountNumber}${accountName}`),
        context: JSON.stringify(context),
      });
    }
  }

  if (toAdd.length > 0) {
    await db.insertInto('accountMapping').values(toAdd).execute();
  }

  const idsToDelete = [];
  for (const row of existingRows) {
    if (!newMap.has(`${row.accountNumber || ''}${row.accountName || ''}`)) {
      idsToDelete.push(row.id);
    }
  }
  if (idsToDelete.length > 0) {
    await db
      .updateTable('accountMapping')
      .set({ isDeleted: true })
      .where('id', 'in', idsToDelete)
      .execute();
  }

  return true;
}

type AccountMappingToClassifyRow = {
  id: string;
  accountNumber: string;
  accountName: string;
  accountType: AccountType | null;
  context: string | null;
};

export async function classifyChartOfAccountsTypes(
  auditId: AuditId,
): Promise<void> {
  const rows = await db
    .selectFrom('accountMapping')
    .select(['id', 'accountNumber', 'accountName', 'accountType', 'context'])
    .where('auditId', '=', auditId)
    .where('isDeleted', '=', false)
    .where('accountType', 'is', null)
    .execute();

  const remainingRows = await autoClassifyCOARows(rows);
  const aiP: Promise<any>[] = [];
  const buckets = bucket(remainingRows, 20, 8);
  console.log(
    `Classifying CoA via AI, ${remainingRows.length} rows, ${buckets.length} buckets`,
  );
  buckets.forEach((bucketRows, idx, buckets) => {
    aiP.push(aiClassifyCOARows(auditId, bucketRows, idx + 1, buckets.length));
  });
  await Promise.allSettled(aiP);
  await Promise.all(aiP);
  console.log('Classifying CoA via AI, complete');
}

/**
 *
 * Classify any rows that we can before handing off to the AI
 */
async function autoClassifyCOARows(
  rows: AccountMappingToClassifyRow[],
): Promise<AccountMappingToClassifyRow[]> {
  const toUpdate = [];
  let accountType: AccountType;
  const remainingRows = [];
  for (const row of rows) {
    const key = String(row.accountName).toLowerCase();
    if (key.includes('accounts payable')) {
      accountType = 'LIABILITY_ACCOUNTS_PAYABLE';
    } else if (key.includes('common stock')) {
      accountType = 'EQUITY_COMMON_STOCK';
    } else {
      remainingRows.push(row);
      continue;
    }

    toUpdate.push(
      db
        .updateTable('accountMapping')
        .set({ accountType })
        .where('id', '=', row.id)
        .execute(),
    );
  }
  await Promise.allSettled(toUpdate);
  await Promise.all(toUpdate);

  return remainingRows;
}

export async function aiClassifyCOARows(
  auditId: AuditId,
  bucketRows: AccountMappingToClassifyRow[],
  bucketNum: number,
  numBuckets: number,
): Promise<void> {
  const rowMap = new Map(bucketRows.map((r, idx) => [idx, r.id]));
  const toAiRows = bucketRows.map((r, idx) => [idx, r.context]);

  const t0 = Date.now();
  const messages: OpenAIMessage[] = [
    {
      role: 'system',
      content: dedent`
      For each row in an export of a company chart of accounts report, classify each row to one of the following
      account types used for financial statements:

      ${Object.entries(accountTypes)
        .map(([aType, description]) => `- ${aType}: ${description}`)
        .join('\n')}

      If unable to classify the row, set accountType as 'UNKNOWN'

      Do not truncate for brevity. Return all rows in the CSV.

      Output in JSON using the following structure:

        {"data":[[accountId1, classifiedAs1],[accountId2, classifiedAs2],[accountId3, classifiedAs3],...]}
      `,
    },
    {
      role: 'user',
      content: JSON.stringify(toAiRows),
    },
  ];

  console.log(
    `Classifying CoA via AI, ${bucketNum}/${numBuckets}: ${toAiRows.length} rows`,
  );
  const resp = await call({
    requestedModel: 'gpt-4-1106-preview',
    messages,
    respondInJSON: true,
  });
  const schema = z.object({
    data: z.array(z.tuple([z.number(), z.string()])),
  });

  await createAiQuery({
    auditId,
    model: resp.model,
    query: { messages },
    identifier: 'accountMapping',
    usage: resp.usage,
    result: resp.message as string,
  });

  const parsed = schema.parse(resp.message);
  const t1 = Date.now();
  console.log(
    `Classifying CoA via AI, ${bucketNum}/${numBuckets}: ${
      toAiRows.length
    } rows in ${t1 - t0}ms`,
  );

  const toUpdate = [];
  for (const [idx, accountType] of parsed.data) {
    const id = rowMap.get(idx) as AccountMappingId;
    if (!id || accountType in accountTypes === false) {
      console.log('Invalid accountType', accountType);
      continue;
    }
    // TODO: consider removing this to avoid constantly using AI
    if (accountType === 'UNKNOWN') {
      continue;
    }
    toUpdate.push(
      db
        .updateTable('accountMapping')
        .set({ accountType: accountType as AccountType })
        .where('id', '=', id)
        .execute(),
    );
    await Promise.allSettled(toUpdate);
    await Promise.all(toUpdate);
  }
}

export async function extractTrialBalance(auditId: AuditId): Promise<boolean> {
  const tbDocRequest = await getDataForRequestAttribute(
    auditId,
    'trial-balance',
    'documentId',
  );
  if (
    !tbDocRequest ||
    !tbDocRequest.data ||
    'value' in tbDocRequest.data ||
    !tbDocRequest.data.isDocuments
  ) {
    return false;
  }
  if (tbDocRequest.data.documentIds.length !== 1) {
    return false;
  }
  const document = await getDocumentById(tbDocRequest.data.documentIds[0]);

  if (document.classifiedType !== 'TRIAL_BALANCE') {
    throw new Error('Invalid classified type');
  }

  const { rows, colIdxs } = await getSheetData(document);
  if (
    (colIdxs.accountIdColumnIdx === -1 &&
      colIdxs.accountNameColumnIdx === -1) ||
    colIdxs.debitColumnIdx === -1 ||
    colIdxs.creditColumnIdx === -1
  ) {
    console.log('Missing account colIdxs', colIdxs);
    return false;
  }

  const existingRows = await getAllAccountBalancesByAuditId(auditId, true);
  const existingMap = new Map(
    existingRows.map((r) => [
      `${r.accountNumber || ''}${r.accountName || ''}`,
      r,
    ]),
  );

  const accountMappingRows = await db
    .selectFrom('accountMapping')
    .select(['id', 'accountNumber', 'accountName'])
    .where('auditId', '=', auditId)
    .where('isDeleted', '=', false)
    // .where('accountType', 'is not', null)
    .execute();

  // Index for fuzzy search
  const tree = PassjoinIndex.from(
    accountMappingRows.map(
      (r) => `${r.accountNumber || ''}${r.accountName || ''}`,
    ),
    leven,
    7,
  );

  const accountMappingMap = new Map(
    accountMappingRows.map((r) => [
      `${r.accountNumber || ''}${r.accountName || ''}`,
      r.id,
    ]),
  );

  const toAdd = [];
  const toUpdate = [];
  const idsToRetain: string[] = [];
  for (const row of rows) {
    const accountNumber = row[colIdxs.accountIdColumnIdx] || '';
    const accountName = row[colIdxs.accountNameColumnIdx] || '';
    if (
      (!accountNumber && !accountName) ||
      (row[colIdxs.debitColumnIdx] === '' &&
        row[colIdxs.creditColumnIdx] === '') ||
      // Naive, but we want ultimately want to ignore any type of total
      String(accountName)?.toUpperCase() === 'TOTAL'
    ) {
      continue;
    }
    const searchKey = `${accountNumber}${accountName}`;
    const newDebit = parseFloat(row[colIdxs.debitColumnIdx]) || 0;
    const newCredit = parseFloat(row[colIdxs.creditColumnIdx]) || 0;
    const accountMappingId = getAccountMappingIdFromSearchIndex(
      searchKey,
      tree,
      accountMappingMap,
    );

    if (existingMap.has(searchKey)) {
      const existing = existingMap.get(searchKey) as (typeof existingRows)[0];

      if (
        existing.debit !== newDebit ||
        existing.credit !== newCredit ||
        (accountMappingId && existing.accountMappingId !== accountMappingId) ||
        existing.isDeleted
      ) {
        toUpdate.push(
          db
            .updateTable('accountBalance')
            .set({
              accountMappingId: existing.accountMappingId || accountMappingId,
              debit: newDebit,
              credit: newCredit,
              isDeleted: false,
            })
            .where('id', '=', existing.id)
            .execute(),
        );
        idsToRetain.push(existing.id);
      }
    } else {
      toAdd.push({
        auditId,
        accountMappingId,
        accountNumber,
        accountName,
        debit: newDebit,
        credit: newCredit,
        currency: 'USD',
      });
    }
  }

  if (toAdd.length > 0) {
    await db.insertInto('accountBalance').values(toAdd).execute();
  }
  const idsToDelete = existingRows
    .filter((r) => idsToRetain.includes(r.id) === false)
    .map((r) => r.id);

  if (idsToDelete.length > 0) {
    await db
      .updateTable('accountBalance')
      .set({ isDeleted: true })
      .where('id', 'in', idsToDelete)
      .execute();
  }

  return true;
}

/**
 * This is the "Deal with Quickbooks" logic. Quickbooks places account IDs within the account name,
 * but doesn't do so consistently e.g. "1000 - Cash" vs "1000 Cash". We use a passjoin index to
 * find the closest match.
 **/
function getAccountMappingIdFromSearchIndex(
  key: string,
  tree: PassjoinIndex<string>,
  accountMappingMap: Map<string, AccountMappingId>,
) {
  let accountMappingId;
  const suggestions = tree.search(key);
  if (suggestions.size === 1) {
    const first = Array.from(suggestions.entries())[0][0];
    accountMappingId = accountMappingMap.get(first);
  } else if (suggestions.size > 1) {
    const distances: [distance: number, key: string][] = Array.from(
      suggestions.entries(),
    ).map(([suggestion]) => {
      return [leven(key, suggestion), suggestion];
    });
    const bestMatch = distances.sort((a, b) => a[0] - b[0])[0];
    accountMappingId = accountMappingMap.get(bestMatch[1]);
  }
  return accountMappingId || null;
}

async function getSheetData(document: Document) {
  if (!document.extracted) {
    throw new Error('Document has no extracted content');
  }
  let sheets = document.extracted.split(PAGE_DELIMITER);
  let csvData;
  let meta;
  if (sheets.length === 1) {
    // This is a CSV
    csvData = sheets[0];
    meta = {};
  } else {
    sheets = sheets.slice(1);
    const lines = sheets[0].trim().split('\n');
    const metaLine = lines[0];
    if (metaLine.slice(0, 5) !== 'META:') {
      throw new Error('Line 1 must be meta data');
    }
    meta = JSON.parse(metaLine.slice(5));
    csvData = lines.slice(1).join('\n');
  }

  const schema = inferSchema(csvData);
  const colIdxs = await getColIdxs(schema, document);

  const parser = initParser(schema);
  const rows = parser.stringArrs(csvData);

  return { meta, schema, colIdxs, rows };
}

async function getColIdxs(
  schema: ReturnType<typeof inferSchema>,
  document: Document,
) {
  if ('cols' in schema === false) {
    throw new Error('Invalid schema');
  }
  const columnMappingsRes = await pollGetByDocumentIdAndIdentifier(
    document.id,
    'columnMappings',
  );
  if (!columnMappingsRes) {
    throw new Error('No columnMappings query found for document');
  }
  if (!columnMappingsRes.result || !columnMappingsRes.isValidated) {
    throw new Error('Invalid columnMappings for document');
  }

  const res = JSON.parse(columnMappingsRes.result);

  const classifiedType = document.classifiedType;

  if (classifiedType === 'CHART_OF_ACCOUNTS') {
    if (
      !documentAiQuestions.CHART_OF_ACCOUNTS ||
      !isAIQuestionJSON(documentAiQuestions.CHART_OF_ACCOUNTS.columnMappings)
    ) {
      throw new Error('Invalid question');
    }
    return {
      ...(res as z.infer<
        typeof documentAiQuestions.CHART_OF_ACCOUNTS.columnMappings.validate
      >),
      classifiedType,
    } as const;
  } else if (classifiedType === 'TRIAL_BALANCE') {
    if (
      !documentAiQuestions.TRIAL_BALANCE ||
      !isAIQuestionJSON(documentAiQuestions.TRIAL_BALANCE.columnMappings)
    ) {
      throw new Error('Invalid question');
    }
    return {
      ...(res as z.infer<
        typeof documentAiQuestions.TRIAL_BALANCE.columnMappings.validate
      >),
      classifiedType,
    } as const;
  } else {
    throw new Error('Invalid classified type');
  }
}
