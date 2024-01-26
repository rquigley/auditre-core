import {
  getAccountsForCategory,
  getBalancesByAccountType,
} from '@/controllers/account-mapping';
import { groupFixedAccountsByCategories } from '@/lib/finance';
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
  'income-taxes': buildIncomeTaxes,
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

export async function buildBalanceSheet(data: AuditData) {
  const totals = data.totals;
  const year2 = String(Number(data.year) - 1);
  const totals2 = await getBalancesByAccountType(data.auditId, year2);

  const t = new Table();
  t.columns = [
    {},
    { style: { numFmt: 'accounting', align: 'right' } },
    { style: { numFmt: 'accounting', align: 'right' } },
  ];

  t.addRow([`As of ${data.fiscalYearEndNoYear},`, data.year, year2], {
    id: 'date-row', // -- TODO, what is this???
    style: { bold: true, borderBottom: 'thin' },
  });

  t.addRow(['Assets', '', ''], {
    style: {
      bold: true,
      borderBottom: 'thin',
      padTop: true,
    },
  });
  t.addRow(['Current assets:', '', ''], {
    style: { padTop: true },
  });

  // TODO: Add accounting norm to hide if < 5% TOTAL
  t.addRow(
    [
      'Cash',
      totals.get('ASSET_CASH_AND_CASH_EQUIVALENTS'),
      totals2.get('ASSET_CASH_AND_CASH_EQUIVALENTS'),
    ],
    {
      id: 'ASSET_CASH_AND_CASH_EQUIVALENTS',
      tags: [
        'total-current-assets',
        'hide-if-zero',
        'hide-if-less-than-5-percent',
      ],
      cellStyle: [{ indent: 1 }],
    },
  );

  t.addRow(
    [
      'Inventory',
      totals.get('ASSET_INVENTORY'),
      totals2.get('ASSET_INVENTORY'),
    ],
    {
      id: 'ASSET_INVENTORY',
      tags: [
        'total-current-assets',
        'hide-if-zero',
        'hide-if-less-than-5-percent',
      ],
      cellStyle: [
        { indent: 1 },
        { hideCurrency: true },
        { hideCurrency: true },
      ],
    },
  );

  t.addRow(
    [
      'Prepaid expenses',
      totals.get('ASSET_PREPAID_EXPENSES'),
      totals2.get('ASSET_PREPAID_EXPENSES'),
    ],
    {
      id: 'ASSET_PREPAID_EXPENSES',
      tags: [
        'total-current-assets',
        'hide-if-zero',
        'hide-if-less-than-5-percent',
      ],
      cellStyle: [
        { indent: 1 },
        { hideCurrency: true },
        { hideCurrency: true },
      ],
    },
  );

  t.addRow(
    [
      'Prepaid expenses and other current assets',
      totals.get('ASSET_CURRENT_OTHER'),
      totals2.get('ASSET_CURRENT_OTHER'),
    ],
    {
      id: 'ASSET_CURRENT_OTHER',
      tags: [
        'total-current-assets',
        'hide-if-zero',
        'hide-if-less-than-5-percent',
      ],
      cellStyle: [
        { indent: 1 },
        { hideCurrency: true },
        { hideCurrency: true },
      ],
    },
  );

  t.addRow(
    [
      'Total current assets',
      { operation: 'addColumnCellsByTag', args: ['total-current-assets'] },
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
    [
      'Property and equipment, net',
      totals.get('ASSET_PROPERTY_AND_EQUIPMENT'),
      totals2.get('ASSET_PROPERTY_AND_EQUIPMENT'),
    ],
    {
      id: 'ASSET_PROPERTY_AND_EQUIPMENT',
      tags: ['total-asset', 'hide-if-zero', 'hide-if-less-than-5-percent'],
      cellStyle: [{}, { hideCurrency: true }, { hideCurrency: true }],
    },
  );

  t.addRow(
    [
      'Intangible assets, net',
      totals.get('ASSET_INTANGIBLE_ASSETS'),
      totals2.get('ASSET_INTANGIBLE_ASSETS'),
    ],
    {
      id: 'ASSET_INTANGIBLE_ASSETS',
      tags: ['total-asset', 'hide-if-zero', 'hide-if-less-than-5-percent'],
      cellStyle: [{}, { hideCurrency: true }, { hideCurrency: true }],
    },
  );

  t.addRow(
    [
      'Operating lease right-of-use assets',
      totals.get('ASSET_OPERATING_LEASE_RIGHT_OF_USE'),
      totals2.get('ASSET_OPERATING_LEASE_RIGHT_OF_USE'),
    ],
    {
      id: 'ASSET_OPERATING_LEASE_RIGHT_OF_USE',
      tags: ['total-asset', 'hide-if-zero', 'hide-if-less-than-5-percent'],
      cellStyle: [{}, { hideCurrency: true }, { hideCurrency: true }],
    },
  );

  t.addRow(
    ['Other assets', totals.get('ASSET_OTHER'), totals2.get('ASSET_OTHER')],
    {
      id: 'ASSET_OTHER',
      tags: ['total-asset', 'hide-if-zero', 'hide-if-less-than-5-percent'],
      cellStyle: [{}, { hideCurrency: true }, { hideCurrency: true }],
    },
  );

  t.addRow(
    [
      'Total assets',
      { operation: 'addColumnCellsByTag', args: ['total-asset'] },
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

  t.addRow(['Liabilities and Stockholders’ Deficit', '', ''], {
    style: {
      bold: true,
      padTop: true,
    },
  });
  t.addRow(['Current liabilities:', '', ''], {
    style: {
      padTop: true,
    },
  });

  t.addRow(
    [
      'Accounts payable',
      totals.get('LIABILITY_ACCOUNTS_PAYABLE'),
      totals2.get('LIABILITY_ACCOUNTS_PAYABLE'),
    ],
    {
      id: 'LIABILITY_ACCOUNTS_PAYABLE',
      tags: [
        'total-current-liabilities',
        'hide-if-zero',
        'hide-if-less-than-5-percent',
      ],
      cellStyle: [
        { indent: 1 },
        { hideCurrency: true },
        { hideCurrency: true },
      ],
    },
  );
  t.addRow(
    [
      'Accrued liabilities',
      totals.get('LIABILITY_ACCRUED_LIABILITIES'),
      totals2.get('LIABILITY_ACCRUED_LIABILITIES'),
    ],
    {
      id: 'LIABILITY_ACCRUED_LIABILITIES',
      tags: [
        'total-current-liabilities',
        'hide-if-zero',
        'hide-if-less-than-5-percent',
      ],
      cellStyle: [
        { indent: 1 },
        { hideCurrency: true },
        { hideCurrency: true },
      ],
    },
  );
  t.addRow(
    [
      'Deferred revenue',
      totals.get('LIABILITY_DEFERRED_REVENUE'),
      totals2.get('LIABILITY_DEFERRED_REVENUE'),
    ],
    {
      id: 'LIABILITY_DEFERRED_REVENUE',
      tags: [
        'total-current-liabilities',
        'hide-if-zero',
        'hide-if-less-than-5-percent',
      ],
      cellStyle: [
        { indent: 1 },
        { hideCurrency: true },
        { hideCurrency: true },
      ],
    },
  );
  t.addRow(
    [
      'Operating lease liabilities, current',
      totals.get('LIABILITY_OPERATING_LEASE_LIABILITIES_CURRENT'),
      totals2.get('LIABILITY_OPERATING_LEASE_LIABILITIES_CURRENT'),
    ],
    {
      id: 'LIABILITY_OPERATING_LEASE_LIABILITIES_CURRENT',
      tags: [
        'total-current-liabilities',
        'hide-if-zero',
        'hide-if-less-than-5-percent',
      ],
      cellStyle: [
        { indent: 1 },
        { hideCurrency: true },
        { hideCurrency: true },
      ],
    },
  );
  t.addRow(
    ['Other', totals.get('LIABILITY_OTHER'), totals2.get('LIABILITY_OTHER')],
    {
      id: 'LIABILITY_OTHER',
      tags: [
        'total-current-liabilities',
        'hide-if-zero',
        'hide-if-less-than-5-percent',
      ],
      cellStyle: [
        { indent: 1 },
        { hideCurrency: true },
        { hideCurrency: true },
      ],
    },
  );

  t.addRow(
    [
      'Total current liabilities',
      { operation: 'addColumnCellsByTag', args: ['total-current-liabilities'] },
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

  t.addRow(
    [
      'Accrued interest',
      totals.get('LIABILITY_ACCRUED_INTEREST'),
      totals2.get('LIABILITY_ACCRUED_INTEREST'),
    ],
    {
      id: 'LIABILITY_ACCRUED_INTEREST',
      tags: [
        'total-liabilities',
        'hide-if-zero',
        'hide-if-less-than-5-percent',
      ],
      cellStyle: [{}, { hideCurrency: true }, { hideCurrency: true }],
    },
  );

  t.addRow(
    [
      'Convertible notes payable',
      totals.get('LIABILITY_CONVERTIBLE_NOTES_PAYABLE'),
      totals2.get('LIABILITY_CONVERTIBLE_NOTES_PAYABLE'),
    ],
    {
      id: 'LIABILITY_CONVERTIBLE_NOTES_PAYABLE',
      tags: [
        'total-liabilities',
        'hide-if-zero',
        'hide-if-less-than-5-percent',
      ],
      cellStyle: [{}, { hideCurrency: true }, { hideCurrency: true }],
    },
  );

  t.addRow(
    ['Debt', totals.get('LIABILITY_DEBT'), totals2.get('LIABILITY_DEBT')],
    {
      id: 'LIABILITY_DEBT',
      tags: [
        'total-liabilities',
        'hide-if-zero',
        'hide-if-less-than-5-percent',
      ],
      cellStyle: [{}, { hideCurrency: true }, { hideCurrency: true }],
    },
  );

  t.addRow(
    [
      'Operating lease liabilities, net of current portion',
      totals.get(
        'LIABILITY_OPERATING_LEASE_LIABILITIES_NET_OF_CURRENT_PORTION',
      ),
      totals2.get(
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
      cellStyle: [{}, { hideCurrency: true }, { hideCurrency: true }],
    },
  );
  t.addRow(
    [
      'Total liabilities',
      { operation: 'addColumnCellsByTag', args: ['total-liabilities'] },
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
  t.addRow(['Stockholders’ deficit:', '', ''], {
    style: {
      padTop: true,
    },
  });

  t.addRow(
    [
      'Preferred stock',
      totals.get('EQUITY_PREFERRED_STOCK'),
      totals2.get('EQUITY_PREFERRED_STOCK'),
    ],
    {
      id: 'EQUITY_PREFERRED_STOCK',
      tags: ['total-equity', 'hide-if-zero', 'hide-if-less-than-5-percent'],
      cellStyle: [
        { indent: 1 },
        { hideCurrency: true },
        { hideCurrency: true },
      ],
    },
  );
  t.addRow(
    [
      'Common stock',
      totals.get('EQUITY_COMMON_STOCK'),
      totals2.get('EQUITY_COMMON_STOCK'),
    ],
    {
      id: 'EQUITY_COMMON_STOCK',
      tags: ['total-equity', 'hide-if-zero', 'hide-if-less-than-5-percent'],
      cellStyle: [
        { indent: 1 },
        { hideCurrency: true },
        { hideCurrency: true },
      ],
    },
  );
  t.addRow(
    [
      'Paid-in capital',
      totals.get('EQUITY_PAID_IN_CAPITAL'),
      totals2.get('EQUITY_PAID_IN_CAPITAL'),
    ],
    {
      id: 'EQUITY_PAID_IN_CAPITAL',
      tags: ['total-equity', 'hide-if-zero', 'hide-if-less-than-5-percent'],
      cellStyle: [
        { indent: 1 },
        { hideCurrency: true },
        { hideCurrency: true },
      ],
    },
  );
  t.addRow(
    [
      'Retained earnings',
      totals.get('EQUITY_RETAINED_EARNINGS'),
      totals2.get('EQUITY_RETAINED_EARNINGS'),
    ],
    {
      id: 'EQUITY_RETAINED_EARNINGS',
      tags: ['total-equity', 'hide-if-zero', 'hide-if-less-than-5-percent'],
      cellStyle: [
        { indent: 1 },
        { hideCurrency: true },
        { hideCurrency: true },
      ],
    },
  );
  t.addRow(
    [
      'Accumulated deficit',
      totals.get('EQUITY_ACCUMULATED_DEFICIT'),
      totals2.get('EQUITY_ACCUMULATED_DEFICIT'),
    ],
    {
      id: 'EQUITY_ACCUMULATED_DEFICIT',
      tags: ['total-equity', 'hide-if-zero', 'hide-if-less-than-5-percent'],
      cellStyle: [
        { indent: 1 },
        { hideCurrency: true },
        { hideCurrency: true },
      ],
    },
  );

  t.addRow(
    [
      'Total stockholders’ deficit',
      {
        operation: 'addColumnCellsByTag',
        args: ['total-equity'],
      },
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

  return t;
}

export function buildPropertyAndEquipmentLives(_data: AuditData) {
  const t = new Table();
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

export async function buildPropertyAndEquipmentNet(data: AuditData) {
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

  const t = new Table();
  t.columns = [{}, { style: { numFmt: 'accounting', align: 'right' } }];

  t.addRow([data.fiscalYearEndNoYear, data.year], {
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

export async function buildFVMLiabilities(_data: AuditData) {
  const t = new Table();
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
  const row = t.addRow(['Derivatives liability:', 'TODO', 'TODO', 'TODO']);
  row.cells[0].style = { indent: 1 };
  return t;
}

export async function buildFVMLiabilities2(data: AuditData) {
  const t = new Table();
  t.columns = [
    {},
    { style: { numFmt: 'currency' } },
    { style: { numFmt: 'currency' } },
  ];
  t.addRow(['', 'Issuance', data.fiscalYearEnd], {
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

export async function buildStatementOfOperations(data: AuditData) {
  const yearPrev = String(Number(data.year) - 1);
  const totals = data.totals;
  const totalsPrev = await getBalancesByAccountType(data.auditId, yearPrev);

  const t = new Table();
  t.columns = [
    {},
    { style: { numFmt: 'accounting', align: 'right' } },
    { style: { numFmt: 'accounting', align: 'right' } },
  ];

  t.addRow([`As of ${data.fiscalYearEndNoYear},`, data.year, yearPrev], {
    style: { bold: true, borderBottom: 'thin' },
  });
  t.addRow(['Operating expenses:', '', ''], {
    style: {
      padTop: true,
    },
  });

  t.addRow(
    [
      'Research and development',
      totals.get('INCOME_STATEMENT_RESEARCH_AND_DEVELOPMENT'),
      totalsPrev.get('INCOME_STATEMENT_RESEARCH_AND_DEVELOPMENT'),
    ],
    {
      tags: ['total-operating-expenses', 'hide-if-zero'],
      cellStyle: [{ indent: 1 }],
    },
  );

  t.addRow(
    [
      'General and administrative',
      addFP(
        totals.get('INCOME_STATEMENT_G_AND_A'),
        totals.get('INCOME_STATEMENT_SALES_AND_MARKETING'),
      ),
      addFP(
        totalsPrev.get('INCOME_STATEMENT_G_AND_A'),
        totalsPrev.get('INCOME_STATEMENT_SALES_AND_MARKETING'),
      ),
    ],
    {
      tags: ['total-operating-expenses', 'hide-if-zero'],
      cellStyle: [{ indent: 1 }],
    },
  );

  t.addRow(
    [
      'Total operating expenses',
      { operation: 'addColumnCellsByTag', args: ['total-operating-expenses'] },
      { operation: 'addColumnCellsByTag', args: ['total-operating-expenses'] },
    ],
    {
      tags: ['total-opex'],
      style: {
        borderTop: 'thin',
      },
    },
  );
  t.addRow(
    [
      'Loss from operations',
      { operation: 'multiplyCellTag', args: ['total-opex', -1] },
      { operation: 'multiplyCellTag', args: ['total-opex', -1] },
    ],
    {
      tags: ['net-loss'],
    },
  );

  t.addRow(['Other income (expense), net:', '', ''], {
    style: {
      padTop: true,
    },
  });
  t.addRow(
    [
      'Interest expense, net',
      totals.get('INCOME_STATEMENT_INTEREST_EXPENSE'),
      totalsPrev.get('INCOME_STATEMENT_INTEREST_EXPENSE'),
    ],
    {
      tags: ['total-other-income-expense-net', 'hide-if-zero'],
      cellStyle: [{ indent: 1 }],
    },
  );
  t.addRow(
    [
      'Other income, net',
      totals.get('INCOME_STATEMENT_OTHER_INCOME'),
      totalsPrev.get('INCOME_STATEMENT_OTHER_INCOME'),
    ],
    {
      tags: ['total-other-income-expense-net', 'hide-if-zero'],
      cellStyle: [{ indent: 1 }],
    },
  );
  t.addRow(
    [
      'Total other income (expense), net',
      {
        operation: 'addColumnCellsByTag',
        args: ['total-other-income-expense-net'],
      },
      {
        operation: 'addColumnCellsByTag',
        args: ['total-other-income-expense-net'],
      },
    ],
    {
      tags: ['total-other-income-expense-net-total', 'net-loss'],
      style: {
        borderTop: 'thin',
      },
    },
  );

  t.addRow(
    [
      'Net loss',
      {
        operation: 'addColumnCellsByTag',
        args: ['net-loss'],
      },
      {
        operation: 'addColumnCellsByTag',
        args: ['net-loss'],
      },
    ],
    {
      style: {
        borderTop: 'thin',
        borderBottom: 'double',
      },
    },
  );

  return t;
}

export async function buildConvertiblePreferredStock(data: AuditData) {
  const certTransactionReport = await getCertificateTransactionDocumentData(
    data.auditId,
  );
  const t = new Table();
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

export async function buildConvertibleToCommon(data: AuditData) {
  const certTransactionReport = await getCertificateTransactionDocumentData(
    data.auditId,
  );
  const t = new Table();
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
) {
  const certTransactionReport = await getCertificateTransactionDocumentData(
    data.auditId,
  );
  const sbcReport = await getSBCReportData(data.auditId);
  const t = new Table();
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

export async function buildIncomeTaxes(data: AuditData) {
  const t = new Table();
  t.columns = [
    {},
    { style: { numFmt: 'currency' } },
    { style: { numFmt: 'currency' } },
  ];
  t.addRow([data.fiscalYearEnd, data.year], {
    style: {
      bold: true,
      borderBottom: 'thin',
    },
  });
  t.addRow(['Deferred tax assets', 0]);
  t.addRow(['Net operating loss carry forwards', 0]);
  t.addRow(['Reserves and accruals', 0]);
  t.addRow(['Fixes assets', 0]);
  t.addRow(['Other', 0]);

  t.addRow(['Gross deferred tax assets', 0], {
    style: { borderTop: 'thin' },
  });
  t.addRow(['Valuation allowance', 0], {
    style: { borderTop: 'thin' },
  });
  t.addRow(['Deferred tax assets, net', 0], {
    style: { bold: true, borderTop: 'thin', borderBottom: 'double' },
  });

  return t;
}
