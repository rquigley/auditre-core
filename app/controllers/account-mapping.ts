import * as Sentry from '@sentry/nextjs';
import dedent from 'dedent';
import { revalidatePath } from 'next/cache';
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
import { db, sql } from '@/lib/db';
import {
  documentAiQuestions,
  isAIQuestionJSON,
} from '@/lib/document-ai-questions';
import { AccountMap, accountTypes } from '@/lib/finance';
import { addFP, bucket } from '@/lib/util';
import { getByIdForClientCached } from './audit';
import { deleteKV, getKV, setKV, updateKV } from './kv';

import type { OpenAIMessage } from '@/lib/ai';
import type { AccountType } from '@/lib/finance';
import type {
  AccountBalance,
  AccountBalanceId,
  Audit,
  AuditId,
  Document,
  OpenAIModel,
  OrgId,
} from '@/types';

export type AccountMappingAll = Pick<
  AccountBalance,
  'id' | 'accountName' | 'accountType'
>;

export async function getAllAccountBalancesByAuditId(
  auditId: AuditId,
  includeDeleted = false,
) {
  let query = db
    .selectFrom('accountBalance')
    .select([
      'id',
      'isDeleted',
      'accountName',
      'accountType',
      'accountTypeOverride',
      'credit',
      'debit',
      'currency',
      'context',
      'classificationScore',
      'sortIdx',
    ])
    .where('auditId', '=', auditId)
    .orderBy(['sortIdx']);
  if (!includeDeleted) {
    query = query.where('isDeleted', '=', includeDeleted);
  }
  const rows = await query.execute();
  return rows.map((r) => ({
    ...r,
    accountTypeMerged: r.accountTypeOverride || r.accountType,
    accountType: r.accountType || '',
    balance: getBalanceUsingAccountType({
      accountType: r.accountType || 'UNKNOWN',
      credit: r.credit,
      debit: r.debit,
    }),
  }));
}

export async function getBalancesByAccountType(
  auditId: AuditId,
): Promise<AccountMap> {
  const originalRows = await db
    .selectFrom('accountBalance')
    .select((eb) => [
      eb.fn
        .coalesce('accountTypeOverride', 'accountType')
        .as('accountTypeMerged'),
      db.fn.sum<number>('credit').as('credit'),
      db.fn.sum<number>('debit').as('debit'),
    ])
    .where('isDeleted', '=', false)
    .where('auditId', '=', auditId)
    .groupBy('accountTypeMerged')
    .execute();
  const rows = originalRows.map((r) => ({
    accountType: r.accountTypeMerged || 'UNKNOWN',
    balance: getBalanceUsingAccountType({
      accountType: r.accountTypeMerged || 'UNKNOWN',
      credit: r.credit,
      debit: r.debit,
    }),
  }));
  return new AccountMap(Object.keys(accountTypes) as AccountType[], rows);
}

export async function getAccountByFuzzyMatch(
  auditId: AuditId,
  searchString: string,
) {
  const res = await db
    .selectFrom('accountBalance')
    .select((eb) => [
      eb.fn
        .coalesce('accountTypeOverride', 'accountType')
        .as('accountTypeMerged'),
      eb
        .fn<number>('similarity', ['accountName', eb.val(searchString)])
        .as('score'),
      'credit',
      'debit',
      // db.fn.sum<number>('credit').as('credit'),
      // db.fn.sum<number>('debit').as('debit'),
    ])
    .where('auditId', '=', auditId)
    .where('isDeleted', '=', false)
    // .groupBy('accountTypeMerged')

    .orderBy('score', 'desc')
    .limit(1)
    .execute();

  console.log(res);

  return res[0];
}

export function getBalanceUsingAccountType({
  accountType,
  credit,
  debit,
}: {
  accountType: AccountType;
  credit: number;
  debit: number;
}) {
  if (!accountType) {
    return 0;
  }
  if (accountType.startsWith('ASSET')) {
    return addFP(debit, -credit);
  } else if (accountType.startsWith('LIABILITY')) {
    return addFP(credit, -debit);
  } else if (accountType.startsWith('EQUITY')) {
    return addFP(credit, -debit);
  } else if (accountType.startsWith('INCOME')) {
    return addFP(credit, -debit);
  } else {
    return addFP(credit, -debit);
  }
}

export async function updateAccountMappingType(
  id: AccountBalanceId,
  accountType: AccountType | null,
) {
  if (accountType !== null && !accountTypes[accountType]) {
    throw new Error(`Invalid account type: ${accountType}}`);
  }

  await db
    .updateTable('accountBalance')
    .set({ accountTypeOverride: accountType })
    .where('id', '=', id)
    .execute();
}

type AccountMappingToClassifyRow = {
  id: string;
  accountName: string;
  accountType: AccountType | null;
  context: string | null;
};

export async function classifyTrialBalanceTypes(
  orgId: OrgId,
  auditId: AuditId,
): Promise<void> {
  try {
    const rows = await db
      .selectFrom('accountBalance')
      .select(['id', 'accountName', 'accountType', 'context'])
      .where('auditId', '=', auditId)
      .where('isDeleted', '=', false)
      .where('accountType', 'is', null)
      .execute();

    await setKV({
      orgId,
      auditId,
      key: 'tb-processed',
      value: 0,
    });
    await setKV({
      orgId,
      auditId,
      key: 'tb-to-process-total',
      value: rows.length,
    });

    if (!rows.length) {
      console.log('Classifying TB, no rows to classify');
      return;
    }

    const { numClassified, remainingRows } =
      await autoClassifyTrialBalanceRows(rows);

    await setKV({
      orgId,
      auditId,
      key: 'tb-processed',
      value: numClassified,
    });
    revalidatePath(`/audit/${auditId}/request/trial-balance`);
    const aiP: Promise<any>[] = [];

    let buckets = bucket(remainingRows, 10, 20);
    const t0 = Date.now();
    console.log(
      `Classifying TB via AI, ${remainingRows.length} rows, ${buckets.length} buckets`,
    );

    buckets.forEach((bucketRows, idx, buckets) => {
      const bucketNum = idx + 1;
      console.log(
        `Classifying TB via AI, ${idx + 1}/${buckets.length}: ${
          bucketRows.length
        } rows`,
      );
      aiP.push(
        aiClassifyTrialBalanceRows({
          auditId,
          rows: bucketRows,
          quickPass: false,
          includeReasoning: false,
        }).then(async ({ numClassified, timeMs }) => {
          console.log(
            `Classified TB via AI, ${bucketNum}/${buckets.length}: ${numClassified} rows in ${timeMs}ms`,
          );
          await updateKV({
            orgId,
            auditId,
            key: 'tb-processed',
            updater: (prev) => {
              return Math.max(Number(prev ?? 0) + numClassified, 0);
            },
          });
          revalidatePath(`/audit/${auditId}/request/trial-balance`);

          return { numClassified };
        }),
      );
    });
    const res = await Promise.allSettled(aiP);
    await Promise.all(aiP);
    const numClassifiedViaAi = res.reduce(
      (sum, r) => sum + (r.status === 'fulfilled' ? r.value.numClassified : 0),
      0,
    );

    // Retry any rows not classified by the first pass
    const retryRows = await db
      .selectFrom('accountBalance')
      .select(['id', 'accountName', 'accountType', 'context'])
      .where('auditId', '=', auditId)
      .where('isDeleted', '=', false)
      .where('accountType', 'is', null)
      .execute();
    const { numClassified: numClassifiedOnRetry } =
      await aiClassifyTrialBalanceRows({
        auditId,
        rows: retryRows,
        quickPass: false,
        includeReasoning: false,
      });
    await updateKV({
      orgId,
      auditId,
      key: 'tb-processed',
      updater: (prev) => {
        return Math.max(Number(prev ?? 0) + numClassifiedOnRetry, 0);
      },
    });

    console.log(
      `COMPLETED - Classifying TB, ${
        numClassified + numClassifiedViaAi + numClassifiedOnRetry
      }/${rows.length} in ${Date.now() - t0}ms`,
    );
  } catch (err) {
    Sentry.captureException(err);
  } finally {
    await deleteKV({
      orgId,
      auditId,
      key: 'tb-processed',
    });
    await deleteKV({
      orgId,
      auditId,
      key: 'tb-to-process-total',
    });
    revalidatePath(`/audit/${auditId}/request/trial-balance`);
  }
}

export async function getStatus(auditId: AuditId) {
  const audit = await getByIdForClientCached(auditId);
  if (!audit) {
    throw new Error('Invalid audit');
  }

  const numProcessedP = getKV({
    orgId: audit.orgId,
    auditId: audit.id,
    key: 'tb-processed',
    sinceMs: 1000 * 60,
  });
  const numToProcessTotalP = getKV({
    orgId: audit.orgId,
    auditId: audit.id,
    key: 'tb-to-process-total',
    sinceMs: 1000 * 60,
  });

  const [numProcessedRaw, numToProcessTotalRaw] = await Promise.all([
    numProcessedP,
    numToProcessTotalP,
  ]);

  const numProcessed = Number(numProcessedRaw ?? 0);
  const numToProcessTotal = Number(numToProcessTotalRaw ?? 0);

  return {
    isProcessing: numProcessed !== numToProcessTotal,
    numProcessed,
    numToProcessTotal,
  };
}

async function autoClassifyTrialBalanceRows(
  rows: AccountMappingToClassifyRow[],
): Promise<{
  numClassified: number;
  remainingRows: AccountMappingToClassifyRow[];
}> {
  const toUpdate = [];
  let accountType: AccountType;
  const remainingRows = [];
  for (const row of rows) {
    const key = String(row.accountName).toLowerCase();

    // Asset
    if (key.includes('depreciation')) {
      if (key.includes('accumulated depreciation')) {
        accountType = 'ASSET_PROPERTY_AND_EQUIPMENT';
      } else {
        accountType = 'INCOME_STATEMENT_G_AND_A';
      }
    } else if (key.includes('fixed asset')) {
      accountType = 'ASSET_PROPERTY_AND_EQUIPMENT';
    } else if (key.includes('security deposit')) {
      accountType = 'ASSET_OTHER';

      // Liability
    } else if (key.includes('accounts payable')) {
      accountType = 'LIABILITY_ACCOUNTS_PAYABLE';
    } else if (key.match(/cash[\-\s]+rewards/)) {
      accountType = 'LIABILITY_OTHER';

      // Equity
    } else if (key.includes('common stock')) {
      accountType = 'EQUITY_COMMON_STOCK';

      // Income statement
    } else if (key.includes('business expense')) {
      accountType = 'INCOME_STATEMENT_G_AND_A';
    } else if (key.includes('office expense')) {
      accountType = 'INCOME_STATEMENT_G_AND_A';
    } else if (key.includes('insurance')) {
      accountType = 'INCOME_STATEMENT_G_AND_A';
    } else if (key.includes('compensation')) {
      accountType = 'INCOME_STATEMENT_G_AND_A';

      // Other
    } else if (key.match(/inter\-?company/i)) {
      accountType = 'OTHER_INTERCOMPANY';
    } else {
      remainingRows.push(row);
      continue;
    }

    toUpdate.push(
      db
        .updateTable('accountBalance')
        .set({ accountType })
        .where('id', '=', row.id)
        .execute(),
    );
  }
  await Promise.allSettled(toUpdate);
  await Promise.all(toUpdate);

  return {
    numClassified: toUpdate.length,
    remainingRows,
  };
}

function cleanRowForAI({
  accountName,
  context,
}: {
  accountName: string;
  context: string | null;
}) {
  return accountName
    .toLowerCase()
    .replace(/^\d+\s/, '')
    .replaceAll('(deleted)', '')
    .replaceAll(' & ', ' and ')
    .trim();
}

export async function aiClassifyTrialBalanceRows({
  auditId,
  rows,
  quickPass,
  includeReasoning,
}: {
  auditId: AuditId;
  rows: AccountMappingToClassifyRow[];
  quickPass: boolean;
  includeReasoning: boolean;
}): Promise<{ numClassified: number; timeMs: number }> {
  const rowMap = new Map(rows.map((r, idx) => [idx, r.id]));
  const toAiRows = rows.map((r, idx) => {
    let name = cleanRowForAI(r);

    return [idx, name];
  });

  const t0 = Date.now();

  let unknownStr: string;
  let outputStr: string;
  if (includeReasoning) {
    // unknownStr =
    //   '- If you are classifying as UNKNOWN, provide your reasoning. Otherwise, you can leave reasoning as empty string.';
    // outputStr =
    //   '{"data":[[accountId1, classifiedType1, reasoning1],[accountId2, classifiedType2, reasoning2],...]}';
    unknownStr =
      '- Provide the confidence in your classification between 0.0 and 1.0. If your confidence is less than 0.9, also provide your reasoning.';
    outputStr =
      '{"data":[[accountId1, classifiedType1, confidenceScore1, reasoning1],[accountId2, classifiedType2, confidenceScore2, reasoning2],...]}';
  } else {
    unknownStr = '';
    outputStr =
      '{"data":[[accountId1, classifiedType1],[accountId2, classifiedType2],...]}';
  }

  let organizationTypeStr = '';
  // if (1 === 2) {
  //   organizationTypeStr = 'The organization type is a  "manufacturing". ';
  // }
  const messages: OpenAIMessage[] = [
    {
      role: 'system',
      content: dedent`
      You will be provided an aray in JSON of account ids and account names from an organization's Trial Balance. ${organizationTypeStr}For each account, classify the account name into an account type. The account types you can use are:

      ${Object.entries(accountTypes)
        .filter(([aType]) => aType.startsWith('OTHER_'))
        // .map(([aType, description]) => `- ${aType}: ${description}`)
        .map(([aType, description]) => aType)
        .join('\n')}

      It is important to only use account types listed above! Do not make one up.

      Examples:
      [1, "mastercard cash rewards"] => LIABILITY_OTHER
      [1, "amex"] => LIABILITY_OTHER
      [1, "amazon credit"] => ASSET_OTHER
      [1, "ops software"] => INCOME_STATEMENT_G_AND_A
      [1, "technical software"] => INCOME_STATEMENT_G_AND_A
      [1, "technical papers"] => INCOME_STATEMENT_G_AND_A
      [1, "charges and fees"] => INCOME_STATEMENT_G_AND_A
      [1, "office supplies and equipment"] => INCOME_STATEMENT_G_AND_A
      [1, "protective and safety equipment"] => INCOME_STATEMENT_G_AND_A
      [1, "tools and equip"] => INCOME_STATEMENT_G_AND_A
      [1, "per diem"] => INCOME_STATEMENT_G_AND_A
      [1, "paper and supplies"] => INCOME_STATEMENT_G_AND_A

      Other notes:
      - Any account that is named for a bank that primarily holds cash should be classified as ASSET_CASH_AND_CASH_EQUIVALENTS unless it mentions a credit or debit card.

      - In the case of generic account names, e.g. "other", look at the previous and/or next accounts' classifications. If one or both are classified as INCOME_STATEMENT_* types, use INCOME_STATEMENT_G_AND_A. If one or both are ASSET_* types, use ASSET_OTHER. If one or both are LIABILITY_* types, use LIABILITY_OTHER. Otherwise, use UNKNOWN.

      ${unknownStr}

      - Do not truncate for brevity. Return all rows.

      - Output in JSON using the following structure:

        ${outputStr}
      `,
    },
    {
      role: 'user',
      content: JSON.stringify(toAiRows),
    },
  ];

  let requestedModel: OpenAIModel;
  if (quickPass) {
    requestedModel = 'gpt-3.5-turbo-1106';
  } else {
    requestedModel = 'gpt-4-1106-preview';
  }
  const resp = await call({
    requestedModel,
    messages,
    respondInJSON: true,
  });

  // 2-pass schema. The LLM can hallucinate values, sometimes only returning a single value,
  // sometimes returning a single value instead of an array.
  const firstPassSchema = z.object({
    data: z.array(z.any()),
  });

  let rowSchema;
  if (includeReasoning) {
    rowSchema = z.tuple([
      z.number(),
      z.string(),
      z.number().nullable().optional(),
      z.string().nullable().optional(),
    ]);
  } else {
    rowSchema = z.tuple([z.number(), z.string()]);
  }

  await createAiQuery({
    auditId,
    model: resp.model,
    query: { messages },
    identifier: 'accountMapping',
    status: 'COMPLETE',
    usage: resp.usage,
    result: resp.message as string,
  });

  const parsed = firstPassSchema.parse(resp.message);

  const toUpdate = [];

  for (const row of parsed.data) {
    const result = rowSchema.safeParse(row);
    if (!result.success) {
      console.log('Invalid row, skipping', row);
      continue;
    }
    const [idx, accountType, ...other] = result.data;
    const id = rowMap.get(idx) as AccountBalanceId;
    if (!id || accountType in accountTypes === false) {
      console.log('Invalid accountType', accountType);
      continue;
    }

    if (accountType === 'UNKNOWN' && quickPass) {
      continue;
    }

    toUpdate.push(
      db
        .updateTable('accountBalance')
        .set({
          accountType: accountType as AccountType,
          classificationScore: other[0] || undefined,
          reasoning: other[1] || undefined,
        })
        .where('id', '=', id)
        .execute(),
    );
  }

  await Promise.allSettled(toUpdate);
  await Promise.all(toUpdate);

  return { numClassified: toUpdate.length, timeMs: Date.now() - t0 };
}

export function parseNumber(num: string) {
  return parseFloat(String(num).replace('=', '')) || 0;
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

  const existingRows = await getAllAccountBalancesByAuditId(auditId, true);
  const existingMap = new Map(existingRows.map((r) => [r.accountName, r]));

  const accountNameSchema = z.string().min(1).max(72);

  const toAdd = [];
  const toUpdate = [];
  const idsToRetain: string[] = [];
  let sortIdx = 0;
  for (const row of rows) {
    sortIdx++;

    let numberRaw = row[colIdxs.accountIdColumnIdx] || '';
    let nameRaw = row[colIdxs.accountNameColumnIdx] || '';
    let accountNameRaw = `${numberRaw}${
      numberRaw && nameRaw ? ' - ' : ''
    }${nameRaw}`.trim();

    const accountNameParsed = accountNameSchema.safeParse(accountNameRaw);

    if (
      !accountNameParsed.success ||
      (row[colIdxs.debitColumnIdx] === '' &&
        row[colIdxs.creditColumnIdx] === '') ||
      // Naive, but we want ultimately want to ignore any type of total
      String(accountNameParsed.data)?.toUpperCase() === 'TOTAL'
    ) {
      continue;
    }
    const accountName = accountNameParsed.data;

    const newDebit = parseNumber(row[colIdxs.debitColumnIdx]);
    const newCredit = parseNumber(row[colIdxs.creditColumnIdx]);

    if (existingMap.has(accountName)) {
      const existing = existingMap.get(accountName) as (typeof existingRows)[0];

      if (
        existing.debit !== newDebit ||
        existing.credit !== newCredit ||
        existing.isDeleted
      ) {
        toUpdate.push(
          db
            .updateTable('accountBalance')
            .set({
              debit: newDebit,
              credit: newCredit,
              isDeleted: false,
              sortIdx,
            })
            .where('id', '=', existing.id)
            .execute(),
        );
        idsToRetain.push(existing.id);
      }
    } else {
      toAdd.push({
        auditId,
        accountName,
        debit: newDebit,
        credit: newCredit,
        currency: 'USD',
        sortIdx,
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

  const toClassifyRowCount = await db
    .selectFrom('accountBalance')
    .select([db.fn.countAll().as('count')])
    .where('auditId', '=', auditId)
    .where('isDeleted', '=', false)
    .where('accountType', 'is', null)
    .executeTakeFirstOrThrow();

  const audit = await getByIdForClientCached(auditId);
  if (audit) {
    await setKV({
      orgId: audit.orgId,
      auditId,
      key: 'tb-to-process-total',
      value: toClassifyRowCount.count,
    });
  }
  return true;
}

export async function getAccountsForCategory(
  auditId: AuditId,
  accountType: AccountType,
) {
  const rows = await db
    .selectFrom('accountBalance')
    .select(['accountName', sql<number>`debit - credit`.as('balance')])
    .where('isDeleted', '=', false)
    .where('auditId', '=', auditId)
    .where('accountType', '=', accountType)
    .execute();
  return rows;
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
  if (
    !documentAiQuestions.TRIAL_BALANCE ||
    !isAIQuestionJSON(documentAiQuestions.TRIAL_BALANCE.columnMappings)
  ) {
    throw new Error('Invalid question');
  }
  const res = JSON.parse(columnMappingsRes.result) as z.infer<
    typeof documentAiQuestions.TRIAL_BALANCE.columnMappings.validate
  >;

  if (
    (res.accountIdColumnIdx === -1 && res.accountNameColumnIdx === -1) ||
    res.debitColumnIdx === -1 ||
    res.creditColumnIdx === -1
  ) {
    throw new Error('Missing required columnMappings');
  }
  return res;
}
