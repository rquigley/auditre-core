import dedent from 'dedent';
import leven from 'leven';
import { PassjoinIndex } from 'mnemonist';
import { inferSchema, initParser } from 'udsv';
import * as z from 'zod';

import {
  getById as getDocumentById,
  PAGE_DELIMITER,
} from '@/controllers/document';
import {
  create,
  pollGetByDocumentIdAndIdentifier,
} from '@/controllers/document-query';
import { getDataForRequestAttribute } from '@/controllers/request-data';
import { call } from '@/lib/ai';
import { db } from '@/lib/db';
import { documentAiQuestions } from '@/lib/document-ai-questions';
import { AccountType } from '@/types';

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

export const accountTypes: Record<AccountType, string> = {
  ASSET_CASH: 'Cash',
  ASSET_PREPAID_EXPENSES: 'Prepaid expenses and other current assets',
  ASSET_PROPERTY_AND_EQUIPMENT: 'Property and equipment, net',
  ASSET_INTANGIBLE_ASSETS: 'Intangible assets, net',
  ASSET_OPERATING_LEASE_RIGHT_OF_USE: 'Operating lease right-of-use assets',
  ASSET_OTHER: 'Other assets',

  LIABILITY_ACCOUNTS_PAYABLE: 'Accounts payable',
  LIABILITY_ACCRUED_EXPENSES: 'Accrued expenses',
  LIABILITY_OPERATING_LEASE_LIABILITIES_CURRENT:
    'Operating lease liabilities, current',
  LIABILITY_ACCRUED_INTEREST: 'Accrued interest',
  LIABILITY_CONVERTIBLE_NOTES_PAYABLE: 'Convertible notes payable',
  LIABILITY_OPERATING_LEASE_LIABILITIES_NET_OF_CURRENT_PORTION:
    'Operating lease liabilities, net of current portion',

  EQUITY_PREFERRED_STOCK: 'Convertible preferred stock',
  EQUITY_COMMON_STOCK: 'Common stock',
  EQUITY_PAID_IN_CAPITAL: 'Additional paid-in capital',
  EQUITY_ACCUMULATED_DEFICIT: 'Accumulated deficit',
} as const;

export function createAccountMapping(
  accountMapping: NewAccountMapping,
): Promise<AccountMapping | undefined> {
  return db
    .insertInto('accountMapping')
    .values({ ...accountMapping })
    .onConflict((oc) =>
      oc
        .columns(['auditId', 'accountNumber', 'accountName', 'documentId'])
        .doNothing(),
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
export async function getAllAccountBalancesByAuditId(auditId: AuditId) {
  return await db
    .selectFrom('accountBalance as ab')
    .leftJoin('accountMapping as am', 'ab.accountMappingId', 'am.id')
    .select([
      'ab.id',
      'ab.accountNumber',
      'ab.accountName',
      'am.accountName as mappedToAccountName',
      'am.accountType',
      'credit',
      'debit',
      'currency',
      'ab.context',
    ])
    .where('ab.auditId', '=', auditId)
    .where('ab.isDeleted', '=', false)
    //.orderBy(['accountNumber', 'accountName'])
    .execute();
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

  const { rows, colIdxs } = await getSheetData(document);
  if (
    colIdxs.classifiedType !== document.classifiedType ||
    (colIdxs.accountIdColumnIdx === -1 && colIdxs.accountNameColumnIdx === -1)
  ) {
    console.log('Invalid colIdxs', colIdxs);
    return false;
  }

  const existingRows = await getAllAccountMappingsByAuditId(auditId);
  const existingMap = new Map(
    existingRows.map((r) => [`${r.accountNumber}-${r.accountName}`, r]),
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
      `${r.accountNumber}-${r.accountName}`,
      r.accountType,
    ]),
  );

  const newMap = new Map();
  const toAdd = [];
  for (const row of rows) {
    const accountNumber = row[colIdxs.accountIdColumnIdx];
    const accountName = row[colIdxs.accountNameColumnIdx];
    if (!accountNumber && !accountName) {
      continue;
    }
    newMap.set(`${accountNumber}-${accountName}`, {
      accountNumber,
      accountName,
    });
    if (!existingMap.has(`${accountNumber}-${accountName}`)) {
      toAdd.push({
        auditId: auditId,
        accountNumber,
        accountName,
        accountType: existingTypeMap.get(`${accountNumber}-${accountName}`),
      });
    }
  }

  if (toAdd.length > 0) {
    await db.insertInto('accountMapping').values(toAdd).execute();
  }

  const idsToDelete = [];
  for (const row of existingRows) {
    if (!newMap.has(`${row.accountNumber}-${row.accountName}`)) {
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

export async function extractTrialBalance(auditId: AuditId): Promise<boolean> {
  const documentIdRes = await getDataForRequestAttribute(
    auditId,
    'trial-balance',
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

  if (document.classifiedType !== 'TRIAL_BALANCE') {
    throw new Error('Invalid classified type');
  }

  const { rows, colIdxs } = await getSheetData(document);
  if (
    colIdxs.classifiedType !== document.classifiedType ||
    (colIdxs.accountIdColumnIdx === -1 &&
      colIdxs.accountNameColumnIdx === -1) ||
    colIdxs.debitColumnIdx === -1 ||
    colIdxs.creditColumnIdx === -1
  ) {
    console.log('Missing account colIdxs', colIdxs);
    return false;
  }

  await db.updateTable('accountBalance').set({ isDeleted: true }).execute();

  const accountMappingRows = await db
    .selectFrom('accountMapping')
    .select(['id', 'accountNumber', 'accountName'])
    .where('auditId', '=', auditId)
    .where('isDeleted', '=', false)
    // .where('accountType', 'is not', null)
    .execute();

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
  for (const row of rows) {
    if (
      (!row[colIdxs.accountIdColumnIdx] &&
        !row[colIdxs.accountNameColumnIdx]) ||
      (row[colIdxs.debitColumnIdx] === '' &&
        row[colIdxs.creditColumnIdx] === '') ||
      // Naive, but we want ultimately want to ignore any type of total
      String(row[colIdxs.accountNameColumnIdx])?.toUpperCase() === 'TOTAL'
    ) {
      continue;
    }
    const searchKey = `${row[colIdxs.accountIdColumnIdx] || ''}${
      row[colIdxs.accountNameColumnIdx] || ''
    }`;

    let accountMappingId;

    // This is the "Deal with Quickbooks" logic. Quickbooks places account IDs within the account name,
    // but doesn't do so consistently e.g. "1000 - Cash" vs "1000 Cash". We use a passjoin index to
    // find the closest match.
    const suggestions = tree.search(searchKey);
    if (suggestions.size === 1) {
      const first = Array.from(suggestions.entries())[0][0];
      accountMappingId = accountMappingMap.get(first);
    } else if (suggestions.size > 1) {
      const distances: [distance: number, key: string][] = Array.from(
        suggestions.entries(),
      ).map(([suggestion]) => {
        return [leven(searchKey, suggestion), suggestion];
      });
      const bestMatch = distances.sort((a, b) => a[0] - b[0])[0];
      accountMappingId = accountMappingMap.get(bestMatch[1]);
    }

    const debit = parseFloat(row[colIdxs.debitColumnIdx]) || 0;
    const credit = parseFloat(row[colIdxs.creditColumnIdx]) || 0;
    toAdd.push({
      auditId,
      accountMappingId,
      accountNumber: row[colIdxs.accountIdColumnIdx],
      accountName: row[colIdxs.accountNameColumnIdx],
      debit,
      credit,
      currency: 'USD',
    });
  }

  if (toAdd.length > 0) {
    await db.insertInto('accountBalance').values(toAdd).execute();
  }

  return true;
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

  return { meta, colIdxs, rows };
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

  if (document.classifiedType === 'CHART_OF_ACCOUNTS') {
    return {
      ...(res as z.infer<
        typeof documentAiQuestions.CHART_OF_ACCOUNTS.columnMappings.validate
      >),
      classifiedType: document.classifiedType,
    } as const;
  } else if (document.classifiedType === 'TRIAL_BALANCE') {
    return {
      ...(res as z.infer<
        typeof documentAiQuestions.TRIAL_BALANCE.columnMappings.validate
      >),
      classifiedType: document.classifiedType,
    } as const;
  } else {
    throw new Error('Invalid classified type');
  }
}

// export async function extractChartOfAccountsMappingOpenAi(document: Document) {
//   if (!document.extracted) {
//     throw new Error('Document has no extracted content');
//   }

//   const messages: OpenAIMessage[] = [
//     {
//       role: 'system',
//       content: dedent`
//         Your response should be in json format. For each row in the Chart of Accounts CSV, extract and classify the following information:

//         1. accountId
//         Find the account ID in columns typically labeled 'ID', 'Account No.', 'Code'. It is usually the first or second column and will likely contain numbers.
//         If you can't find an account ID, leave accountId as blank

//         2. accountName
//         Find the account name in columns typically labeled 'Account', 'Account Name', 'Name'. It is usually the first or second column and will mostly contain letters.
//         If you can't find an account name, leave accountId as blank

//         2. accountType
//         Based off all of the information in the row (including account name) map the account to one of the following account types used for financial statements:
//         ${Object.keys(accountTypes)
//           // @ts-expect-error
//           .map((t) => `- ${t}: ${accountTypes[t]}`)
//           .join('\n')}

//         If unable to classify to one of these types, leave accountType as 'UNKNOWN'

//         Do not truncate for brevity. Return all rows in the CSV.

//         Output Format:

//         Use the following structure:

//           [{ "accountId": "[ACCOUNT_ID]", "accountName": "[ACCOUNT_NAME]", "accountType": "[ACCOUNT_TYPE]"}, ...]
//         `,
//     },
//     {
//       role: 'user',
//       content: document.extracted,
//     },
//     // {
//     //   role: 'system',
//     //   content:
//     //     "Does your response only include the document's type and the reasoning in parenthesis? If there is any extraneous text, remove it",
//     // },
//   ];

//   // let requestedModel: OpenAIModel = 'gpt-3.5-turbo-1106';
//   let requestedModel: OpenAIModel = 'gpt-4-1106-preview';

//   const resp = await call({
//     requestedModel,
//     messages,
//     respondInJSON: true,
//     // https://twitter.com/mattshumer_/status/1720108414049636404
//   });

//   await create({
//     documentId: document.id,
//     model: resp.model,
//     query: { messages },
//     identifier: 'accountMapping',
//     usage: resp.usage,
//     result: resp.message as string,
//   });
// }
