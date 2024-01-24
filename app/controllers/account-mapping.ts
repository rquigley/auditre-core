import * as Sentry from '@sentry/nextjs';
import dedent from 'dedent';
import { revalidatePath } from 'next/cache';
import { uuidv7 } from 'uuidv7';
import * as z from 'zod';

import {
  createAiQuery,
  pollGetByDocumentIdAndIdentifier,
} from '@/controllers/ai-query';
import {
  getById as getDocumentById,
  getSheetData,
} from '@/controllers/document';
import { getDataForRequestAttribute2 } from '@/controllers/request-data';
import { call } from '@/lib/ai';
import { businessModelTypes } from '@/lib/business-models';
import { db, sql } from '@/lib/db';
import {
  documentAiQuestions,
  isAIQuestionJSON,
} from '@/lib/document-ai-questions';
import { AccountMap, accountTypes, getBalance } from '@/lib/finance';
import { bucket, dateLiketoYear } from '@/lib/util';
import { getByIdForClientCached } from './audit';
import { deleteKV, getKV, setKV, updateKV } from './kv';

import type { OpenAIMessage } from '@/lib/ai';
import type { AccountType, AccountTypeGroup } from '@/lib/finance';
import type {
  AccountMappingId,
  AuditId,
  Document,
  OpenAIModel,
  OrgId,
} from '@/types';

export async function getAllAccountMappingsByAuditId(auditId: AuditId) {
  return await db
    .selectFrom('accountMapping')
    .select(['id', 'accountName', 'isDeleted'])
    .where('auditId', '=', auditId)
    .orderBy(['sortIdx'])
    .execute();
}

export async function getAllAccountBalancesByAuditId(auditId: AuditId) {
  const data = await db
    .selectFrom('accountMapping as am')
    .leftJoin(
      (eb) =>
        eb
          .selectFrom('accountBalance')
          .select([
            'accountMappingId',
            'year',
            'debit',
            'credit',
            // account_mapping_id should be camelCase
            sql`ROW_NUMBER() OVER (PARTITION BY account_mapping_id ORDER BY year)`.as(
              'row_number',
            ),
          ])
          .as('ab'),
      (join) => join.onRef('ab.accountMappingId', '=', 'am.id'),
    )
    .select((eb) => [
      'am.id',
      'am.accountName',
      eb.fn
        .coalesce(
          'am.accountTypeOverride',
          'am.accountType',
          sql<'UNKNOWN'>`'UNKNOWN'`,
        )
        .as('accountType'),
      'am.sortIdx',
      'am.classificationScore',
      sql<string>`MAX(CASE WHEN ab.row_number = 1 THEN ab.year END)`.as(
        'year1',
      ),
      sql<number>`MAX(CASE WHEN ab.row_number = 1 THEN ab.debit END)`.as(
        'debit1',
      ),
      sql<number>`MAX(CASE WHEN ab.row_number = 1 THEN ab.credit END)`.as(
        'credit1',
      ),
      sql<string>`MAX(CASE WHEN ab.row_number = 2 THEN ab.year END)`.as(
        'year2',
      ),
      sql<number>`MAX(CASE WHEN ab.row_number = 2 THEN ab.debit END)`.as(
        'debit2',
      ),
      sql<number>`MAX(CASE WHEN ab.row_number = 2 THEN ab.credit END)`.as(
        'credit2',
      ),
    ])
    .where('am.auditId', '=', auditId)
    .groupBy(['am.id', 'am.accountName', 'am.accountType'])
    .orderBy(['am.sortIdx'])
    .execute();

  return data.map((r) => ({
    ...r,
    // Previous year is ordered first via the query
    balancePrev: getBalance({
      accountType: r.accountType,
      credit: r.credit1,
      debit: r.debit1,
    }),
    balance: getBalance({
      accountType: r.accountType,
      credit: r.credit2,
      debit: r.debit2,
    }),
  }));
}

export async function getBalancesByAccountType(
  auditId: AuditId,
  year: string,
): Promise<AccountMap> {
  const originalRows = await db
    .selectFrom('accountMapping')
    .innerJoin('accountBalance', 'accountMappingId', 'accountMapping.id')
    .select((eb) => [
      eb.fn
        .coalesce(
          'accountTypeOverride',
          'accountType',
          sql<'UNKNOWN'>`'UNKNOWN'`,
        )
        .as('accountTypeMerged'),
      db.fn.sum<number>('credit').as('credit'),
      db.fn.sum<number>('debit').as('debit'),
    ])
    .where('isDeleted', '=', false)
    .where('auditId', '=', auditId)
    .where('year', '=', year)
    .groupBy('accountTypeMerged')
    .execute();
  const rows = originalRows.map((r) => ({
    accountType: r.accountTypeMerged,

    balance: getBalance({
      accountType: r.accountTypeMerged,
      credit: r.credit,
      debit: r.debit,
    }),
  }));
  return new AccountMap(Object.keys(accountTypes) as AccountType[], rows);
}

export async function getAccountByFuzzyMatch(
  auditId: AuditId,
  year: string,
  accountTypeGroup: AccountTypeGroup,
  searchString: string,
) {
  const res = await db
    .selectFrom('accountMapping as am')
    .innerJoin('accountBalance', 'accountMappingId', 'am.id')
    .select((eb) => [
      'accountName',
      eb.fn
        .coalesce(
          'accountTypeOverride',
          'accountType',
          sql<'UNKNOWN'>`'UNKNOWN'`,
        )
        .as('accountTypeMerged'),
      eb
        .fn<number>('similarity', ['accountName', eb.val(searchString)])
        .as('score'),
      'credit',
      'debit',
    ])
    .where('auditId', '=', auditId)
    .where('isDeleted', '=', false)
    .where('year', '=', year)
    .where((eb) =>
      eb.fn('starts_with', ['accountType', eb.val(accountTypeGroup)]),
    )
    .where(
      (eb) =>
        eb.fn<number>('similarity', ['accountName', eb.val(searchString)]),
      '>',
      0.09,
    )

    .orderBy('score', 'desc')
    .limit(1)
    .execute();

  return res[0];
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
      .selectFrom('accountMapping')
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
      .selectFrom('accountMapping')
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
        .updateTable('accountMapping')
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

  const businessModelsArr = (await getDataForRequestAttribute2(
    auditId,
    'basic-info',
    'businessModels',
  )) as (keyof typeof businessModelTypes)[] | undefined;
  let organizationTypeStr = '';
  if (businessModelsArr) {
    const businessModelStr = businessModelsArr
      .map((bm) => businessModelTypes[bm]?.name)
      .join(', ');
    organizationTypeStr = `The business type is "${businessModelStr}". `;
  }
  const messages: OpenAIMessage[] = [
    {
      role: 'system',
      content: dedent`
      You will be provided an aray in JSON of account ids and account names from an organization's Trial Balance. ${organizationTypeStr}For each account, classify the account name into an account type. The account types you can use are:

      ${Object.entries(accountTypes)
        .filter(([aType]) => !aType.startsWith('OTHER_'))
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
    const id = rowMap.get(idx) as AccountMappingId;
    if (!id || accountType in accountTypes === false) {
      console.log('Invalid accountType', accountType);
      continue;
    }

    if (accountType === 'UNKNOWN' && quickPass) {
      continue;
    }

    toUpdate.push(
      db
        .updateTable('accountMapping')
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

export async function checkDates(auditId: AuditId) {
  const auditYear = (await getDataForRequestAttribute2(
    auditId,
    'audit-info',
    'year',
  )) as string;
  const previousYear = String(Number(auditYear) - 1);
  const errors = [];
  for (const identifier of [
    'currentYearDocumentId',
    'previousYearDocumentId',
  ]) {
    const data = await getDataForRequestAttribute2(
      auditId,
      'trial-balance',
      identifier,
    );
    if (!data || !Array.isArray(data) || data.length === 0) {
      errors.push(`Missing ${identifier}`);
      continue;
    }

    const document = await getDocumentById(data[0]);
    if (document.classifiedType !== 'TRIAL_BALANCE') {
      throw new Error('Invalid classified type');
    }

    const aiDateRes = await pollGetByDocumentIdAndIdentifier(
      document.id,
      'trialBalanceDate',
    );

    if (!aiDateRes) {
      errors.push(`Missing date for ${identifier}`);
      continue;
    }
    const docYear = aiDateRes.result?.substring(0, 4);
    if (docYear !== auditYear && identifier === 'currentYearDocumentId') {
      errors.push(
        `The trial balance document date (${docYear}) does not match the audit year (${auditYear})`,
      );
    } else if (
      docYear !== previousYear &&
      identifier === 'previousYearDocumentId'
    ) {
      errors.push(
        `The trial balance document date (${docYear}) does not match the previous year (${previousYear})`,
      );
    }
  }
  return errors;
}

async function getDocumentData(
  auditId: AuditId,
  identifier: 'currentYearDocumentId' | 'previousYearDocumentId',
) {
  const data = await getDataForRequestAttribute2(
    auditId,
    'trial-balance',
    identifier,
  );
  if (!data || !Array.isArray(data) || data.length === 0) {
    return { data: [] };
  }

  const document = await getDocumentById(data[0]);
  if (document.classifiedType !== 'TRIAL_BALANCE') {
    throw new Error('Invalid classified type');
  }

  const aiDateRes = await pollGetByDocumentIdAndIdentifier(
    document.id,
    'trialBalanceDate',
  );

  const sheets = getSheetData(document);
  if (!sheets) {
    throw new Error('No sheets found');
  }
  const { rows } = sheets[0];
  const colIdxs = await getColIdxs(document);

  const accountNameSchema = z
    .string()
    .min(1)
    .max(72)
    // Naive, but "total" is common and we don't want it.
    .refine((val) => val.toUpperCase() !== 'TOTAL');

  let ret = [];
  for (const row of rows) {
    let numberRaw = row[colIdxs.accountIdColumnIdx] || '';
    let nameRaw = row[colIdxs.accountNameColumnIdx] || '';
    let accountNameRaw = `${numberRaw}${
      numberRaw && nameRaw ? ' - ' : ''
    }${nameRaw}`.trim();

    const accountNameParsed = accountNameSchema.safeParse(accountNameRaw);
    if (!accountNameParsed.success) {
      continue;
    }

    ret.push({
      accountName: accountNameParsed.data,
      debit: parseNumber(row[colIdxs.debitColumnIdx]),
      credit: parseNumber(row[colIdxs.creditColumnIdx]),
    });
  }

  return { data: ret, date: aiDateRes };
}

export async function extractTrialBalance(auditId: AuditId): Promise<boolean> {
  const previousYear = await getDocumentData(auditId, 'previousYearDocumentId');
  const currentYear = await getDocumentData(auditId, 'currentYearDocumentId');

  type Row = {
    debit1?: number;
    credit1?: number;
    debit2?: number;
    credit2?: number;
  };
  let data = new Map<string, Row>();
  for (const row of previousYear.data) {
    data.set(row.accountName, {
      debit1: row.debit,
      credit1: row.credit,
    });
  }
  for (const row of currentYear.data) {
    if (data.has(row.accountName)) {
      const existing = data.get(row.accountName) as Row;
      data.set(row.accountName, {
        ...existing,
        debit2: row.debit,
        credit2: row.credit,
      });
    } else {
      data.set(row.accountName, {
        debit2: row.debit,
        credit2: row.credit,
      });
    }
  }

  const existingRows = await getAllAccountMappingsByAuditId(auditId);
  const existingMap = new Map(existingRows.map((r) => [r.accountName, r]));

  const toAdd = [];
  const balances = [];
  const toUpdate = [];
  const idsToRetain: string[] = [];
  let sortIdx = 0;
  for (const [accountName, row] of Array.from(data)) {
    sortIdx++;
    let id;
    if (existingMap.has(accountName)) {
      const existing = existingMap.get(accountName) as (typeof existingRows)[0];
      id = existing.id;
      if (existing.isDeleted) {
        toUpdate.push(
          db
            .updateTable('accountMapping')
            .set({
              isDeleted: false,
              sortIdx,
            })
            .where('id', '=', existing.id)
            .execute(),
        );
        idsToRetain.push(id);
      }
    } else {
      id = uuidv7();
      toAdd.push({
        id,
        auditId,
        accountName,
        sortIdx,
      });
    }

    balances.push({
      accountMappingId: id,
      year: dateLiketoYear(previousYear.date?.result),
      debit: row.debit1 || 0,
      credit: row.credit1 || 0,
      currency: 'USD',
    });
    balances.push({
      accountMappingId: id,
      year: dateLiketoYear(currentYear.date?.result),
      debit: row.debit2 || 0,
      credit: row.credit2 || 0,
      currency: 'USD',
    });
  }

  // Delete balances before modifying accountMappings
  db.deleteFrom('accountBalance as ab')
    .using('accountMapping as am')
    .whereRef('ab.accountMappingId', '=', 'am.id')
    .where('am.auditId', '=', auditId)
    .execute();

  if (toAdd.length > 0) {
    await db.insertInto('accountMapping').values(toAdd).execute();
  }
  const idsToDelete = existingRows
    .filter((r) => idsToRetain.includes(r.id) === false)
    .map((r) => r.id);

  if (idsToDelete.length > 0) {
    await db
      .updateTable('accountMapping')
      .set({ isDeleted: true })
      .where('id', 'in', idsToDelete)
      .execute();
  }

  if (balances.length > 0) {
    await db.insertInto('accountBalance').values(balances).execute();
  }

  const toClassifyRowCount = await db
    .selectFrom('accountMapping')
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
    .innerJoin('accountMapping', 'accountMappingId', 'accountMapping.id')
    .select(['accountName', 'credit', 'debit'])
    .where('isDeleted', '=', false)
    .where('auditId', '=', auditId)
    .where('accountType', '=', accountType)
    .execute();
  return rows.map((r) => ({
    accountName: r.accountName,
    balance: getBalance({
      accountType,
      credit: r.credit,
      debit: r.debit,
    }),
  }));
}

async function getColIdxs(document: Document) {
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
