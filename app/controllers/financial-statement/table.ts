import dayjs from 'dayjs';

import { getAccountsForCategory } from '@/controllers/account-mapping';
import { fIn, groupFixedAccountsByCategories } from '@/lib/finance';
import { Table } from '@/lib/table';
import {
  getCertificateTransactionDocumentData,
  getSBCReportData,
  getSOEData,
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

const nonCashCurrentAssetTypes = [
  { key: 'ASSET_ACCOUNTS_RECEIVABLE', label: 'Accounts receivable' },
  { key: 'ASSET_INVENTORY', label: 'Inventory' },
  { key: 'ASSET_PREPAID_EXPENSES', label: 'Prepaid expenses' },
  {
    key: 'ASSET_CURRENT_OTHER',
    label: 'Other current assets',
  },
];

const otherAssetTypes = [
  {
    key: 'ASSET_PROPERTY_AND_EQUIPMENT',
    label: 'Property and equipment, net',
  },
  { key: 'ASSET_INTANGIBLE_ASSETS', label: 'Intangible assets, net' },
  {
    key: 'ASSET_OPERATING_LEASE_RIGHT_OF_USE',
    label: 'Operating lease right-of-use assets',
  },
  { key: 'ASSET_OTHER', label: 'Other assets' },
];

const liabilityTypes = [
  { key: 'LIABILITY_ACCOUNTS_PAYABLE', label: 'Accounts payable' },
  { key: 'LIABILITY_ACCRUED_LIABILITIES', label: 'Accrued liabilities' },
  { key: 'LIABILITY_DEBT_SHORT', label: 'Short term debt' },
  { key: 'LIABILITY_DEFERRED_REVENUE', label: 'Deferred revenue' },
  {
    key: 'LIABILITY_OPERATING_LEASE_LIABILITIES_CURRENT',
    label: 'Operating lease liabilities, current',
  },
  { key: 'LIABILITY_OTHER', label: 'Other' },
];

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
      `=TBLOOKUP('ASSET_CASH_AND_CASH_EQUIVALENTS', 'CY')`,
      `=TBLOOKUP('ASSET_CASH_AND_CASH_EQUIVALENTS', 'PY')`,
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

  nonCashCurrentAssetTypes.forEach((assetType) => {
    t.addRow(
      [
        assetType.label,
        `=TBLOOKUP('${assetType.key}', 'CY')`,
        `=TBLOOKUP('${assetType.key}', 'PY')`,
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
  });

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

  otherAssetTypes.forEach((assetType) => {
    t.addRow(
      [
        assetType.label,
        `=TBLOOKUP('${assetType.key}', 'CY')`,
        `=TBLOOKUP('${assetType.key}', 'PY')`,
      ],
      {
        tags: ['total-asset', 'hide-if-zero', 'hide-if-less-than-5-percent'],
        cellStyle: [{}, { hideCurrency: true }, { hideCurrency: true }],
      },
    );
  });

  t.addRow(
    [
      'Total assets',
      `=SUMTAGCOL('total-asset', 1)`,
      `=SUMTAGCOL('total-asset', 2)`,
    ],
    {
      id: 'TOTAL-ASSETS',
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

  liabilityTypes.forEach((liabilityType) => {
    t.addRow(
      [
        liabilityType.label,
        `=TBLOOKUP('${liabilityType.key}', 'CY')`,
        `=TBLOOKUP('${liabilityType.key}', 'PY')`,
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
  });

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
      `=TBLOOKUP('LIABILITY_ACCRUED_INTEREST', 'CY')`,
      `=TBLOOKUP('LIABILITY_ACCRUED_INTEREST', 'PY')`,
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
      `=TBLOOKUP('LIABILITY_CONVERTIBLE_NOTES_PAYABLE', 'CY')`,
      `=TBLOOKUP('LIABILITY_CONVERTIBLE_NOTES_PAYABLE', 'PY')`,
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
      'Long term debt, net of current portion',
      `=TBLOOKUP('LIABILITY_DEBT_LONG', 'CY')`,
      `=TBLOOKUP('LIABILITY_DEBT_LONG', 'PY')`,
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
      `=TBLOOKUP('LIABILITY_OPERATING_LEASE_LIABILITIES_NET_OF_CURRENT_PORTION', 'CY')`,
      `=TBLOOKUP('LIABILITY_OPERATING_LEASE_LIABILITIES_NET_OF_CURRENT_PORTION', 'PY')`,
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
      `=TBLOOKUP('EQUITY_PREFERRED_STOCK', 'CY')`,
      `=TBLOOKUP('EQUITY_PREFERRED_STOCK', 'PY')`,
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
      `=TBLOOKUP('EQUITY_COMMON_STOCK', 'CY')`,
      `=TBLOOKUP('EQUITY_COMMON_STOCK', 'PY')`,
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
      `=TBLOOKUP('EQUITY_PAID_IN_CAPITAL', 'CY')`,
      `=TBLOOKUP('EQUITY_PAID_IN_CAPITAL', 'PY')`,
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
      `=IF(B${t.row}, "Retained earnings", "Accumulated Deficit")`,
      `=TBLOOKUP('EQUITY_RETAINED_EARNINGS', 'CY')`,
      `=TBLOOKUP('EQUITY_RETAINED_EARNINGS', 'PY')`,
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
      `=IF(B${t.row}, "Total stockholders’ deficit", "Total stockholders’ equity")`,

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
      id: 'TOTAL-LIABILITIES-AND-STOCKHOLDERS-DEFICIT',
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
      `=TBLOOKUP('INCOME_STATEMENT_REVENUE', 'CY')`,
      `=TBLOOKUP('INCOME_STATEMENT_REVENUE', 'PY')`,
    ],
    {
      id: 'REVENUE',
      tags: ['hide-if-zero'],
    },
  );
  t.addRow(
    [
      'Cost of revenue',
      `=TBLOOKUP('INCOME_STATEMENT_COST_OF_REVENUE', 'CY')`,
      `=TBLOOKUP('INCOME_STATEMENT_COST_OF_REVENUE', 'PY')`,
    ],
    {
      id: 'COST-OF-REVENUE',
      tags: ['hide-if-zero'],
    },
  );
  t.addRow(
    [
      'Gross profit',
      `=GET_BY_ID('REVENUE', 1) + GET_BY_ID('COST-OF-REVENUE', 1)`,
      `=GET_BY_ID('REVENUE', 2) + GET_BY_ID('COST-OF-REVENUE', 2)`,
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
      `=TBLOOKUP('INCOME_STATEMENT_RESEARCH_AND_DEVELOPMENT', 'CY')`,
      `=TBLOOKUP('INCOME_STATEMENT_RESEARCH_AND_DEVELOPMENT', 'PY')`,
    ],
    {
      tags: ['total-operating-expenses', 'hide-if-zero'],
      cellStyle: [{ indent: 1 }],
    },
  );

  t.addRow(
    [
      'General and administrative',
      `=TBLOOKUP('INCOME_STATEMENT_G_AND_A', 'CY') + TBLOOKUP('INCOME_STATEMENT_SALES_AND_MARKETING', 'CY')`,
      `=TBLOOKUP('INCOME_STATEMENT_G_AND_A', 'PY') + TBLOOKUP('INCOME_STATEMENT_SALES_AND_MARKETING', 'PY')`,
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
      `=SUMTAGCOL('total-opex', 1)`,
      `=SUMTAGCOL('total-opex', 2)`,
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
      `=IF(AND(B${t.row} > 0, C${t.row} > 0), "Interest income, net", IF(AND(B${t.row} < 0, C${t.row} < 0), "Interest expense, net", IF(AND(B${t.row} > 0, C${t.row} < 0), "Interest income (expense), net", "Interest (expense) income, net")))`,
      `=TBLOOKUP('INCOME_STATEMENT_INTEREST_EXPENSE', 'CY') + TBLOOKUP('INCOME_STATEMENT_INTEREST_INCOME', 'CY')`,
      `=TBLOOKUP('INCOME_STATEMENT_INTEREST_EXPENSE', 'PY') + TBLOOKUP('INCOME_STATEMENT_INTEREST_INCOME', 'PY')`,
    ],
    {
      tags: ['total-other-income-expense-net', 'hide-if-zero'],
      cellStyle: [{ indent: 1 }],
    },
  );
  t.addRow(
    [
      'Other income (expenses), net',
      `=TBLOOKUP('INCOME_STATEMENT_OTHER_INCOME', 'CY')`,
      `=TBLOOKUP('INCOME_STATEMENT_OTHER_INCOME', 'PY')`,
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

export function buildStockholderEquity(data: AuditData) {
  const t = new Table('statement-of-equity');

  const beginningOfPYDate = new Date(
    Number(data.PY),
    data.rt.auditInfo.fiscalYearMonthEnd % 12,
    1,
  );
  const endOfPYDate = new Date(
    Number(data.PY),
    data.rt.auditInfo.fiscalYearMonthEnd - 1,
    1,
  );

  t.columns = [
    {},
    { style: { numFmt: 'number', align: 'right' } },
    { style: { numFmt: 'accounting', align: 'right' } },
    { style: { numFmt: 'number', align: 'right' } },
    { style: { numFmt: 'accounting', align: 'right' } },
    { style: { numFmt: 'accounting', align: 'right' } },
    { style: { numFmt: 'accounting', align: 'right' } },
    { style: { numFmt: 'accounting', align: 'right' } },
    { style: { numFmt: 'accounting', align: 'right' } },
  ];

  t.addRow(
    [
      '',
      'Convertible preferred stock: shares',
      'Convertible preferred stock: amount',
      'Common stock: shares',
      'Common stock: amount',
      'Additional paid-in capital',
      'Accumulated deficit',
      'Total stockholders’ equity (deficit)',
    ],
    {
      style: {
        textSize: 'xs',
        borderBottom: 'thin',
        wrapText: true,
      },
    },
  );
  const certData = getSOEData({
    data,
    certData: data.certificateTransactionDocumentData,
    beginningOfPYDate: beginningOfPYDate,
    endOfPYDate,
  });
  const additionalPaidInCapital = fIn(
    data.rt.equity.stockBasedCompDocumentId.amtAdditionalPaidInCapital,
  );
  t.addRow(
    [
      `Balance as of ${dayjs(beginningOfPYDate).format('MMMM D, YYYY')}`,
      certData.numPreferredSharesPrePY,
      certData.amtPreferredSharesPrePY,
      certData.numCommonSharesPrePY,
      certData.amtCommonSharesPrePY,
      `=TBLOOKUP('EQUITY_PAID_IN_CAPITAL', 'CY') + ${additionalPaidInCapital}`,
      0,
      `=C2 + E2 + F2`,
    ],
    {
      cellStyle: [{ bold: true }],
    },
  );
  t.addRow([
    `Issuance of common stock upon exercise of stock options`,
    certData.numPreferredSharesPY,
    certData.amtPreferredSharesPY,
    certData.numCommonSharesPY,
    certData.amtCommonSharesPY,
    0,
    0,
    0,
  ]);
  t.addRow([
    'Stock-based compensation',
    0,
    0,
    0,
    0,
    additionalPaidInCapital,
    0,
    0,
  ]);
  t.addRow([
    'Net loss',
    0,
    0,
    0,
    0,
    0,
    `=-TBLOOKUP('EQUITY_RETAINED_EARNINGS', 'PY')`,
    0,
  ]);
  t.addRow(
    [
      `Balance as of ${dayjs(endOfPYDate).format('MMMM D, YYYY')}`,
      '=SUM(B2:B5)',
      '=SUM(C2:C5)',
      '=SUM(D2:D5)',
      '=SUM(E2:E5)',
      '=SUM(F2:F5)',
      '=SUM(G2:G5)',
      '=SUM(H2:H5)',
    ],
    {
      style: { bold: true, borderTop: 'thin', borderBottom: 'double' },
    },
  );
  t.addRow([
    `Issuance of common stock upon exercise of stock options`,
    certData.numPreferredSharesCY,
    certData.amtPreferredSharesCY,
    certData.numCommonSharesCY,
    certData.amtCommonSharesCY,
    0,
    0,
    0,
  ]);
  t.addRow([
    'Stock-based compensation',
    0,
    0,
    0,
    0,
    additionalPaidInCapital,
    0,
    0,
  ]);
  t.addRow([
    'Net loss',
    0,
    0,
    0,
    0,
    0,
    `=-TBLOOKUP('EQUITY_RETAINED_EARNINGS', 'CY')`,
    0,
  ]);
  t.addRow(
    [
      `Balance as of ${data.fiscalYearEndNoYear}, ${data.year}`,
      '=SUM(B7:B9)',
      '=SUM(C7:C9)',
      '=SUM(D7:D9)',
      '=SUM(E7:E9)',
      '=SUM(F7:F9)',
      '=SUM(G7:G9)',
      '=SUM(H7:H9)',
    ],
    {
      style: { bold: true, borderTop: 'thin', borderBottom: 'double' },
    },
  );
  return t;
}

export function buildCashFlows(data: AuditData) {
  const t = new Table('cash-flows');
  t.columns = [
    {},
    { style: { numFmt: 'accounting', align: 'right' } },
    { style: { numFmt: 'accounting', align: 'right' } },
  ];

  t.addRow([`As of ${data.fiscalYearEndNoYear},`, data.year, data.prevYear], {
    style: { bold: true, borderBottom: 'thin' },
  });

  t.addRow(['Cash flows from operating activities:', '', ''], {
    style: {
      bold: true,
    },
  });

  t.addRow(
    [
      'Net income',
      `=IS_NETLOSS('CY') - IS_NETLOSS('PY')`,
      `=IS_NETLOSS('PY') - TB_NETLOSS('PY2')`,
    ],

    {
      tags: ['net-cash-op-activity'],
      style: {
        indent: 1,
      },
    },
  );
  t.addRow(
    [
      'Adjustments to reconcile net loss to net cash provided by (used in) operating activities:',
      '',
      '',
    ],
    {
      style: {
        indent: 2,
      },
    },
  );

  t.addRow(
    [
      'Stock-based compensation expense',
      `=CF('stockBasedComp','CY')`,
      `=CF('stockBasedComp','PY')`,
    ],
    {
      tags: ['net-cash-op-activity'],
      cellStyle: [{ indent: 3 }],
    },
  );
  t.addRow(
    [
      'Depreciation and amortization',
      `=CF('depreciation','CY')`,
      `=CF('depreciation','PY')`,
    ],
    {
      tags: ['net-cash-op-activity'],
      cellStyle: [{ indent: 3 }],
    },
  );

  t.addRow(['Changes in assets and liabilities:', '', ''], {
    tags: [],
    cellStyle: [{ indent: 3 }],
  });

  // Property and equipment is repeated in investing activities. Remove from operating activities
  const otherAssetTypesWithoutPropertyAndEquipment = otherAssetTypes.filter(
    (assetType) => assetType.key !== 'ASSET_PROPERTY_AND_EQUIPMENT',
  );
  [
    ...nonCashCurrentAssetTypes,
    ...otherAssetTypesWithoutPropertyAndEquipment,
  ].forEach((assetType) => {
    t.addRow(
      [
        assetType.label,
        `=TBLOOKUP('${assetType.key}', 'PY') - TBLOOKUP('${assetType.key}', 'CY')`,
        `=TBLOOKUP('${assetType.key}', 'PY2') - TBLOOKUP('${assetType.key}', 'PY')`,
      ],
      {
        tags: ['net-cash-op-activity', 'hide-if-zero'],
        cellStyle: [{ indent: 4 }],
      },
    );
  });

  const liabilityTypesWithoutShortTermDebt = liabilityTypes.filter(
    (liabilityType) => liabilityType.key !== 'LIABILITY_DEBT_SHORT',
  );
  liabilityTypesWithoutShortTermDebt.forEach((assetType) => {
    t.addRow(
      [
        assetType.label,
        `=TBLOOKUP('${assetType.key}', 'CY') - TBLOOKUP('${assetType.key}', 'PY')`,
        `=TBLOOKUP('${assetType.key}', 'PY') - TBLOOKUP('${assetType.key}', 'PY2')`,
      ],
      {
        tags: ['net-cash-op-activity', 'hide-if-zero'],
        cellStyle: [{ indent: 4 }],
      },
    );
  });

  t.addRow(
    [
      'Net cash provided by (used in) operating activities',
      `=SUMTAGCOL('net-cash-op-activity', 1)`,
      `=SUMTAGCOL('net-cash-op-activity', 2)`,
    ],
    {
      style: {
        bold: true,
        padTop: true,
        borderTop: 'thin',
        borderBottom: 'thin',
      },
      tags: ['net-cash'],
    },
  );

  t.addRow(['Cash flows from investing activities:', '', ''], {
    style: {
      bold: true,
    },
    tags: [],
  });

  t.addRow(
    [
      'Acquisition of property and equipment',
      `=TBLOOKUP('ASSET_PROPERTY_AND_EQUIPMENT', 'CY') - TBLOOKUP('ASSET_PROPERTY_AND_EQUIPMENT', 'PY')`,
      `=TBLOOKUP('ASSET_PROPERTY_AND_EQUIPMENT', 'PY') - TBLOOKUP('ASSET_PROPERTY_AND_EQUIPMENT', 'PY2')`,
    ],
    {
      tags: ['net-cash-investing-activity'],
      style: {
        indent: 1,
      },
    },
  );

  t.addRow(
    [
      'Net cash provided by (used in) investing activities',
      `=SUMTAGCOL('net-cash-investing-activity', 1)`,
      `=SUMTAGCOL('net-cash-investing-activity', 2)`,
    ],
    {
      style: {
        bold: true,
        padTop: true,
        borderTop: 'thin',
        borderBottom: 'thin',
      },
      tags: ['net-cash'],
    },
  );

  t.addRow(['Cash flows from financing activities:', '', ''], {
    style: {
      bold: true,
    },
  });

  t.addRow(
    [
      'Proceeds from debt',
      `=(TBLOOKUP('LIABILITY_DEBT_SHORT', 'CY') + TBLOOKUP('LIABILITY_DEBT_LONG', 'CY') + TBLOOKUP('LIABILITY_CONVERTIBLE_NOTES_PAYABLE', 'CY'))
        - (TBLOOKUP('LIABILITY_DEBT_SHORT', 'PY') + TBLOOKUP('LIABILITY_DEBT_LONG', 'PY') + TBLOOKUP('LIABILITY_CONVERTIBLE_NOTES_PAYABLE', 'PY'))`,
      `=(TBLOOKUP('LIABILITY_DEBT_SHORT', 'PY') + TBLOOKUP('LIABILITY_DEBT_LONG', 'PY') + TBLOOKUP('LIABILITY_CONVERTIBLE_NOTES_PAYABLE', 'PY'))
        - (TBLOOKUP('LIABILITY_DEBT_SHORT', 'PY2') + TBLOOKUP('LIABILITY_DEBT_LONG', 'PY2') + TBLOOKUP('LIABILITY_CONVERTIBLE_NOTES_PAYABLE', 'PY2'))`,
    ],
    {
      tags: ['net-cash-financing-activity'],
      style: {
        indent: 1,
      },
    },
  );

  t.addRow(
    [
      'Proceeds from issuance of equity',
      `=TBLOOKUP('EQUITY_PAID_IN_CAPITAL', 'CY') - TBLOOKUP('EQUITY_PAID_IN_CAPITAL', 'PY')`,
      `=TBLOOKUP('EQUITY_PAID_IN_CAPITAL', 'CY') - TBLOOKUP('EQUITY_PAID_IN_CAPITAL', 'PY')`,
    ],
    {
      tags: ['net-cash-financing-activity'],
      style: {
        indent: 1,
      },
    },
  );
  t.addRow(
    [
      'Proceeds from exercise of stock options',
      `=TBLOOKUP('EQUITY_PAID_IN_CAPITAL', 'CY') - TBLOOKUP('EQUITY_PAID_IN_CAPITAL', 'PY')`,
      `=TBLOOKUP('EQUITY_PAID_IN_CAPITAL', 'CY') - TBLOOKUP('EQUITY_PAID_IN_CAPITAL', 'PY')`,
    ],
    {
      tags: ['net-cash-financing-activity'],
      style: {
        indent: 1,
      },
    },
  );
  t.addRow(
    [
      'Additional paid in capital',
      `=TBLOOKUP('EQUITY_PAID_IN_CAPITAL', 'CY') - TBLOOKUP('EQUITY_PAID_IN_CAPITAL', 'PY')`,
      `=TBLOOKUP('EQUITY_PAID_IN_CAPITAL', 'PY') - TBLOOKUP('EQUITY_PAID_IN_CAPITAL', 'PY2')`,
    ],
    {
      tags: ['net-cash-financing-activity'],
      style: {
        indent: 1,
      },
    },
  );
  t.addRow(
    [
      'Net cash provided by (used in) financing activities',
      `=SUMTAGCOL('net-cash-financing-activity', 1)`,
      `=SUMTAGCOL('net-cash-financing-activity', 2)`,
    ],
    {
      style: {
        bold: true,
        padTop: true,
        borderTop: 'thin',
        borderBottom: 'thin',
      },
      tags: ['net-cash'],
    },
  );

  t.addRow(
    [
      'Net increase in cash',
      `=SUMTAGCOL('net-cash', 1)`,
      `=SUMTAGCOL('net-cash', 2)`,
    ],
    {
      id: 'NET-INCREASE-IN-CASH',
      style: {
        bold: true,
        padTop: true,
        borderTop: 'thin',
        borderBottom: 'thin',
      },
      tags: [],
    },
  );

  t.addRow(
    [
      'Cash, beginning of period',
      `=TBLOOKUP('ASSET_CASH_AND_CASH_EQUIVALENTS', 'PY')`,
      `=TBLOOKUP('ASSET_CASH_AND_CASH_EQUIVALENTS', 'PY2')`,
    ],
    {
      id: 'CASH-BEGINNING-OF-PERIOD',
      tags: [],
    },
  );

  t.addRow(
    [
      'Cash, end of period',
      `=TBLOOKUP('ASSET_CASH_AND_CASH_EQUIVALENTS', 'CY')`,
      `=TBLOOKUP('ASSET_CASH_AND_CASH_EQUIVALENTS', 'PY')`,
    ],
    {
      id: 'CASH-END-OF-PERIOD',
      style: {
        borderTop: 'thin',
        borderBottom: 'double',
      },
      tags: [],
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
