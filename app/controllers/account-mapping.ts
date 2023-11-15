import dedent from 'dedent';
import { inferSchema, initParser } from 'udsv';

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
  'id' | 'documentId' | 'accountNumber' | 'accountName' | 'accountType'
>;
export async function getAllAccountMappingsByAuditId(
  auditId: AuditId,
): Promise<AccountMappingAll[]> {
  const res = await db
    .selectFrom('accountMapping')
    .select(['id', 'documentId', 'accountNumber', 'accountName', 'accountType'])
    .where('auditId', '=', auditId)
    .where('isDeleted', '=', false)
    .execute();

  const overrides = res.filter((r) => r.documentId === null);
  const overridesMap = new Map(
    overrides.map((r) => [`${r.accountNumber}-${r.accountName}`, r]),
  );
  const base = res.filter((r) => r.documentId !== null);

  const baseWithOverrides = base.map((r) => {
    const override = overridesMap.get(`${r.accountNumber}-${r.accountName}`);
    if (!override) {
      return r;
    }

    return {
      ...r,
      accountType: override.accountType,
    };
  });

  return baseWithOverrides;
}

export async function setAccountMappingType(
  auditId: AuditId,
  accountMappingId: AccountMappingId,
  accountType: AccountType,
) {
  const existing = await getAccountMappingById(accountMappingId);

  // delete any existing override
  await db
    .updateTable('accountMapping')
    .set({ isDeleted: true })
    .where('auditId', '=', auditId)
    .where('accountNumber', '=', existing.accountNumber)
    .where('accountName', '=', existing.accountName)
    .where('documentId', 'is', null)
    .execute();

  await createAccountMapping({
    auditId,
    accountNumber: existing.accountNumber,
    accountName: existing.accountName,
    accountType,
  });
}

export function deleteAccountMappingsFromDocument(auditId: AuditId) {
  return db
    .updateTable('accountMapping')
    .set({ isDeleted: true })
    .where('auditId', '=', auditId)
    .where('documentId', 'is not', null)
    .execute();
}

export function updateAccountMapping(
  id: AccountMappingId,
  updateWith: AccountMappingUpdate,
) {
  return db
    .updateTable('accountMapping')
    .set(updateWith)
    .where('id', '=', id)
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

  await deleteAccountMappingsFromDocument(auditId);

  let insertP = [];
  console.log(colIdxs);
  for (const row of rows) {
    const accountNumber = row[colIdxs.accountNumber];
    const accountName = row[colIdxs.accountName];
    if (!accountNumber && !accountName) {
      continue;
    }
    insertP.push(
      createAccountMapping({
        auditId: auditId,
        accountNumber,
        accountName,
        documentId: document.id,
      }),
    );
  }
  await Promise.allSettled(insertP);
  await Promise.all(insertP);

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
  const colIdxs = await getColIdxs(schema, document.id);

  const parser = initParser(schema);
  const rows = parser.stringArrs(csvData);

  return { meta, colIdxs, rows };
}

async function getColIdxs(
  schema: ReturnType<typeof inferSchema>,
  documentId: DocumentId,
) {
  if ('cols' in schema === false) {
    throw new Error('Invalid schema');
  }
  const columnMappingsRes = await pollGetByDocumentIdAndIdentifier(
    documentId,
    'columnMappings',
  );
  if (!columnMappingsRes) {
    throw new Error('No columnMappings query found for document');
  }
  console.log('FUCK', columnMappingsRes.result);
  const columnMappings = JSON.parse(columnMappingsRes.result) as {
    accountIdColumnIdx: number;
    accountNameColumnIdx: number;
  };
  return {
    accountNumber: columnMappings.accountIdColumnIdx,
    accountName: columnMappings.accountNameColumnIdx,
  };
}

export async function extractChartOfAccountsMappingOpenAi(document: Document) {
  if (!document.extracted) {
    throw new Error('Document has no extracted content');
  }

  const messages: OpenAIMessage[] = [
    {
      role: 'system',
      content: dedent`
        Your response should be in json format. For each row in the Chart of Accounts CSV, extract and classify the following information:

        1. accountId
        Find the account ID in columns typically labeled 'ID', 'Account No.', 'Code'. It is usually the first or second column and will likely contain numbers.
        If you can't find an account ID, leave accountId as blank

        2. accountName
        Find the account name in columns typically labeled 'Account', 'Account Name', 'Name'. It is usually the first or second column and will mostly contain letters.
        If you can't find an account name, leave accountId as blank

        2. accountType
        Based off all of the information in the row (including account name) map the account to one of the following account types used for financial statements:
        ${Object.keys(accountTypes)
          // @ts-expect-error
          .map((t) => `- ${t}: ${accountTypes[t]}`)
          .join('\n')}

        If unable to classify to one of these types, leave accountType as 'UNKNOWN'

        Do not truncate for brevity. Return all rows in the CSV.

        Output Format:

        Use the following structure:

          [{ "accountId": "[ACCOUNT_ID]", "accountName": "[ACCOUNT_NAME]", "accountType": "[ACCOUNT_TYPE]"}, ...]
        `,
    },
    {
      role: 'user',
      content: document.extracted,
    },
    // {
    //   role: 'system',
    //   content:
    //     "Does your response only include the document's type and the reasoning in parenthesis? If there is any extraneous text, remove it",
    // },
  ];

  // let requestedModel: OpenAIModel = 'gpt-3.5-turbo-1106';
  let requestedModel: OpenAIModel = 'gpt-4-1106-preview';

  const resp = await call({
    requestedModel,
    messages,
    respondInJSON: true,
    // https://twitter.com/mattshumer_/status/1720108414049636404
  });

  await create({
    documentId: document.id,
    model: resp.model,
    query: { messages },
    identifier: 'accountMapping',
    usage: resp.usage,
    result: resp.message as string,
  });
}
