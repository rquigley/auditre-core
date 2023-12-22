import build from 'next/dist/build';

import { getAccountsForCategory } from '@/controllers/account-mapping';
import { AccountMap, groupFixedAccountsByCategories } from '@/lib/finance';
import { Row, Table } from '@/lib/table';
import { addFP } from '@/lib/util';
import {
  getCertificateTransactionDocumentData,
  getSBCReportData,
} from '../equity';

import type { AuditData } from '../audit';

export const tableMap = {
  'balance-sheet': buildBalanceSheet,
  'statement-of-operations': buildStatementOfOperations,
  'property-and-equipment-lives': buildPropertyAndEquipmentLives,
  'property-and-equipment-net': buildPropertyAndEquipmentNet,
  'fvm-liabilities': buildFVMLiabilities,
  'fvm-liabilities2': buildFVMLiabilities2,
  'convertible-preferred-stock': buildConvertiblePreferredStock,
  'convertible-preferred-to-common': buildConvertibleToCommon,
  'common-stock-reserved-for-future-issuance':
    buildCommonStockReservedForFutureIssuance,
} as const;

export function filterHideIfZeroRows(rows: Row[]) {
  return rows.filter((row) => {
    if (row.hasTag('hide-if-zero')) {
      const hasNonZeroValues = row.cells.some(
        (cell) => typeof cell.value === 'number' && cell.value !== 0,
      );
      return hasNonZeroValues;
    }
    return true;
  });
}

export async function buildBalanceSheet(data: AuditData): Promise<Table> {
  const totals = data.totals;

  let t = new Table();
  t.columns = [{}, { style: { numFmt: 'accounting', align: 'right' } }];

  let row;
  row = t.addRow([`As of ${data.fiscalYearEndNoYear},`, data.year], {
    id: 'date-row',
    style: { bold: true, borderBottom: 'thin' },
  });

  t.addRow(['Assets', ''], {
    style: {
      bold: true,
      borderBottom: 'thin',
      padTop: true,
    },
  });
  t.addRow(['Current assets:', ''], {
    style: { padTop: true },
  });

  // TODO: Add accounting norm to hide if < 5% TOTAL
  t.addRow(['Cash', totals.get('ASSET_CASH_AND_CASH_EQUIVALENTS')], {
    id: 'ASSET_CASH_AND_CASH_EQUIVALENTS',
    tags: [
      'total-current-assets',
      'hide-if-zero',
      'hide-if-less-than-5-percent',
    ],
    cellStyle: [{ indent: true }],
  });

  t.addRow(['Inventory', totals.get('ASSET_INVENTORY')], {
    id: 'ASSET_INVENTORY',
    tags: [
      'total-current-assets',
      'hide-if-zero',
      'hide-if-less-than-5-percent',
    ],
    cellStyle: [{ indent: true }, { hideCurrency: true }],
  });

  t.addRow(['Prepaid expenses', totals.get('ASSET_PREPAID_EXPENSES')], {
    id: 'ASSET_PREPAID_EXPENSES',
    tags: [
      'total-current-assets',
      'hide-if-zero',
      'hide-if-less-than-5-percent',
    ],
    cellStyle: [{ indent: true }, { hideCurrency: true }],
  });

  t.addRow(
    [
      'Prepaid expenses and other current assets',
      totals.get('ASSET_CURRENT_OTHER'),
    ],
    {
      id: 'ASSET_CURRENT_OTHER',
      tags: [
        'total-current-assets',
        'hide-if-zero',
        'hide-if-less-than-5-percent',
      ],
      cellStyle: [{ indent: true }, { hideCurrency: true }],
    },
  );

  t.addRow(
    [
      'Total current assets',
      { operation: 'addColumnCellsByTag', args: ['total-current-assets'] },
    ],
    {
      tags: ['total-asset'],
      style: {
        borderTop: 'thin',
      },
    },
  );

  t.addRow(
    ['Property and equipment, net', totals.get('ASSET_PROPERTY_AND_EQUIPMENT')],
    {
      id: 'ASSET_PROPERTY_AND_EQUIPMENT',
      tags: ['total-asset', 'hide-if-zero', 'hide-if-less-than-5-percent'],
      cellStyle: [{}, { hideCurrency: true }],
    },
  );

  t.addRow(['Intangible assets, net', totals.get('ASSET_INTANGIBLE_ASSETS')], {
    id: 'ASSET_INTANGIBLE_ASSETS',
    tags: ['total-asset', 'hide-if-zero', 'hide-if-less-than-5-percent'],
    cellStyle: [{}, { hideCurrency: true }],
  });

  t.addRow(
    [
      'Operating lease right-of-use assets',
      totals.get('ASSET_OPERATING_LEASE_RIGHT_OF_USE'),
    ],
    {
      id: 'ASSET_OPERATING_LEASE_RIGHT_OF_USE',
      tags: ['total-asset', 'hide-if-zero', 'hide-if-less-than-5-percent'],
      cellStyle: [{}, { hideCurrency: true }],
    },
  );

  t.addRow(['Other assets', totals.get('ASSET_OTHER')], {
    id: 'ASSET_OTHER',
    tags: ['total-asset', 'hide-if-zero', 'hide-if-less-than-5-percent'],
    cellStyle: [{}, { hideCurrency: true }],
  });

  t.addRow(
    [
      'Total assets',
      { operation: 'addColumnCellsByTag', args: ['total-asset'] },
    ],
    {
      id: 'total-assets',
      style: {
        borderTop: 'thin',
        borderBottom: 'double',
        bold: true,
        padTop: true,
      },
    },
  );

  //////
  t.addRow(['Liabilities and Stockholders’ Deficit', ''], {
    style: {
      bold: true,
      padTop: true,
    },
  });
  t.addRow(['Current liabilities:', ''], {
    style: {
      padTop: true,
    },
  });

  t.addRow(['Accounts payable', totals.get('LIABILITY_ACCOUNTS_PAYABLE')], {
    id: 'LIABILITY_ACCOUNTS_PAYABLE',
    tags: [
      'total-current-liabilities',
      'hide-if-zero',
      'hide-if-less-than-5-percent',
    ],
    cellStyle: [{ indent: true }, { hideCurrency: true }],
  });
  t.addRow(
    ['Accrued liabilities', totals.get('LIABILITY_ACCRUED_LIABILITIES')],
    {
      id: 'LIABILITY_ACCRUED_LIABILITIES',
      tags: [
        'total-current-liabilities',
        'hide-if-zero',
        'hide-if-less-than-5-percent',
      ],
      cellStyle: [{ indent: true }, { hideCurrency: true }],
    },
  );
  t.addRow(['Deferred revenue', totals.get('LIABILITY_DEFERRED_REVENUE')], {
    id: 'LIABILITY_DEFERRED_REVENUE',
    tags: [
      'total-current-liabilities',
      'hide-if-zero',
      'hide-if-less-than-5-percent',
    ],
    cellStyle: [{ indent: true }, { hideCurrency: true }],
  });
  t.addRow(
    [
      'Operating lease liabilities, current',
      totals.get('LIABILITY_OPERATING_LEASE_LIABILITIES_CURRENT'),
    ],
    {
      id: 'LIABILITY_OPERATING_LEASE_LIABILITIES_CURRENT',
      tags: [
        'total-current-liabilities',
        'hide-if-zero',
        'hide-if-less-than-5-percent',
      ],
      cellStyle: [{ indent: true }, { hideCurrency: true }],
    },
  );
  t.addRow(['Other', totals.get('LIABILITY_OTHER')], {
    id: 'LIABILITY_OTHER',
    tags: [
      'total-current-liabilities',
      'hide-if-zero',
      'hide-if-less-than-5-percent',
    ],
    cellStyle: [{ indent: true }, { hideCurrency: true }],
  });

  t.addRow(
    [
      'Total current liabilities',
      { operation: 'addColumnCellsByTag', args: ['total-current-liabilities'] },
    ],
    {
      tags: ['total-liabilities'],
      style: {
        borderTop: 'thin',
        borderBottom: 'thin',
      },
    },
  );

  t.addRow(['Accrued interest', totals.get('LIABILITY_ACCRUED_INTEREST')], {
    id: 'LIABILITY_ACCRUED_INTEREST',
    tags: ['total-liabilities', 'hide-if-zero', 'hide-if-less-than-5-percent'],
    cellStyle: [{}, { hideCurrency: true }],
  });

  t.addRow(
    [
      'Convertible notes payable',
      totals.get('LIABILITY_CONVERTIBLE_NOTES_PAYABLE'),
    ],
    {
      id: 'LIABILITY_CONVERTIBLE_NOTES_PAYABLE',
      tags: [
        'total-liabilities',
        'hide-if-zero',
        'hide-if-less-than-5-percent',
      ],
      cellStyle: [{}, { hideCurrency: true }],
    },
  );

  t.addRow(['Debt', totals.get('LIABILITY_DEBT')], {
    id: 'LIABILITY_DEBT',
    tags: ['total-liabilities', 'hide-if-zero', 'hide-if-less-than-5-percent'],
    cellStyle: [{}, { hideCurrency: true }],
  });

  t.addRow(
    [
      'Operating lease liabilities, net of current portion',
      totals.get(
        'LIABILITY_OPERATING_LEASE_LIABILITIES_NET_OF_CURRENT_PORTION',
      ),
    ],
    {
      id: 'LIABILITY_OPERATING_LEASE_LIABILITIES_NET_OF_CURRENT_PORTION',
      tags: [
        'total-liabilities',
        'hide-if-zero',
        'hide-if-less-than-5-percent',
      ],
      cellStyle: [{}, { hideCurrency: true }],
    },
  );
  t.addRow(
    [
      'Total liabilities',
      { operation: 'addColumnCellsByTag', args: ['total-liabilities'] },
    ],
    {
      tags: ['total-liabilities-and-stockholders-deficit'],
      style: {
        bold: true,
        padTop: true,
        borderTop: 'thin',
        borderBottom: 'thin',
      },
    },
  );
  t.addRow(['Stockholders’ deficit:', ''], {
    style: {
      padTop: true,
    },
  });

  t.addRow(['Preferred stock', totals.get('EQUITY_PREFERRED_STOCK')], {
    id: 'EQUITY_PREFERRED_STOCK',
    tags: ['total-equity', 'hide-if-zero', 'hide-if-less-than-5-percent'],
    cellStyle: [{ indent: true }, { hideCurrency: true }],
  });
  t.addRow(['Common stock', totals.get('EQUITY_COMMON_STOCK')], {
    id: 'EQUITY_COMMON_STOCK',
    tags: ['total-equity', 'hide-if-zero', 'hide-if-less-than-5-percent'],
    cellStyle: [{ indent: true }, { hideCurrency: true }],
  });
  t.addRow(['Paid-in capital', totals.get('EQUITY_PAID_IN_CAPITAL')], {
    id: 'EQUITY_PAID_IN_CAPITAL',
    tags: ['total-equity', 'hide-if-zero', 'hide-if-less-than-5-percent'],
    cellStyle: [{ indent: true }, { hideCurrency: true }],
  });
  t.addRow(['Retained earnings', totals.get('EQUITY_RETAINED_EARNINGS')], {
    id: 'EQUITY_RETAINED_EARNINGS',
    tags: ['total-equity', 'hide-if-zero', 'hide-if-less-than-5-percent'],
    cellStyle: [{ indent: true }, { hideCurrency: true }],
  });
  t.addRow(['Accumulated deficit', totals.get('EQUITY_ACCUMULATED_DEFICIT')], {
    id: 'EQUITY_ACCUMULATED_DEFICIT',
    tags: ['total-equity', 'hide-if-zero', 'hide-if-less-than-5-percent'],
    cellStyle: [{ indent: true }, { hideCurrency: true }],
  });

  t.addRow(
    [
      'Total stockholders’ deficit',
      {
        operation: 'addColumnCellsByTag',
        args: ['total-equity'],
      },
    ],
    {
      tags: ['total-liabilities-and-stockholders-deficit'],
      style: {
        bold: true,
        padTop: true,
        borderTop: 'thin',
        borderBottom: 'thin',
      },
    },
  );
  t.addRow(
    [
      'Total liabilities and stockholders’ deficit',
      {
        operation: 'addColumnCellsByTag',
        args: ['total-liabilities-and-stockholders-deficit'],
      },
    ],
    {
      style: {
        bold: true,
        padTop: true,
        borderBottom: 'double',
      },
    },
  );

  // t.duplicateColumn(1, 2);
  // t.getCellByIdAndCol('ASSET_CASH_AND_CASH_EQUIVALENTS', 2).value = 12324;
  // t.getCellByIdAndCol('ASSET_INVENTORY', 2).value = 33333;
  // t.getCellByIdAndCol('date-row', 2).value = '2021';

  return t;
}

export function normalizeStatementOfOps(t: AccountMap) {
  let ret = {
    opEx: {
      rAndD: t.get('INCOME_STATEMENT_RESEARCH_AND_DEVELOPMENT'),

      gAndA: addFP(
        t.get('INCOME_STATEMENT_G_AND_A'),
        t.get('INCOME_STATEMENT_SALES_AND_MARKETING'),
      ),
    },
    totalOpEx: 0, // computed
    lossFromOps: 0, // computed
    otherIncomeExpenseNet: {
      interestExpenseNet: t.get('INCOME_STATEMENT_INTEREST_EXPENSE'),
      otherIncomeNet: t.get('INCOME_STATEMENT_OTHER_INCOME'),
    },
    totalOtherIncomeExpenseNet: 0, // computed
    netLoss: 0, // computed
  };
  ret.totalOpEx = addFP(ret.opEx.rAndD, ret.opEx.gAndA);
  ret.lossFromOps = addFP(ret.totalOpEx * -1);
  ret.totalOtherIncomeExpenseNet = addFP(
    ret.otherIncomeExpenseNet.interestExpenseNet,
    ret.otherIncomeExpenseNet.otherIncomeNet,
  );
  ret.netLoss = addFP(ret.lossFromOps, ret.totalOtherIncomeExpenseNet);
  return ret;
}

export function buildPropertyAndEquipmentLives(data: AuditData) {
  let t = new Table();
  t.columns = [{}, { style: { align: 'right' } }];

  t.addRow(['Asset', 'Useful life (years)'], {
    style: {
      bold: true,
      borderBottom: 'thin',
    },
  });
  t.addRow(['Furniture and fixtures', '3']);
  t.addRow(['Machinery and equipment', '3 - 10']);
  t.addRow(['Leasehold improvements', 'Remaining life of the lease']);
  // row.cells[1].style = { align: 'right' };

  return t;
}

export async function buildPropertyAndEquipmentNet(
  data: AuditData,
): Promise<Table> {
  const assetCategoriesStr = data.trialBalance.fixedAssetCategories;
  let assetCategories: string[];
  try {
    // @ts-expect-error
    assetCategories = JSON.parse(assetCategoriesStr)?.categories;
  } catch (err) {
    assetCategories = [];
  }
  const accounts = (
    await getAccountsForCategory(data.auditId, 'ASSET_PROPERTY_AND_EQUIPMENT')
  ).map((a) => ({
    name: a.accountName,
    balance: a.balance,
  }));

  const assets = accounts.filter(
    (a) => a.name.toLowerCase().includes('accumulated depreciation') === false,
  );
  const out = groupFixedAccountsByCategories(assets, assetCategories);
  const totalAccumulatedDepreciation = accounts
    .filter((a) => a.name.toLowerCase().includes('accumulated depreciation'))
    .reduce((acc, a) => addFP(acc, a.balance), 0);

  let totalPropertyAndEquipment = 0;

  let t = new Table();
  t.columns = [{}, { style: { numFmt: 'accounting', align: 'right' } }];

  let row;
  row = t.addRow([data.fiscalYearEndNoYear, data.year], {
    style: {
      bold: true,
      borderBottom: 'thin',
    },
  });

  let currShown = false;
  Object.keys(out).forEach((category, idx) => {
    const value = out[category].reduce((acc, a) => addFP(acc, a.balance), 0);
    if (value === 0) {
      return;
    }
    totalPropertyAndEquipment = addFP(totalPropertyAndEquipment, value);
    const row = t.addRow([category, value], {
      style: {
        borderBottom: idx === assetCategories.length - 1 ? 'thin' : undefined,
      },
    });
    if (currShown) {
      row.cells[1].style = { hideCurrency: true };
    } else {
      currShown = true;
    }
  });

  t.addRow(['Total property and equipment', totalPropertyAndEquipment], {
    style: {
      borderTop: 'thin',
    },
  });
  t.addRow(['Less accumulated depreciation', totalAccumulatedDepreciation], {
    style: {
      borderBottom: 'thin',
    },
  });
  t.addRow(
    [
      'Property and equipment, net',
      addFP(totalPropertyAndEquipment, totalAccumulatedDepreciation),
    ],
    {
      style: {
        bold: true,
        borderBottom: 'double',
      },
    },
  );

  return t;
}

export async function buildFVMLiabilities(data: AuditData): Promise<Table> {
  let t = new Table();
  t.columns = [
    {},
    { style: { numFmt: 'currency' } },
    { style: { numFmt: 'currency' } },
    { style: { numFmt: 'currency' } },
  ];
  t.addRow(['', 'Level 1', 'Level 2', 'Level 3'], {
    style: {
      bold: true,
      borderBottom: 'thin',
    },
  });
  t.addRow(['Liabilities:', '', '', '']);
  let row;
  row = t.addRow(['Derivatives liability:', 123, 345, 343]);
  row.cells[0].style = { indent: true };
  return t;
}

export async function buildFVMLiabilities2(data: AuditData): Promise<Table> {
  let t = new Table();
  t.columns = [
    {},
    { style: { numFmt: 'currency' } },
    { style: { numFmt: 'currency' } },
  ];
  t.addRow(['', 'Issuance', `${data.fiscalYearEnd}`], {
    style: {
      bold: true,
      borderBottom: 'thin',
    },
  });
  t.addRow(['Term (years)', '', '']);
  t.addRow(['Discount rate', '', '']);
  t.addRow(['Probability of financing', '', ''], {
    style: { borderBottom: 'double' },
  });

  return t;
}

export async function buildStatementOfOperations(
  data: AuditData,
): Promise<Table> {
  const statementOfOps = normalizeStatementOfOps(data.totals);
  let t = new Table();
  t.columns = [{}, { style: { numFmt: 'accounting', align: 'right' } }];

  let row;
  row = t.addRow([`As of ${data.fiscalYearEndNoYear},`, data.year], {
    style: { bold: true, borderBottom: 'thin' },
  });
  t.addRow(['Operating expenses:', ''], {
    style: {
      padTop: true,
    },
  });

  let currShown = false;
  if (statementOfOps.opEx.rAndD !== 0) {
    row = t.addRow(['Research and development', statementOfOps.opEx.rAndD]);
    row.cells[0].style = { indent: true };
    currShown = true;
  }
  if (statementOfOps.opEx.gAndA !== 0) {
    row = t.addRow(['General and administrative', statementOfOps.opEx.gAndA]);
    row.cells[0].style = { indent: true };
    if (currShown) {
      row.cells[1].style = { hideCurrency: true };
    } else {
      currShown = true;
    }
  }
  row = t.addRow(['Total operating expenses', statementOfOps.totalOpEx], {
    style: {
      borderTop: 'thin',
    },
  });

  row = t.addRow(['Loss from operations', statementOfOps.lossFromOps]);
  row.cells[1].style = { hideCurrency: true };

  t.addRow(['Other income (expense), net:', ''], {
    style: {
      padTop: true,
    },
  });
  if (statementOfOps.otherIncomeExpenseNet.interestExpenseNet !== 0) {
    row = t.addRow([
      'Interest expense, net',
      statementOfOps.otherIncomeExpenseNet.interestExpenseNet,
    ]);
    row.cells[0].style = { indent: true };
    row.cells[1].style = { hideCurrency: true };
  }
  if (statementOfOps.otherIncomeExpenseNet.otherIncomeNet !== 0) {
    row = t.addRow([
      'Other income, net',
      statementOfOps.otherIncomeExpenseNet.otherIncomeNet,
    ]);
    row.cells[0].style = { indent: true };
    row.cells[1].style = { hideCurrency: true };
  }
  t.addRow(
    [
      'Total other income (expense), net',
      statementOfOps.totalOtherIncomeExpenseNet,
    ],
    {
      style: {
        borderTop: 'thin',
      },
    },
  );

  row = t.addRow(['Net loss', statementOfOps.netLoss], {
    style: {
      borderTop: 'thin',
      borderBottom: 'double',
    },
  });

  return t;
}

export async function buildConvertiblePreferredStock(
  data: AuditData,
): Promise<Table> {
  const certTransactionReport = await getCertificateTransactionDocumentData(
    data.auditId,
  );
  let t = new Table();
  t.columns = [
    {},
    { style: { numFmt: 'number' } },
    { style: { numFmt: 'number' } },
    { style: { numFmt: 'accounting' } },
    { style: { numFmt: 'accounting' } },
  ];
  t.addRow(
    [
      'Convertible Preferred Stock',
      'Shares Authorized',
      'Shares Issued and Outstanding',
      'Carrying Value',
      'Liquidation Preference',
    ],
    {
      style: {
        bold: true,
        borderBottom: 'double',
      },
      cellStyle: [{}, {}, {}, { align: 'right' }, { align: 'right' }],
    },
  );
  for (const row of certTransactionReport) {
    t.addRow([
      row.name,
      row.sharesAuthorized,
      row.sharesIssued,
      row.carryingValue,
      row.liquidationPreference,
    ]);
  }
  t.addRow(
    [
      'Total',
      certTransactionReport.reduce((acc, v) => acc + v.sharesAuthorized, 0),
      certTransactionReport.reduce((acc, v) => acc + v.sharesIssued, 0),
      addFP(...certTransactionReport.map((r) => r.carryingValue)),
      addFP(...certTransactionReport.map((r) => r.liquidationPreference)),
    ],
    {
      style: {
        bold: true,
        borderTop: 'thin',
        borderBottom: 'double',
      },
    },
  );
  return t;
}

export async function buildConvertibleToCommon(
  data: AuditData,
): Promise<Table> {
  const certTransactionReport = await getCertificateTransactionDocumentData(
    data.auditId,
  );
  let t = new Table();
  t.columns = [
    {},
    { style: { numFmt: 'accounting' } },
    { style: { numFmt: { type: 'currency', cents: true }, align: 'right' } },
    { style: { numFmt: 'number', align: 'right' } },
  ];
  t.addRow(
    ['', 'Original issue price', 'Conversion price', 'Ratio to common'],
    {
      style: {
        bold: true,
        borderBottom: 'double',
      },
      cellStyle: [{}, { align: 'right' }, { align: 'right' }, {}],
    },
  );

  const filtered = certTransactionReport.filter(
    (r) => r.name.match(/common/i) === null,
  );
  for (const row of filtered) {
    t.addRow([
      row.name,
      row.carryingValue,
      row.carryingValue / row.sharesIssued,
      row.sharesIssued / row.sharesAuthorized,
    ]);
  }

  return t;
}

export async function buildCommonStockReservedForFutureIssuance(
  data: AuditData,
): Promise<Table> {
  const certTransactionReport = await getCertificateTransactionDocumentData(
    data.auditId,
  );
  const sbcReport = await getSBCReportData(data.auditId);
  let t = new Table();
  t.columns = [{}, { style: { numFmt: 'number', align: 'right' } }];
  t.addRow([`As of ${data.fiscalYearEndNoYear},`, data.fiscalYearEndNoYear], {
    style: {
      bold: true,
      borderBottom: 'double',
    },
  });

  let total = 0;
  const numPreferred = certTransactionReport
    .filter((sheet) => !sheet.name.match(/common/i))
    .reduce((acc, sheet) => acc + sheet.sharesAuthorized, 0);

  t.addRow(['Convertible preferred stock', numPreferred]);
  total += numPreferred;

  const numCommonOutstanding = sbcReport ? sbcReport.commonOutstanding : 0;
  t.addRow(['Common stock options outstanding', numCommonOutstanding]);
  total += numCommonOutstanding;

  const numAuthorizedShares = data.equity.numAuthorizedShares
    ? Number(data.equity.numAuthorizedShares)
    : 0;
  t.addRow([
    'Common stock options available for future grant',
    numAuthorizedShares - numCommonOutstanding,
  ]);
  total += numAuthorizedShares - numCommonOutstanding;

  t.addRow(['Total', total], {
    style: {
      bold: true,
      borderTop: 'thin',
      borderBottom: 'double',
    },
  });

  return t;
}
