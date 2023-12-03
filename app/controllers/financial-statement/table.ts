import React from 'react';

import {
  AccountMap,
  AccountType,
  getAccountsForCategory,
} from '@/controllers/account-mapping';
import { groupFixedAccountsByCategories } from '@/lib/finance';
import { addFP } from '@/lib/util';

import type { AuditData } from '../audit';

export type BuildTableRowArgs = {
  name: string;
  value?: string | number;
  bold?: boolean;
  indent?: boolean;
  padTop?: boolean;
  borderBottom?: boolean;
  key?: React.Key;
  hideIfZero?: boolean;
};
export const tableMap = {
  'balance-sheet': buildBalanceSheet,
  'statement-of-operations': buildStatementOfOperations,
  'property-and-equipment-lives': buildPropertyAndEquipmentLives,
  'property-and-equipment-net': buildPropertyAndEquipmentNet,
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

export async function buildBalanceSheet(data: AuditData) {
  const balanceSheet = normalizeBalanceSheet(data.totals);
  return [
    {
      name: `As of ${data.fiscalYearEndParts.md},`,
      value: data.fiscalYearEndParts.y,
      bold: true,
      borderBottom: true,
    },
    {
      name: 'Assets',
      bold: true,
      padTop: true,
    },
    {
      name: 'Current assets:',
      padTop: true,
    },
    {
      name: 'Cash',
      value: balanceSheet.assets.currentAssets.cash,
      indent: true,
    },
    {
      name: 'Inventory',
      value: balanceSheet.assets.currentAssets.inventory,
      indent: true,
      hideIfZero: true,
    },
    {
      name: 'Prepaid expenses',
      value: balanceSheet.assets.currentAssets.prepaidExpenses,
      indent: true,
      hideIfZero: true,
    },
    {
      name: 'Prepaid expenses and other current assets',
      value: balanceSheet.assets.currentAssets.other,
      indent: true,
      borderBottom: true,
      hideIfZero: true,
    },
    {
      name: 'Total current assets',
      value: balanceSheet.assets.totalCurrentAssets,
      borderBottom: true,
      padTop: true,
    },
    {
      name: 'Property and equipment, net',
      value: balanceSheet.assets.property,
      hideIfZero: true,
    },
    {
      name: 'Intangible assets, net',
      value: balanceSheet.assets.intangible,
      hideIfZero: true,
    },
    {
      name: 'Operating lease right-of-use assets',
      value: balanceSheet.assets.operatingLeaseRightOfUse,
      hideIfZero: true,
    },
    {
      name: 'Other assets',
      value: balanceSheet.assets.other,
      borderBottom: true,
      hideIfZero: true,
    },
    {
      name: 'Total assets',
      value: balanceSheet.assets.total,
      bold: true,
      borderBottom: true,
      padTop: true,
    },

    {
      name: 'Liabilities and Stockholders’ Deficit',
      bold: true,
      padTop: true,
    },
    {
      name: 'Current liabilities:',
      padTop: true,
    },
    {
      name: 'Accounts payable',
      value: balanceSheet.liabilities.current.accountsPayable,
      indent: true,
      hideIfZero: true,
    },
    {
      name: 'Accrued liabilities',
      value: balanceSheet.liabilities.current.accrued,
      indent: true,
      hideIfZero: true,
    },
    {
      name: 'Deferred revenue',
      value: balanceSheet.liabilities.current.deferredRevenue,
      indent: true,
      hideIfZero: true,
    },
    {
      name: 'Operating lease liabilities, current',
      value: balanceSheet.liabilities.current.operatingLease,
      indent: true,
      borderBottom: true,
      hideIfZero: true,
    },
    {
      name: 'Other',
      value: balanceSheet.liabilities.current.other,
      indent: true,
      hideIfZero: true,
    },
    {
      name: 'Total current liabilities',
      value: balanceSheet.liabilities.totalCurrent,
      borderBottom: true,
      padTop: true,
    },
    {
      name: 'Accrued interest',
      value: balanceSheet.liabilities.accruedInterest,
      indent: true,
    },
    {
      name: 'Convertible notes payable',
      value: balanceSheet.liabilities.converableNotes,
      indent: true,
    },
    {
      name: 'Debt',
      value: balanceSheet.liabilities.debt,
      indent: true,
    },
    {
      name: 'Operating lease liabilities, net of current portion',
      value: balanceSheet.liabilities.operatingLease,
      indent: true,
      borderBottom: true,
    },
    {
      name: 'Total liabilities',
      value: balanceSheet.liabilities.total,
      bold: true,
      borderBottom: true,
      padTop: true,
    },

    {
      name: 'Stockholders’ deficit:',
      padTop: true,
    },
    {
      name: 'Preferred stock',
      value: balanceSheet.equity.preferredStock,
      indent: true,
      hideIfZero: true,
    },
    {
      name: 'Common stock',
      value: balanceSheet.equity.commonStock,
      indent: true,
      hideIfZero: true,
    },
    {
      name: 'Paid-in capital',
      value: balanceSheet.equity.paidInCapital,
      indent: true,
      hideIfZero: true,
    },
    {
      name: 'Retained earnings',
      value: balanceSheet.equity.retainedEarnings,
      indent: true,
      hideIfZero: true,
    },
    {
      name: 'Accumulated deficit',
      value: balanceSheet.equity.accumulatedDeficit,
      indent: true,
      borderBottom: true,
      hideIfZero: true,
    },
    {
      name: 'Total stockholders’ deficit',
      value: balanceSheet.totalStockholdersDeficit,
      bold: true,
      borderBottom: true,
      padTop: true,
    },
    {
      name: 'Total liabilities and stockholders’ deficit',
      value: balanceSheet.totalLiabilitiesAndStockholdersDeficit,
      bold: true,
      borderBottom: true,
      padTop: true,
    },
  ];
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
  return [
    {
      name: 'Asset',
      value: 'Useful life (years)',
      bold: true,
      borderBottom: true,
    },
    {
      name: 'Furniture and fixtures',
      value: '3',
    },
    {
      name: 'Machinery and equipment',
      value: '3 – 10',
    },
    {
      name: 'Leasehold improvements',
      value: 'Remaining life of the lease',
    },
  ];
}

export async function buildPropertyAndEquipmentNet(
  data: AuditData,
): Promise<BuildTableRowArgs[]> {
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
  return [
    {
      name: data.fiscalYearEndParts.md,
      value: data.fiscalYearEndParts.y,
      bold: true,
      borderBottom: true,
    },
    ...Object.keys(out).map((category, idx) => {
      const value = out[category].reduce((acc, a) => addFP(acc, a.balance), 0);
      totalPropertyAndEquipment = addFP(totalPropertyAndEquipment, value);
      return {
        name: category,
        value,
        borderBottom: idx === assetCategories.length - 1,
      };
    }),
    {
      name: 'Total property and equipment',
      value: totalPropertyAndEquipment,
      borderBottom: true,
    },
    {
      name: 'Less accumulated depreciation',
      value: totalAccumulatedDepreciation,
      borderBottom: true,
    },
    {
      name: 'Property and equipment, net',
      value: addFP(totalPropertyAndEquipment, totalAccumulatedDepreciation),
      borderBottom: true,
    },
  ];
}

export async function buildStatementOfOperations(data: AuditData) {
  const statementOfOps = normalizeStatementOfOps(data.totals);

  return [
    {
      name: `As of ${data.fiscalYearEndParts.md},`,
      value: data.fiscalYearEndParts.y,
      bold: true,
      borderBottom: true,
    },
    {
      name: 'Operating expenses:',
      padTop: true,
    },
    {
      name: 'Research and development',
      value: statementOfOps.opEx.rAndD,
      indent: true,
    },
    {
      name: 'General and administrative',
      value: statementOfOps.opEx.gAndA,
      indent: true,
    },
    {
      name: 'Total operating expenses',
      value: statementOfOps.totalOpEx,
      indent: true,
    },
    {
      name: 'Loss from operations',
      value: statementOfOps.lossFromOps,
    },
    {
      name: 'Other income (expense), net:',
    },
    {
      name: 'Interest expense, net',
      value: statementOfOps.otherIncomeExpenseNet.interestExpenseNet,
      indent: true,
    },
    {
      name: 'Other income, net',
      value: statementOfOps.otherIncomeExpenseNet.otherIncomeNet,
      indent: true,
    },
    {
      name: 'Total other income (expense), net',
      value: statementOfOps.totalOtherIncomeExpenseNet,
    },
    {
      name: 'Net loss',
      value: statementOfOps.netLoss,
    },
  ];
}
