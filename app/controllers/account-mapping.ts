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
import {
  AccountMap,
  accountTypes,
  getBalance,
  includeNetIncomeInRetainedEarnings,
} from '@/lib/finance';
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
  UserId,
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
            sql<string>`ROUND(debit * 100)`.as('debit'),
            sql<string>`ROUND(credit * 100)`.as('credit'),
            // account_mapping_id should be camelCase
            sql`ROW_NUMBER() OVER (PARTITION BY account_mapping_id ORDER BY year DESC)`.as(
              'row_number',
            ),
          ])
          .as('ab'),
      (join) => join.onRef('ab.accountMappingId', '=', 'am.id'),
    )
    .select((eb) => [
      'am.id',
      'am.accountName',
      'am.isAdjustmentAccount',
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
      sql<string>`MAX(CASE WHEN ab.row_number = 1 THEN ab.debit END)`.as(
        'debit1',
      ),
      sql<string>`MAX(CASE WHEN ab.row_number = 1 THEN ab.credit END)`.as(
        'credit1',
      ),
      sql<string>`MAX(CASE WHEN ab.row_number = 2 THEN ab.year END)`.as(
        'year2',
      ),
      sql<string>`MAX(CASE WHEN ab.row_number = 2 THEN ab.debit END)`.as(
        'debit2',
      ),
      sql<string>`MAX(CASE WHEN ab.row_number = 2 THEN ab.credit END)`.as(
        'credit2',
      ),
      sql<string>`MAX(CASE WHEN ab.row_number = 3 THEN ab.year END)`.as(
        'year3',
      ),
      sql<string>`MAX(CASE WHEN ab.row_number = 3 THEN ab.debit END)`.as(
        'debit3',
      ),
      sql<string>`MAX(CASE WHEN ab.row_number = 3 THEN ab.credit END)`.as(
        'credit3',
      ),
    ])
    .where('am.auditId', '=', auditId)
    .where('am.isDeleted', '=', false)
    .groupBy(['am.id', 'am.accountName', 'am.accountType'])
    .orderBy(['am.sortIdx'])
    .execute();

  const adjustments = await db
    .selectFrom('accountBalanceOverride')
    .select([
      'accountMappingId',
      'year',
      sql<string>`SUM(ROUND(debit * 100))`.as('debit'),
      sql<string>`SUM(ROUND(credit * 100))`.as('credit'),
      // 'comment',
    ])
    .groupBy(['accountMappingId', 'year'])
    .where(
      'accountMappingId',
      'in',
      data.map((r) => r.id),
    )
    .execute();

  const adjustmentsMap = new Map(
    adjustments.map((r) => [
      `${r.accountMappingId}-${r.year}`,
      {
        hasAdjustment: true,
        accountMappingId: r.accountMappingId,
        year: r.year,
        debit: Number(r.debit),
        credit: Number(r.credit),
        // comment: r.comment,
      },
    ]),
  );

  return data.map((r) => {
    const adjustment1 = adjustmentsMap.get(`${r.id}-${r.year1}`) || {
      hasAdjustment: false,
      debit: 0,
      credit: 0,
      // comment: '',
    };
    const adjustment2 = adjustmentsMap.get(`${r.id}-${r.year2}`) || {
      hasAdjustment: false,
      debit: 0,
      credit: 0,
      // comment: '',
    };
    const adjustment3 = adjustmentsMap.get(`${r.id}-${r.year3}`) || {
      hasAdjustment: false,
      debit: 0,
      credit: 0,
      // comment: '',
    };

    const credit1 = Number(r.credit1);
    const debit1 = Number(r.debit1);
    const credit2 = Number(r.credit2);
    const debit2 = Number(r.debit2);
    const credit3 = Number(r.credit3);
    const debit3 = Number(r.debit3);

    return {
      ...r,
      credit1,
      debit1,
      credit2,
      debit2,
      credit3,
      debit3,
      balance1: getBalance({
        accountType: r.accountType,
        credit: credit1 + adjustment1.credit,
        debit: debit1 + adjustment1.debit,
      }),
      balance2: getBalance({
        accountType: r.accountType,
        credit: credit2 + adjustment2.credit,
        debit: debit2 + adjustment2.debit,
      }),
      balance3: getBalance({
        accountType: r.accountType,
        credit: credit3 + adjustment3.credit,
        debit: debit3 + adjustment3.debit,
      }),
      adjustment1: {
        hasAdjustment: adjustment1.hasAdjustment,
        credit: adjustment1.credit,
        debit: adjustment1.debit,
        // comment: adjustment1.comment,
      },
      adjustment2: {
        hasAdjustment: adjustment2.hasAdjustment,
        credit: adjustment2.credit,
        debit: adjustment2.debit,
        // comment: adjustment2.comment,
      },
      adjustment3: {
        hasAdjustment: adjustment3.hasAdjustment,
        credit: adjustment3.credit,
        debit: adjustment3.debit,
        // comment: adjustment3.comment,
      },
    };
  });
}

export async function getAdjustments(
  accountMappingId: AccountMappingId,
  year: string,
) {
  const data = await db
    .selectFrom('accountBalanceOverride as abo')
    .innerJoin('accountMapping as am', 'am.id', 'abo.accountMappingId')
    .leftJoin('accountMapping as pam', 'pam.id', 'abo.parentAccountMappingId')
    .innerJoin('accountBalance as ab', 'ab.accountMappingId', 'am.id')
    .leftJoin('auth.user as u', 'u.id', 'abo.actorUserId')
    .select([
      'abo.id',
      'abo.accountMappingId',
      'abo.parentAccountMappingId',
      sql<string>`ROUND(ab.debit * 100)`.as('debit'),
      sql<string>`ROUND(ab.credit * 100)`.as('credit'),
      sql<string>`ROUND(abo.debit * 100)`.as('adjustmentDebit'),
      sql<string>`ROUND(abo.credit * 100)`.as('adjustmentCredit'),
      'abo.comment',
      'abo.actorUserId',
      'u.name',
      'u.email',
      'u.image',
      'am.accountName',
      'pam.accountName as parentAccountName',
    ])
    .where((eb) =>
      eb.or([
        eb('abo.accountMappingId', '=', accountMappingId),
        eb('abo.parentAccountMappingId', '=', accountMappingId),
      ]),
    )
    .where('abo.year', '=', year)
    .where('ab.year', '=', year)
    .execute();

  const typedData = data.map((r) => ({
    id: r.id,
    accountMappingId: r.accountMappingId,
    parentAccountMappingId: r.parentAccountMappingId,
    comment: r.comment,
    debit: Number(r.debit),
    credit: Number(r.credit),
    adjustmentDebit: Number(r.adjustmentDebit),
    adjustmentCredit: Number(r.adjustmentCredit),
    accountName: r.accountName,
    parentAccountName: r.parentAccountName || '',
    user: {
      id: r.actorUserId,
      name: r.name,
      email: r.email,
      image: r.image,
    },
  }));
  type TypedData = (typeof typedData)[0];

  // UNIQUE constraint on accountMappingId, parentAccountMappingId, year.
  const typedIdx = typedData.findIndex(
    (r) =>
      r.accountMappingId === accountMappingId &&
      r.parentAccountMappingId === null,
  );
  let self: TypedData | null;
  let children: TypedData[];
  if (typedIdx !== -1) {
    self = typedData.splice(typedIdx, 1)[0];
    children = typedData.filter(
      (r) => r.parentAccountMappingId === accountMappingId,
    );
  } else {
    self = null;
    children = [];
  }
  const other = typedData.filter(
    (r) =>
      r.accountMappingId === accountMappingId &&
      r.parentAccountMappingId !== null,
  );
  return {
    self,
    children,
    other,
  };
}

export async function getAllAccountBalancesByAuditIdAndYear(
  auditId: AuditId,
  year: string,
) {
  const data = await db
    .selectFrom('accountMapping as am')
    .innerJoin('accountBalance as ab', 'ab.accountMappingId', 'am.id')
    .leftJoin('accountBalanceOverride as abo', (join) =>
      join
        .onRef('abo.accountMappingId', '=', 'am.id')
        .on('abo.year', '=', year),
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
      sql<string>`ROUND(ab.debit * 100) + CASE WHEN abo.debit IS NOT NULL THEN ROUND(abo.debit * 100) ELSE 0 END`.as(
        'debit',
      ),
      sql<string>`ROUND(ab.credit * 100) + CASE WHEN abo.credit IS NOT NULL THEN ROUND(abo.credit * 100) ELSE 0 END`.as(
        'credit',
      ),
    ])
    .where('am.auditId', '=', auditId)
    .where('ab.year', '=', year)
    .where('am.isDeleted', '=', false)
    .orderBy(['am.sortIdx'])
    .execute();

  return data.map((r) => ({
    ...r,
    balance: getBalance({
      accountType: r.accountType,
      credit: Number(r.credit),
      debit: Number(r.debit),
    }),
  }));
}

export async function getBalancesByAccountType(auditId: AuditId, year: string) {
  const originalRows = await db
    .with('account', (qb) =>
      qb
        .selectFrom('accountMapping as am')
        .innerJoin('accountBalance as ab', 'ab.accountMappingId', 'am.id')
        .leftJoin('accountBalanceOverride as abo', (join) =>
          join
            .onRef('abo.accountMappingId', '=', 'am.id')
            .on('abo.year', '=', year),
        )
        .select((eb) => [
          eb.fn
            .coalesce(
              'accountTypeOverride',
              'accountType',
              sql<'UNKNOWN'>`'UNKNOWN'`,
            )
            .as('accountTypeMerged'),
          sql<string>`ROUND(ab.debit * 100) + CASE WHEN abo.debit IS NOT NULL THEN ROUND(abo.debit * 100) ELSE 0 END`.as(
            'debit',
          ),
          sql<string>`ROUND(ab.credit * 100) + CASE WHEN abo.credit IS NOT NULL THEN ROUND(abo.credit * 100) ELSE 0 END`.as(
            'credit',
          ),
        ])
        .where('isDeleted', '=', false)
        .where('auditId', '=', auditId)
        .where('ab.year', '=', year),
    )
    .selectFrom('account')
    .select([
      'accountTypeMerged',
      sql<string>`SUM(ROUND(debit * 100))`.as('debit'),
      sql<string>`SUM(ROUND(credit * 100))`.as('credit'),
    ])
    .groupBy('accountTypeMerged')
    .execute();
  let rows = originalRows.map((r) => ({
    accountType: r.accountTypeMerged,

    balance: getBalance({
      accountType: r.accountTypeMerged,
      credit: Number(r.credit),
      debit: Number(r.debit),
    }),
  }));

  rows = includeNetIncomeInRetainedEarnings(rows);

  return new AccountMap(Object.keys(accountTypes) as AccountType[], rows);
}

export async function getAccountByFuzzyMatch(
  auditId: AuditId,
  year: string,
  accountTypeGroup: AccountTypeGroup,
  searchString: string,
) {
  const row = await db
    .selectFrom('accountMapping as am')
    .innerJoin('accountBalance as ab', 'ab.accountMappingId', 'am.id')
    .leftJoin('accountBalanceOverride as abo', (join) =>
      join
        .onRef('abo.accountMappingId', '=', 'am.id')
        .on('abo.year', '=', year),
    )
    .select((eb) => [
      'accountName',
      eb.fn
        .coalesce(
          'accountTypeOverride',
          'accountType',
          sql<'UNKNOWN'>`'UNKNOWN'`,
        )
        .as('accountType'),
      eb
        .fn<number>('similarity', ['accountName', eb.val(searchString)])
        .as('score'),
      sql<string>`ROUND(ab.debit * 100) + CASE WHEN abo.debit IS NOT NULL THEN ROUND(abo.debit * 100) ELSE 0 END`.as(
        'debit',
      ),
      sql<string>`ROUND(ab.credit * 100) + CASE WHEN abo.credit IS NOT NULL THEN ROUND(abo.credit * 100) ELSE 0 END`.as(
        'credit',
      ),
    ])
    .where('auditId', '=', auditId)
    .where('isDeleted', '=', false)
    .where('ab.year', '=', year)
    .where((eb) =>
      eb.fn('starts_with', ['accountType', eb.val(accountTypeGroup)]),
    )
    .where(
      (eb) =>
        eb.fn<number>('similarity', ['accountName', eb.val(searchString)]),
      '>',
      0.2,
    )

    .orderBy('score', 'desc')
    .limit(1)
    .executeTakeFirst();

  if (!row) {
    return undefined;
  }

  return {
    ...row,
    balance: getBalance({
      accountType: row.accountType,
      credit: Number(row.credit),
      debit: Number(row.debit),
    }),
  };
}

export async function getAccountsByFuzzyMatch(
  auditId: AuditId,
  year: string,
  accountTypeGroup: AccountTypeGroup,
  searchString: string,
) {
  const row = await db
    .selectFrom('accountMapping as am')
    .innerJoin('accountBalance as ab', 'ab.accountMappingId', 'am.id')
    .leftJoin('accountBalanceOverride as abo', (join) =>
      join
        .onRef('abo.accountMappingId', '=', 'am.id')
        .on('abo.year', '=', year),
    )
    .select((eb) => [
      'accountName',
      eb.fn
        .coalesce(
          'accountTypeOverride',
          'accountType',
          sql<'UNKNOWN'>`'UNKNOWN'`,
        )
        .as('accountType'),
      eb
        .fn<number>('similarity', ['accountName', eb.val(searchString)])
        .as('score'),
      sql<string>`ROUND(ab.debit * 100) + CASE WHEN abo.debit IS NOT NULL THEN ROUND(abo.debit * 100) ELSE 0 END`.as(
        'debit',
      ),
      sql<string>`ROUND(ab.credit * 100) + CASE WHEN abo.credit IS NOT NULL THEN ROUND(abo.credit * 100) ELSE 0 END`.as(
        'credit',
      ),
    ])
    .where('auditId', '=', auditId)
    .where('isDeleted', '=', false)
    .where('ab.year', '=', year)
    .where((eb) =>
      eb.fn('starts_with', ['accountType', eb.val(accountTypeGroup)]),
    )
    .where(
      (eb) =>
        eb.fn<number>('similarity', ['accountName', eb.val(searchString)]),
      '>',
      0.2,
    )

    .orderBy('score', 'desc')
    .execute();

  const accounts = row.map((r) => ({
    ...r,
    balance: getBalance({
      accountType: r.accountType,
      credit: Number(r.credit),
      debit: Number(r.debit),
    }),
  }));

  return {
    accounts,
    balance: accounts.reduce((sum, r) => sum + r.balance, 0),
  };
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

export async function overrideAccountBalance({
  accountMappingId,
  year,
  debit,
  credit,
  comment,
  actorUserId,
}: {
  accountMappingId: AccountMappingId;
  year: string;
  debit: number;
  credit: number;
  comment: string;
  actorUserId: UserId;
}) {
  await db
    .deleteFrom('accountBalanceOverride')
    .where('accountMappingId', '=', accountMappingId)
    .where('year', '=', year)
    .execute();
  await db
    .insertInto('accountBalanceOverride')
    .values({
      accountMappingId,
      year,
      debit: debit,
      credit: credit,
      comment,
      actorUserId,
    })
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
) {
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
    const aiP: Array<Promise<{ numClassified: number }>> = [];

    const buckets = bucket(remainingRows, 10, 20);
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
) {
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

function cleanRowForAI({ accountName }: { accountName: string }) {
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
}) {
  const rowMap = new Map(rows.map((r, idx) => [idx, r.id]));
  const toAiRows = rows.map((r, idx) => {
    const name = cleanRowForAI(r);

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
        .map(([aType, _description]) => aType)
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
    requestedModel = 'gpt-4-0125-preview';
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

/**
 * Deal with Quickbooks exports that prefix values with the "=" character.
 */
function parseNumber(num: string) {
  return parseFloat(num.replace('=', '')) || 0;
}

export async function checkDates(
  auditId: AuditId,
  checkForMissingFiles = true,
) {
  const year1 = (await getDataForRequestAttribute2(
    auditId,
    'audit-info',
    'year',
  )) as string;
  const year2 = String(Number(year1) - 1);
  const year3 = String(Number(year1) - 2);
  const errors = [];
  for (const identifier of [
    'year1DocumentId',
    'year2DocumentId',
    'year3DocumentId',
  ]) {
    const data = await getDataForRequestAttribute2(
      auditId,
      'trial-balance',
      identifier,
    );
    if (!data || !Array.isArray(data) || data.length === 0) {
      if (checkForMissingFiles) {
        errors.push(`Missing ${identifier}`);
      }
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
    if (docYear !== year1 && identifier === 'year1DocumentId') {
      errors.push(
        `The audit year trial balance document date should be ${year1}. It is currently ${docYear}.`,
      );
    } else if (docYear !== year2 && identifier === 'year2DocumentId') {
      errors.push(
        `The previous year trial balance document date should be ${year2}. It is currently ${docYear}.`,
      );
    } else if (docYear !== year3 && identifier === 'year3DocumentId') {
      errors.push(
        `The previous year trial balance document date should be ${year3}. It is currently ${docYear}.`,
      );
    }
  }
  return errors;
}

async function getDocumentData(
  auditId: AuditId,
  identifier: 'year1DocumentId' | 'year2DocumentId' | 'year3DocumentId',
) {
  const data = await getDataForRequestAttribute2(
    auditId,
    'trial-balance',
    identifier,
  );
  if (!data || !Array.isArray(data) || data.length === 0) {
    return { data: [], year: '' };
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
    .object({
      accountName: z
        .string()
        .trim()
        .min(1)
        .max(256)
        // Naive, but "total" is common and we don't want it.
        // Using .startsWith() because NetSuite totals each category of account.
        .refine((val) => val.toUpperCase().startsWith('TOTAL') === false),
      credit: z.coerce.string(),
      debit: z.coerce.string(),
    })
    .refine((val) => val.credit !== '' || val.debit !== '')
    .transform((val) => ({
      accountName: val.accountName,
      credit: parseNumber(val.credit),
      debit: parseNumber(val.debit),
    }));

  const ret = [];
  for (const row of rows) {
    const numberRaw = row[colIdxs.accountIdColumnIdx] || '';
    const nameRaw = row[colIdxs.accountNameColumnIdx] || '';

    const parsed = accountNameSchema.safeParse({
      accountName: `${numberRaw}${numberRaw && nameRaw ? ' - ' : ''}${nameRaw}`,
      credit: row[colIdxs.creditColumnIdx],
      debit: row[colIdxs.debitColumnIdx],
    });

    if (parsed.success) {
      ret.push(parsed.data);
    }
  }

  return { data: ret, year: dateLiketoYear(aiDateRes?.result) };
}

export async function extractTrialBalance(auditId: AuditId) {
  const year3Data = await getDocumentData(auditId, 'year3DocumentId');
  const year2Data = await getDocumentData(auditId, 'year2DocumentId');
  const year1Data = await getDocumentData(auditId, 'year1DocumentId');

  if (year3Data.year === '' && year2Data.year === '' && year1Data.year === '') {
    return false;
  }

  type Row = {
    year: string;
    debit: number;
    credit: number;
  };
  const data = new Map<string, Row[]>();
  for (const yearData of [year1Data, year2Data, year3Data]) {
    for (const row of yearData.data) {
      const balances = data.get(row.accountName) || [];
      balances.push({
        year: yearData.year,
        debit: row.debit || 0,
        credit: row.credit || 0,
      });
      data.set(row.accountName, balances);
    }
  }

  const existingRows = await getAllAccountMappingsByAuditId(auditId);
  const existingMap = new Map(existingRows.map((r) => [r.accountName, r]));

  const toAdd = [];
  const balances = [];
  const toUpdate = [];
  const idsToRetain: string[] = [];
  let sortIdx = 0;
  for (const [accountName, accountBalances] of Array.from(data)) {
    sortIdx++;
    let id;
    const existing = existingMap.get(accountName);
    if (existing) {
      id = existing.id;
      idsToRetain.push(id);
      toUpdate.push(
        db
          .updateTable('accountMapping')
          .set({
            isDeleted: false,
            sortIdx,
          })
          .where('id', '=', id)
          .execute(),
      );
    } else {
      id = uuidv7();
      toAdd.push({
        id,
        auditId,
        accountName,
        sortIdx,
        isAdjustmentAccount: false,
      });
    }

    for (const row of accountBalances) {
      balances.push({
        accountMappingId: id,
        year: row.year,
        debit: row.debit,
        credit: row.credit,
        currency: 'USD',
      });
    }
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
    .map((r) => r.id)
    .filter((id) => !idsToRetain.includes(id));

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
  year: string,
) {
  const rows = await db
    .selectFrom('accountMapping as am')
    .innerJoin('accountBalance as ab', 'ab.accountMappingId', 'am.id')
    .leftJoin('accountBalanceOverride as abo', (join) =>
      join
        .onRef('abo.accountMappingId', '=', 'am.id')
        .on('abo.year', '=', year),
    )
    .select([
      'accountName',
      sql<string>`ROUND(ab.debit * 100) + CASE WHEN abo.debit IS NOT NULL THEN ROUND(abo.debit * 100) ELSE 0 END`.as(
        'debit',
      ),
      sql<string>`ROUND(ab.credit * 100) + CASE WHEN abo.credit IS NOT NULL THEN ROUND(abo.credit * 100) ELSE 0 END`.as(
        'credit',
      ),
    ])
    .where('isDeleted', '=', false)
    .where('auditId', '=', auditId)
    .where('ab.year', '=', year)
    .where('accountType', '=', accountType)
    .execute();
  return rows.map((r) => ({
    accountName: r.accountName,
    balance: getBalance({
      accountType,
      credit: Number(r.credit),
      debit: Number(r.debit),
    }),
  }));
}

export async function getCashflowSupportData(auditId: AuditId, year: string) {
  // INCOME_STATEMENT_STOCK_BASED_COMPENSATION
  const stockComp = await getAccountByFuzzyMatch(
    auditId,
    year,
    'INCOME_STATEMENT',
    'stock based compensation',
  );

  // INCOME_STATEMENT_DEPRECIATION_AND_AMORTIZATION
  const depreciation = await getAccountsByFuzzyMatch(
    auditId,
    year,
    'INCOME_STATEMENT',
    'depreciation',
  );

  return {
    stockBasedComp: {
      accounts: [stockComp],
      balance: stockComp?.balance || 0,
    },
    depreciation: {
      accounts: depreciation.accounts,
      balance: depreciation.balance,
    },
    TODO: {
      accounts: [],
      balance: 0,
    },
  };
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

  // If accountIdColumnIdx is the same as accountNameColumnIdx, ignore it.
  // The LLM will sometimes hallucinate the same value for both.
  if (res.accountIdColumnIdx === res.accountNameColumnIdx) {
    res.accountIdColumnIdx = -1;
  }
  return res;
}
