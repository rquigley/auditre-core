import {
  AccountMap,
  getAccountsForCategory,
} from '@/controllers/account-mapping';
import { groupFixedAccountsByCategories } from '@/lib/finance';
import { Table } from '@/lib/table';
import { addFP } from '@/lib/util';

import type { AuditData } from '../audit';

export const tableMap = {
  'balance-sheet': buildBalanceSheet,
  'statement-of-operations': buildStatementOfOperations,
  'property-and-equipment-lives': buildPropertyAndEquipmentLives,
  'property-and-equipment-net': buildPropertyAndEquipmentNet,
  'fvm-liabilities': buildFVMLiabilities,
} as const;

export function normalizeBalanceSheet(t: AccountMap) {
  // Add accounting norm to hide if < 5% TOTAL
  const assets = {
    currentAssets: {
      cash: t.get('ASSET_CASH_AND_CASH_EQUIVALENTS'),
      inventory: t.get('ASSET_INVENTORY'),
      prepaidExpenses: t.get('ASSET_PREPAID_EXPENSES'),
      // if < 5%, hide and group into ASSET_OTHER
      other: t.get('ASSET_CURRENT_OTHER'),
    },
    totalCurrentAssets: 0, // computed + invent + asset
    property: t.get('ASSET_PROPERTY_AND_EQUIPMENT'),
    intangible: t.get('ASSET_INTANGIBLE_ASSETS'),
    operatingLeaseRightOfUse: t.get('ASSET_OPERATING_LEASE_RIGHT_OF_USE'),
    other: t.get('ASSET_OTHER'),
    total: 0, // computed
  };

  assets.totalCurrentAssets = addFP(
    assets.currentAssets.cash,
    assets.currentAssets.inventory,
    assets.currentAssets.prepaidExpenses,
    assets.currentAssets.other,
  );

  assets.total = addFP(
    assets.totalCurrentAssets,
    assets.property,
    assets.intangible,
    assets.operatingLeaseRightOfUse,
    assets.other,
  );

  const liabilities = {
    current: {
      accountsPayable: t.get('LIABILITY_ACCOUNTS_PAYABLE'),
      accrued: t.get('LIABILITY_ACCRUED_LIABILITIES'),
      deferredRevenue: t.get('LIABILITY_DEFERRED_REVENUE'),
      operatingLease: t.get('LIABILITY_OPERATING_LEASE_LIABILITIES_CURRENT'),
      other: t.get('LIABILITY_OTHER'),
    },
    totalCurrent: 0, // computed
    accruedInterest: t.get('LIABILITY_ACCRUED_INTEREST'),
    converableNotes: t.get('LIABILITY_CONVERTIBLE_NOTES_PAYABLE'),
    debt: t.get('LIABILITY_DEBT'),
    operatingLease:
      t.get('LIABILITY_OPERATING_LEASE_LIABILITIES_NET_OF_CURRENT_PORTION') ||
      0,
    total: 0, // computed
  };
  liabilities.totalCurrent = addFP(
    liabilities.current.accountsPayable,
    liabilities.current.accrued,
    liabilities.current.deferredRevenue,
    liabilities.current.other,
    liabilities.current.operatingLease,
  );

  liabilities.total = addFP(
    liabilities.totalCurrent,
    liabilities.accruedInterest,
    liabilities.converableNotes,
    liabilities.debt,
    liabilities.operatingLease,
  );

  const equity = {
    preferredStock: t.get('EQUITY_PREFERRED_STOCK'),
    commonStock: t.get('EQUITY_COMMON_STOCK'),
    paidInCapital: t.get('EQUITY_PAID_IN_CAPITAL'),
    retainedEarnings: t.get('EQUITY_RETAINED_EARNINGS'),
    accumulatedDeficit: t.get('EQUITY_ACCUMULATED_DEFICIT'),
  };
  const totalStockholdersDeficit = addFP(
    equity.preferredStock,
    equity.commonStock,
    equity.paidInCapital,
    equity.retainedEarnings,
    equity.accumulatedDeficit,
  );
  const totalLiabilitiesAndStockholdersDeficit = addFP(
    liabilities.total,
    totalStockholdersDeficit,
  );
  return {
    assets,
    liabilities,
    equity,
    totalStockholdersDeficit,
    totalLiabilitiesAndStockholdersDeficit,
  } as const;
}

export async function buildBalanceSheet(data: AuditData): Promise<Table> {
  const balanceSheet = normalizeBalanceSheet(data.totals);
  let t = new Table();
  t.columns = [{}, { style: { numFmt: 'accounting', align: 'right' } }];

  let row;
  row = t.addRow(
    [`As of ${data.fiscalYearEndParts.md},`, data.fiscalYearEndParts.y],
    { bold: true, borderBottom: 'single' },
  );
  // row.cells[1].style = { align: 'right' };

  t.addRow(['Assets', ''], {
    bold: true,
    borderBottom: 'single',
    padTop: true,
  });
  t.addRow(['Current assets:', ''], { padTop: true });

  row = t.addRow(['Cash', balanceSheet.assets.currentAssets.cash]);
  row.cells[0].style = { indent: true };

  if (balanceSheet.assets.currentAssets.inventory !== 0) {
    row = t.addRow(['Inventory', balanceSheet.assets.currentAssets.inventory]);
    row.cells[0].style = { indent: true };
    row.cells[1].style = { hideCurrency: true };
  }

  if (balanceSheet.assets.currentAssets.prepaidExpenses !== 0) {
    row = t.addRow([
      'Prepaid expenses',
      balanceSheet.assets.currentAssets.prepaidExpenses,
    ]);
    row.cells[0].style = { indent: true };
    row.cells[1].style = { hideCurrency: true };
  }

  if (balanceSheet.assets.currentAssets.other !== 0) {
    row = t.addRow([
      'Prepaid expenses and other current assets',
      balanceSheet.assets.currentAssets.other,
    ]);
    row.cells[0].style = { indent: true };
    row.cells[1].style = { hideCurrency: true };
  }

  t.addRow(['Total current assets', balanceSheet.assets.totalCurrentAssets], {
    // padTop: true,
    borderTop: 'single',
  });
  if (balanceSheet.assets.property !== 0) {
    row = t.addRow([
      'Property and equipment, net',
      balanceSheet.assets.property,
    ]);
    row.cells[1].style = { hideCurrency: true };
  }
  if (balanceSheet.assets.intangible !== 0) {
    row = t.addRow(['Intangible assets, net', balanceSheet.assets.intangible]);
    row.cells[1].style = { hideCurrency: true };
  }
  if (balanceSheet.assets.operatingLeaseRightOfUse !== 0) {
    row = t.addRow([
      'Operating lease right-of-use assets',
      balanceSheet.assets.operatingLeaseRightOfUse,
    ]);
    row.cells[1].style = { hideCurrency: true };
  }
  if (balanceSheet.assets.other !== 0) {
    row = t.addRow(['Other assets', balanceSheet.assets.other]);
    row.cells[1].style = { hideCurrency: true };
  }
  row = t.addRow(['Total assets', balanceSheet.assets.total], {
    borderTop: 'single',
    borderBottom: 'double',
    bold: true,
    padTop: true,
  });

  row = t.addRow(['Liabilities and Stockholders’ Deficit', ''], {
    bold: true,
    padTop: true,
  });

  row = t.addRow(['Current liabilities:', ''], { padTop: true });

  if (balanceSheet.liabilities.current.accountsPayable !== 0) {
    row = t.addRow([
      'Accounts payable',
      balanceSheet.liabilities.current.accountsPayable,
    ]);
    row.cells[0].style = { indent: true };
    row.cells[1].style = { hideCurrency: true };
  }
  if (balanceSheet.liabilities.current.accrued !== 0) {
    row = t.addRow([
      'Accrued liabilities',
      balanceSheet.liabilities.current.accrued,
    ]);
    row.cells[0].style = { indent: true };
    row.cells[1].style = { hideCurrency: true };
  }
  if (balanceSheet.liabilities.current.deferredRevenue !== 0) {
    row = t.addRow([
      'Deferred revenue',
      balanceSheet.liabilities.current.deferredRevenue,
    ]);
    row.cells[0].style = { indent: true };
    row.cells[1].style = { hideCurrency: true };
  }

  if (balanceSheet.liabilities.current.operatingLease !== 0) {
    row = t.addRow(
      [
        'Operating lease liabilities, current',
        balanceSheet.liabilities.current.operatingLease,
      ],
      { borderBottom: 'single' },
    );
    row.cells[0].style = { indent: true };
    row.cells[1].style = { hideCurrency: true };
  }
  if (balanceSheet.liabilities.current.other !== 0) {
    row = t.addRow(['Other', balanceSheet.liabilities.current.other]);
    row.cells[0].style = { indent: true };
    row.cells[1].style = { hideCurrency: true };
  }
  row = t.addRow(
    ['Total current liabilities', balanceSheet.liabilities.totalCurrent],
    { borderTop: 'single', borderBottom: 'single' },
  );

  if (balanceSheet.liabilities.accruedInterest !== 0) {
    row = t.addRow([
      'Accrued interest',
      balanceSheet.liabilities.accruedInterest,
    ]);
    row.cells[0].style = { indent: true };
    row.cells[1].style = { hideCurrency: true };
  }
  if (balanceSheet.liabilities.converableNotes !== 0) {
    row = t.addRow([
      'Convertible notes payable',
      balanceSheet.liabilities.converableNotes,
    ]);
    row.cells[0].style = { indent: true };
    row.cells[1].style = { hideCurrency: true };
  }

  if (balanceSheet.liabilities.debt !== 0) {
    row = t.addRow(['Debt', balanceSheet.liabilities.debt]);
    row.cells[0].style = { indent: true };
    row.cells[1].style = { hideCurrency: true };
  }
  if (balanceSheet.liabilities.operatingLease !== 0) {
    row = t.addRow([
      'Operating lease liabilities, net of current portion',
      balanceSheet.liabilities.operatingLease,
    ]);
    row.cells[0].style = { indent: true };
    row.cells[1].style = { hideCurrency: true };
  }
  row = t.addRow(['Total liabilities', balanceSheet.liabilities.total], {
    bold: true,
    padTop: true,
    borderTop: 'single',
    borderBottom: 'single',
  });

  row = t.addRow(['Stockholders’ deficit:', ''], { padTop: true });

  if (balanceSheet.equity.preferredStock !== 0) {
    row = t.addRow(['Preferred stock', balanceSheet.equity.preferredStock]);
    row.cells[0].style = { indent: true };
    row.cells[1].style = { hideCurrency: true };
  }

  if (balanceSheet.equity.commonStock !== 0) {
    row = t.addRow(['Common stock', balanceSheet.equity.commonStock]);
    row.cells[0].style = { indent: true };
    row.cells[1].style = { hideCurrency: true };
  }
  if (balanceSheet.equity.paidInCapital !== 0) {
    row = t.addRow(['Paid-in capital', balanceSheet.equity.paidInCapital]);
    row.cells[0].style = { indent: true };
    row.cells[1].style = { hideCurrency: true };
  }
  if (balanceSheet.equity.retainedEarnings !== 0) {
    row = t.addRow(['Retained earnings', balanceSheet.equity.retainedEarnings]);
    row.cells[0].style = { indent: true };
    row.cells[1].style = { hideCurrency: true };
  }
  if (balanceSheet.equity.accumulatedDeficit !== 0) {
    row = t.addRow([
      'Accumulated deficit',
      balanceSheet.equity.accumulatedDeficit,
    ]);
    row.cells[0].style = { indent: true };
    row.cells[1].style = { hideCurrency: true };
  }
  t.addRow(
    ['Total stockholders’ deficit', balanceSheet.equity.preferredStock],
    { bold: true, borderTop: 'single', borderBottom: 'single', padTop: true },
  );
  t.addRow(
    [
      'Total liabilities and stockholders’ deficit',
      balanceSheet.totalLiabilitiesAndStockholdersDeficit,
    ],
    { bold: true, borderBottom: 'double', padTop: true },
  );

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
    bold: true,
    borderBottom: 'single',
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
    name: `${a.accountNumber}${a.accountNumber && a.accountName ? '-' : ''}${
      a.accountName
    }`,
    balance: a.balance,
  }));

  const assets = accounts.filter(
    (a) => a.name.toLowerCase().includes('accumulated depreciation') === false,
  );
  const out = groupFixedAccountsByCategories(assets, assetCategories);
  const totalAccumulatedDepreciation = accounts
    .filter((a) => a.name.toLowerCase().includes('accumulated depreciation'))
    .reduce((acc, a) => addFP(acc, a.balance), 0);

  assetCategories = assetCategories.sort();
  let totalPropertyAndEquipment = 0;

  let t = new Table();
  t.columns = [{}, { style: { numFmt: 'accounting', align: 'right' } }];

  let row;
  row = t.addRow([data.fiscalYearEndParts.md, data.fiscalYearEndParts.y], {
    bold: true,
    borderBottom: 'single',
  });

  let currShown = false;
  Object.keys(out).forEach((category, idx) => {
    const value = out[category].reduce((acc, a) => addFP(acc, a.balance), 0);
    if (value === 0) {
      return;
    }
    totalPropertyAndEquipment = addFP(totalPropertyAndEquipment, value);
    const row = t.addRow([category, value], {
      borderBottom: idx === assetCategories.length - 1 ? 'single' : undefined,
    });
    if (currShown) {
      row.cells[1].style = { hideCurrency: true };
    } else {
      currShown = true;
    }
  });

  t.addRow(['Total property and equipment', totalPropertyAndEquipment], {
    borderTop: 'single',
  });
  t.addRow(['Less accumulated depreciation', totalAccumulatedDepreciation], {
    borderBottom: 'single',
  });
  t.addRow(
    [
      'Property and equipment, net',
      addFP(totalPropertyAndEquipment, totalAccumulatedDepreciation),
    ],
    {
      bold: true,
      borderBottom: 'double',
    },
  );
  console.log(t);
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
    bold: true,
    borderBottom: 'single',
  });
  t.addRow(['Liabilities:', '', '', '']);
  let row;
  row = t.addRow(['Derivatives liability:', 123, 345, 343]);
  row.cells[0].style = { indent: true };
  return t;
}

export async function buildStatementOfOperations(
  data: AuditData,
): Promise<Table> {
  const statementOfOps = normalizeStatementOfOps(data.totals);
  let t = new Table();
  t.columns = [{}, { style: { numFmt: 'accounting', align: 'right' } }];

  let row;
  row = t.addRow(
    [`As of ${data.fiscalYearEndParts.md},`, data.fiscalYearEndParts.y],
    { bold: true, borderBottom: 'single' },
  );
  t.addRow(['Operating expenses:', ''], {
    padTop: true,
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
    borderTop: 'single',
  });

  row = t.addRow(['Loss from operations', statementOfOps.lossFromOps]);
  row.cells[1].style = { hideCurrency: true };

  t.addRow(['Other income (expense), net:', ''], {
    padTop: true,
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
      borderTop: 'single',
    },
  );

  row = t.addRow(['Net loss', statementOfOps.netLoss], {
    borderTop: 'single',
    borderBottom: 'double',
  });

  return t;
}
