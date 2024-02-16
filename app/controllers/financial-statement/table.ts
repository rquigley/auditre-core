import {
  getAccountByFuzzyMatch,
  getAccountsForCategory,
} from '@/controllers/account-mapping';
import { groupFixedAccountsByCategories } from '@/lib/finance';
import { Table } from '@/lib/table';
import {
  getCertificateTransactionDocumentData,
  getSBCReportData,
} from '../equity';

import type { AuditData } from '../audit';

export const tableMap = {
  'balance-sheet': buildBalanceSheet,
  'income-statement': buildIncomeStatement,
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

export function buildBalanceSheet(data: AuditData) {
  const t = new Table('balance-sheet');
  t.columns = [
    {},
    { style: { numFmt: 'accounting', align: 'right' } },
    { style: { numFmt: 'accounting', align: 'right' } },
  ];

  t.addRow([`As of ${data.fiscalYearEndNoYear},`, data.year, data.prevYear], {
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
      `=TBLOOKUP('ASSET_CASH_AND_CASH_EQUIVALENTS', '${data.year}')`,
      `=TBLOOKUP('ASSET_CASH_AND_CASH_EQUIVALENTS', '${data.prevYear}')`,
    ],
    {
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
      `=TBLOOKUP('ASSET_INVENTORY', '${data.year}')`,
      `=TBLOOKUP('ASSET_INVENTORY', '${data.prevYear}')`,
    ],
    {
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
      `=TBLOOKUP('ASSET_PREPAID_EXPENSES', '${data.year}')`,
      `=TBLOOKUP('ASSET_PREPAID_EXPENSES', '${data.prevYear}')`,
    ],
    {
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
      `=TBLOOKUP('ASSET_CURRENT_OTHER', '${data.year}')`,
      `=TBLOOKUP('ASSET_CURRENT_OTHER', '${data.prevYear}')`,
    ],
    {
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
      `=SUMTAGCOL('total-current-assets', 1)`,
      `=SUMTAGCOL('total-current-assets', 2)`,
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
      `=TBLOOKUP('ASSET_PROPERTY_AND_EQUIPMENT', '${data.year}')`,
      `=TBLOOKUP('ASSET_PROPERTY_AND_EQUIPMENT', '${data.prevYear}')`,
    ],
    {
      tags: ['total-asset', 'hide-if-zero', 'hide-if-less-than-5-percent'],
      cellStyle: [{}, { hideCurrency: true }, { hideCurrency: true }],
    },
  );

  t.addRow(
    [
      'Intangible assets, net',
      `=TBLOOKUP('ASSET_INTANGIBLE_ASSETS', '${data.year}')`,
      `=TBLOOKUP('ASSET_INTANGIBLE_ASSETS', '${data.prevYear}')`,
    ],
    {
      tags: ['total-asset', 'hide-if-zero', 'hide-if-less-than-5-percent'],
      cellStyle: [{}, { hideCurrency: true }, { hideCurrency: true }],
    },
  );

  t.addRow(
    [
      'Operating lease right-of-use assets',
      `=TBLOOKUP('ASSET_OPERATING_LEASE_RIGHT_OF_USE', '${data.year}')`,
      `=TBLOOKUP('ASSET_OPERATING_LEASE_RIGHT_OF_USE', '${data.prevYear}')`,
    ],
    {
      tags: ['total-asset', 'hide-if-zero', 'hide-if-less-than-5-percent'],
      cellStyle: [{}, { hideCurrency: true }, { hideCurrency: true }],
    },
  );

  t.addRow(
    [
      'Other assets',
      `=TBLOOKUP('ASSET_OTHER', '${data.year}')`,
      `=TBLOOKUP('ASSET_OTHER', '${data.prevYear}')`,
    ],
    {
      tags: ['total-asset', 'hide-if-zero', 'hide-if-less-than-5-percent'],
      cellStyle: [{}, { hideCurrency: true }, { hideCurrency: true }],
    },
  );

  t.addRow(
    [
      'Total assets',
      `=SUMTAGCOL('total-asset', 1)`,
      `=SUMTAGCOL('total-asset', 2)`,
    ],
    {
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
      `=TBLOOKUP('LIABILITY_ACCOUNTS_PAYABLE', '${data.year}')`,
      `=TBLOOKUP('LIABILITY_ACCOUNTS_PAYABLE', '${data.prevYear}')`,
    ],
    {
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
      `=TBLOOKUP('LIABILITY_ACCRUED_LIABILITIES', '${data.year}')`,
      `=TBLOOKUP('LIABILITY_ACCRUED_LIABILITIES', '${data.prevYear}')`,
    ],
    {
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
      `=TBLOOKUP('LIABILITY_DEFERRED_REVENUE', '${data.year}')`,
      `=TBLOOKUP('LIABILITY_DEFERRED_REVENUE', '${data.prevYear}')`,
    ],
    {
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
      `=TBLOOKUP('LIABILITY_OPERATING_LEASE_LIABILITIES_CURRENT', '${data.year}')`,
      `=TBLOOKUP('LIABILITY_OPERATING_LEASE_LIABILITIES_CURRENT', '${data.prevYear}')`,
    ],
    {
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
      'Other',
      `=TBLOOKUP('LIABILITY_OTHER', '${data.year}')`,
      `=TBLOOKUP('LIABILITY_OTHER', '${data.prevYear}')`,
    ],
    {
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
      `=SUMTAGCOL('total-current-liabilities', 1)`,
      `=SUMTAGCOL('total-current-liabilities', 2)`,
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
      `=TBLOOKUP('LIABILITY_ACCRUED_INTEREST', '${data.year}')`,
      `=TBLOOKUP('LIABILITY_ACCRUED_INTEREST', '${data.prevYear}')`,
    ],
    {
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
      `=TBLOOKUP('LIABILITY_CONVERTIBLE_NOTES_PAYABLE', '${data.year}')`,
      `=TBLOOKUP('LIABILITY_CONVERTIBLE_NOTES_PAYABLE', '${data.prevYear}')`,
    ],
    {
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
      'Debt',
      `=TBLOOKUP('LIABILITY_DEBT', '${data.year}')`,
      `=TBLOOKUP('LIABILITY_DEBT', '${data.prevYear}')`,
    ],
    {
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
      `=TBLOOKUP('LIABILITY_OPERATING_LEASE_LIABILITIES_NET_OF_CURRENT_PORTION', '${data.year}')`,
      `=TBLOOKUP('LIABILITY_OPERATING_LEASE_LIABILITIES_NET_OF_CURRENT_PORTION', '${data.prevYear}')`,
    ],
    {
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
      `=SUMTAGCOL('total-liabilities', 1)`,
      `=SUMTAGCOL('total-liabilities', 2)`,
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
      `=TBLOOKUP('EQUITY_PREFERRED_STOCK', '${data.year}')`,
      `=TBLOOKUP('EQUITY_PREFERRED_STOCK', '${data.prevYear}')`,
    ],
    {
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
      `=TBLOOKUP('EQUITY_COMMON_STOCK', '${data.year}')`,
      `=TBLOOKUP('EQUITY_COMMON_STOCK', '${data.prevYear}')`,
    ],
    {
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
      `=TBLOOKUP('EQUITY_PAID_IN_CAPITAL', '${data.year}')`,
      `=TBLOOKUP('EQUITY_PAID_IN_CAPITAL', '${data.prevYear}')`,
    ],
    {
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
      `=TBLOOKUP('EQUITY_RETAINED_EARNINGS', '${data.year}')`,
      `=TBLOOKUP('EQUITY_RETAINED_EARNINGS', '${data.prevYear}')`,
    ],
    {
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
      `=TBLOOKUP('EQUITY_ACCUMULATED_DEFICIT', '${data.year}')`,
      `=TBLOOKUP('EQUITY_ACCUMULATED_DEFICIT', '${data.prevYear}')`,
    ],
    {
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
      `=SUMTAGCOL('total-equity', 1)`,
      `=SUMTAGCOL('total-equity', 2)`,
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
      `=SUMTAGCOL('total-liabilities-and-stockholders-deficit', 1)`,
      `=SUMTAGCOL('total-liabilities-and-stockholders-deficit', 2)`,
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
  const t = new Table('property-and-equipment-lives');
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
  const assetCategoriesStr = data.rt.trialBalance.fixedAssetCategories;
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
    .reduce((acc, a) => acc + a.balance, 0);

  let totalPropertyAndEquipment = 0;

  const t = new Table('property-and-equipment-net');
  t.columns = [{}, { style: { numFmt: 'accounting', align: 'right' } }];

  t.addRow([data.fiscalYearEndNoYear, data.year], {
    style: {
      bold: true,
      borderBottom: 'thin',
    },
  });

  let currShown = false;
  Object.keys(out).forEach((category, idx) => {
    const value = out[category].reduce((acc, a) => acc + a.balance, 0);
    if (value === 0) {
      return;
    }
    totalPropertyAndEquipment = totalPropertyAndEquipment + value;
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
      totalPropertyAndEquipment + totalAccumulatedDepreciation,
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
  const t = new Table('fvm-liabilities');
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
  const t = new Table('fvm-liabilities2');
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

export function buildIncomeStatement(data: {
  year: string;
  prevYear: string;
  fiscalYearEndNoYear: string;
}) {
  const t = new Table('income-statement');
  t.columns = [
    {},
    { style: { numFmt: 'accounting', align: 'right' } },
    { style: { numFmt: 'accounting', align: 'right' } },
  ];

  t.addRow([`As of ${data.fiscalYearEndNoYear},`, data.year, data.prevYear], {
    style: { bold: true, borderBottom: 'thin' },
  });

  t.addRow(
    [
      'Revenue',
      `=-TBLOOKUP('INCOME_STATEMENT_REVENUE', '${data.year}')`,
      `=-TBLOOKUP('INCOME_STATEMENT_REVENUE', '${data.prevYear}')`,
    ],
    {
      id: 'REVENUE',
      tags: ['hide-if-zero'],
    },
  );
  t.addRow(
    [
      'Cost of revenue',
      `=-TBLOOKUP('INCOME_STATEMENT_COST_OF_REVENUE', '${data.year}')`,
      `=-TBLOOKUP('INCOME_STATEMENT_COST_OF_REVENUE', '${data.prevYear}')`,
    ],
    {
      id: 'COST-OF-REVENUE',
      tags: ['hide-if-zero'],
    },
  );
  t.addRow(
    [
      'Gross profit',
      `=GET_BY_ID('REVENUE', 1) - GET_BY_ID('COST-OF-REVENUE', 1)`,
      `=GET_BY_ID('REVENUE', 2) - GET_BY_ID('COST-OF-REVENUE', 2)`,
    ],
    {
      tags: ['total-gross-profit', 'hide-if-zero'],
    },
  );

  t.addRow(['Operating expenses:', '', ''], {
    style: {
      padTop: true,
    },
  });

  t.addRow(
    [
      'Research and development',
      `=TBLOOKUP('INCOME_STATEMENT_RESEARCH_AND_DEVELOPMENT', '${data.year}')`,
      `=TBLOOKUP('INCOME_STATEMENT_RESEARCH_AND_DEVELOPMENT', '${data.prevYear}')`,
    ],
    {
      tags: ['total-operating-expenses', 'hide-if-zero'],
      cellStyle: [{ indent: 1 }],
    },
  );

  t.addRow(
    [
      'General and administrative',
      `=TBLOOKUP('INCOME_STATEMENT_G_AND_A', '${data.year}') + TBLOOKUP('INCOME_STATEMENT_SALES_AND_MARKETING', '${data.year}')`,
      `=TBLOOKUP('INCOME_STATEMENT_G_AND_A', '${data.prevYear}') + TBLOOKUP('INCOME_STATEMENT_SALES_AND_MARKETING', '${data.prevYear}')`,
    ],
    {
      tags: ['total-operating-expenses', 'hide-if-zero'],
      cellStyle: [{ indent: 1 }],
    },
  );

  t.addRow(
    [
      'Total operating expenses',
      `=SUMTAGCOL('total-operating-expenses', 1)`,
      `=SUMTAGCOL('total-operating-expenses', 2)`,
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
      `=-SUMTAGCOL('total-opex', 1)`,
      `=-SUMTAGCOL('total-opex', 2)`,
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
      `=-(TBLOOKUP('INCOME_STATEMENT_INTEREST_EXPENSE', '${data.year}') + TBLOOKUP('INCOME_STATEMENT_INTEREST_INCOME', '${data.year}'))`,
      `=-(TBLOOKUP('INCOME_STATEMENT_INTEREST_EXPENSE', '${data.prevYear}') + TBLOOKUP('INCOME_STATEMENT_INTEREST_INCOME', '${data.prevYear}'))`,
    ],
    {
      tags: ['total-other-income-expense-net', 'hide-if-zero'],
      cellStyle: [{ indent: 1 }],
    },
  );
  t.addRow(
    [
      'Other income, net',
      `=-TBLOOKUP('INCOME_STATEMENT_OTHER_INCOME', '${data.year}')`,
      `=-TBLOOKUP('INCOME_STATEMENT_OTHER_INCOME', '${data.prevYear}')`,
    ],
    {
      tags: ['total-other-income-expense-net', 'hide-if-zero'],
      cellStyle: [{ indent: 1 }],
    },
  );
  t.addRow(
    [
      'Total other income (expense), net',
      `=SUMTAGCOL('total-other-income-expense-net', 1)`,
      `=SUMTAGCOL('total-other-income-expense-net', 2)`,
    ],
    {
      tags: ['total-other-income-expense-net-total', 'net-loss'],
      style: {
        borderTop: 'thin',
      },
    },
  );

  t.addRow(
    ['Net loss', `=SUMTAGCOL('net-loss', 1)`, `=SUMTAGCOL('net-loss', 2)`],
    {
      id: 'NET-LOSS',
      style: {
        borderTop: 'thin',
        borderBottom: 'double',
      },
      cellNames: [
        '',
        `IS_NET_LOSS_${data.year}`,
        `IS_NET_LOSS_${data.prevYear}`,
      ],
    },
  );

  return t;
}

export async function buildCashFlows(data: AuditData) {
  const year2 = String(Number(data.year) - 1);
  // const totals = data.totals;
  // const totalsPrev = await getBalancesByAccountType(data.auditId, year2);

  const t = new Table('cash-flows');
  t.columns = [
    {},
    { style: { numFmt: 'accounting', align: 'right' } },
    { style: { numFmt: 'accounting', align: 'right' } },
  ];

  t.addRow([`As of ${data.fiscalYearEndNoYear},`, data.year, year2], {
    style: { bold: true, borderBottom: 'thin' },
  });
  t.addRow(['Operating expenses:', '', ''], {
    style: {
      padTop: true,
    },
  });

  t.addRow(['Cash flows from operating activities:', '', ''], {
    style: {
      bold: true,
    },
  });

  const incomeStatementTable = await buildIncomeStatement(data);
  const netLossRow = incomeStatementTable.getRowById('NET-LOSS');
  t.addRow(
    ['Net income:', netLossRow.cells[1]?.value, netLossRow.cells[2]?.value],
    {
      style: {
        indent: 1,
      },
    },
  );
  t.addRow(
    [
      'Adjustments to reconcile net loss to net cash used in operating activities:',
      '',
      '',
    ],
    {
      style: {
        indent: 2,
      },
    },
  );

  const stockComp = await getAccountByFuzzyMatch(
    data.auditId,
    data.year,
    'INCOME_STATEMENT',
    'stock based compensation',
  );
  const stockCompPrev = await getAccountByFuzzyMatch(
    data.auditId,
    year2,
    'INCOME_STATEMENT',
    'stock based compensation',
  );
  t.addRow(
    [
      'Stock-based compensation expense',
      stockComp ? stockComp.balance : 0,
      stockCompPrev ? stockCompPrev.balance : 0,
    ],
    {
      tags: [],
      cellStyle: [{ indent: 3 }],
    },
  );

  return t;
}

export async function buildConvertiblePreferredStock(data: AuditData) {
  const certTransactionReport = await getCertificateTransactionDocumentData(
    data.auditId,
  );
  const t = new Table('convertible-preferred-stock');
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
      certTransactionReport.reduce((acc, v) => acc + v.carryingValue, 0),
      certTransactionReport.reduce(
        (acc, v) => acc + v.liquidationPreference,
        0,
      ),
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
  const t = new Table('convertible-preferred-to-common');
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
  const t = new Table('common-stock-reserved-for-future-issuance');
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

  const numAuthorizedShares = data.rt.equity.numAuthorizedShares
    ? Number(data.rt.equity.numAuthorizedShares)
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
  const t = new Table('income-taxes');
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
