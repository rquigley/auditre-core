import React from 'react';

import { AccountType } from '@/controllers/account-mapping';
import { addFP, getLastDayOfMonth, getMonthName, ppCurrency } from '@/lib/util';

import type { AuditData } from '../audit-output';

export type BuildTableRowArgs = {
  name: string;
  value?: string;
  bold?: boolean;
  indent?: boolean;
  padTop?: boolean;
  borderBottom?: boolean;
  key?: React.Key;
};

function buildTable<T>(
  buildTableRow: (args: BuildTableRowArgs) => T,
  arr: BuildTableRowArgs[],
) {
  return arr.map((row: BuildTableRowArgs, idx: number) => {
    return buildTableRow({
      ...row,
      key: idx,
    });
  });
}

export function normalizeBalanceSheet(t: Map<AccountType, number>) {
  const assets = {
    // TODO:
    // - ASSET_INVENTORY
    // - ASSET_PREPAID_EXPENSES
    currentAssets: {
      cash: t.get('ASSET_CASH_AND_CASH_EQUIVALENTS') || 0,
      other: t.get('ASSET_OTHER') || 0,
    },
    totalCurrentAssets: 0, // computed
    property: t.get('ASSET_PROPERTY_AND_EQUIPMENT') || 0,
    intangible: t.get('ASSET_INTANGIBLE_ASSETS') || 0,
    operatingLeaseRightOfUse: t.get('ASSET_OPERATING_LEASE_RIGHT_OF_USE') || 0,
    other: t.get('ASSET_OTHER') || 0,
    total: 0, // computed
  };
  assets.totalCurrentAssets = addFP(
    assets.currentAssets.cash,
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
    // TODO:
    // - LIABILITY_DEBT
    // - LIABILITY_DEFERRED_REVENUE
    // - LIABILITY_OTHER
    current: {
      accountsPayable: t.get('LIABILITY_ACCOUNTS_PAYABLE') || 0,
      accrued: t.get('LIABILITY_ACCRUED_LIABILITIES') || 0,
      operatingLease:
        t.get('LIABILITY_OPERATING_LEASE_LIABILITIES_CURRENT') || 0,
    },
    totalCurrent: 0, // computed
    accruedInterest: t.get('LIABILITY_ACCRUED_INTEREST') || 0,
    converableNotes: t.get('LIABILITY_CONVERTIBLE_NOTES_PAYABLE') || 0,
    operatingLease:
      t.get('LIABILITY_OPERATING_LEASE_LIABILITIES_NET_OF_CURRENT_PORTION') ||
      0,
    total: 0, // computed
  };
  liabilities.totalCurrent = addFP(
    liabilities.current.accountsPayable,
    liabilities.current.accrued,
    liabilities.current.operatingLease,
  );

  liabilities.total = addFP(
    liabilities.totalCurrent,
    liabilities.accruedInterest,
    liabilities.converableNotes,
    liabilities.operatingLease,
  );

  const equity = {
    preferredStock: t.get('EQUITY_PREFERRED_STOCK') || 0,
    commonStock: t.get('EQUITY_COMMON_STOCK') || 0,
    paidInCapital: t.get('EQUITY_PAID_IN_CAPITAL') || 0,
    retainedEarnings: t.get('EQUITY_RETAINED_EARNINGS') || 0,
    accumulatedDeficit: t.get('EQUITY_ACCUMULATED_DEFICIT') || 0,
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

export function buildBalanceSheet<T>(
  data: AuditData,
  buildTableRow: (args: BuildTableRowArgs) => T,
): T[] {
  const fiscalCloseStr = `As of ${getMonthName(
    data.auditInfo.fiscalYearMonthEnd,
  )} ${getLastDayOfMonth(
    data.auditInfo.fiscalYearMonthEnd,
    data.auditInfo.year,
  )},`;

  return buildTable(buildTableRow, [
    {
      name: fiscalCloseStr,
      value: data.auditInfo.year,
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
      value: ppCurrency(data.balanceSheet.assets.currentAssets.cash),
      indent: true,
    },
    {
      name: 'Prepaid expenses and other current assets',
      value: ppCurrency(data.balanceSheet.assets.currentAssets.other),
      indent: true,
      borderBottom: true,
    },
    {
      name: 'Total current assets',
      value: ppCurrency(data.balanceSheet.assets.totalCurrentAssets),
      borderBottom: true,
      padTop: true,
    },
    {
      name: 'Property and equipment, net',
      value: ppCurrency(data.balanceSheet.assets.property),
    },
    {
      name: 'Intangible assets, net',
      value: ppCurrency(data.balanceSheet.assets.intangible),
    },
    {
      name: 'Operating lease right-of-use assets',
      value: ppCurrency(data.balanceSheet.assets.operatingLeaseRightOfUse),
    },
    {
      name: 'Other assets',
      value: ppCurrency(data.balanceSheet.assets.other),
      borderBottom: true,
    },
    {
      name: 'Total assets',
      value: ppCurrency(data.balanceSheet.assets.total),
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
      value: ppCurrency(data.balanceSheet.liabilities.current.accountsPayable),
      indent: true,
    },
    {
      name: 'Accrued liabilities',
      value: ppCurrency(data.balanceSheet.liabilities.current.accrued),
      indent: true,
    },
    {
      name: 'Operating lease liabilities, current',
      value: ppCurrency(data.balanceSheet.liabilities.current.operatingLease),
      indent: true,
      borderBottom: true,
    },
    {
      name: 'Total current liabilities',
      value: ppCurrency(data.balanceSheet.liabilities.totalCurrent),
      borderBottom: true,
      padTop: true,
    },
    {
      name: 'Accrued interest',
      value: ppCurrency(data.balanceSheet.liabilities.accruedInterest),
      indent: true,
    },
    {
      name: 'Convertible notes payable',
      value: ppCurrency(data.balanceSheet.liabilities.converableNotes),
      indent: true,
    },
    {
      name: 'Operating lease liabilities, net of current portion',
      value: ppCurrency(data.balanceSheet.liabilities.operatingLease),
      indent: true,
      borderBottom: true,
    },
    {
      name: 'Total liabilities',
      value: ppCurrency(data.balanceSheet.liabilities.total),
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
      value: ppCurrency(data.balanceSheet.equity.preferredStock),
      indent: true,
    },
    {
      name: 'Common stock',
      value: ppCurrency(data.balanceSheet.equity.commonStock),
      indent: true,
    },
    {
      name: 'Paid-in capital',
      value: ppCurrency(data.balanceSheet.equity.paidInCapital),
      indent: true,
    },
    {
      name: 'Retained earnings',
      value: ppCurrency(data.balanceSheet.equity.retainedEarnings),
      indent: true,
    },
    {
      name: 'Accumulated deficit',
      value: ppCurrency(data.balanceSheet.equity.accumulatedDeficit),
      indent: true,
      borderBottom: true,
    },
    {
      name: 'Total stockholders’ deficit',
      value: ppCurrency(data.balanceSheet.totalStockholdersDeficit),
      bold: true,
      borderBottom: true,
      padTop: true,
    },
    {
      name: 'Total liabilities and stockholders’ deficit',
      value: ppCurrency(
        data.balanceSheet.totalLiabilitiesAndStockholdersDeficit,
      ),
      bold: true,
      borderBottom: true,
      padTop: true,
    },
  ]);
}

export function normalizeStatementOfOps(t: Map<AccountType, number>) {
  let ret = {
    opEx: {
      rAndD: t.get('INCOME_STATEMENT_RESEARCH_AND_DEVELOPMENT') || 0,
      gAndA: t.get('INCOME_STATEMENT_G_AND_A') || 0,
    },
    totalOpEx: 0, // computed
    lossFromOps: 0, // computed
    otherIncomeExpenseNet: {
      interestExpenseNet: t.get('INCOME_STATEMENT_INTEREST_EXPENSE') || 0,
      otherIncomeNet: t.get('INCOME_STATEMENT_OTHER_INCOME') || 0,
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

export function buildStatementOfOperations<T>(
  data: AuditData,
  buildTableRow: (args: BuildTableRowArgs) => T,
): T[] {
  const fiscalCloseStr = `As of ${getMonthName(
    data.auditInfo.fiscalYearMonthEnd,
  )} ${getLastDayOfMonth(
    data.auditInfo.fiscalYearMonthEnd,
    data.auditInfo.year,
  )},`;

  return buildTable(buildTableRow, [
    {
      name: fiscalCloseStr,
      value: data.auditInfo.year,
      bold: true,
      borderBottom: true,
    },
    {
      name: 'Operating expenses:',
      padTop: true,
    },
    {
      name: 'Research and development',
      value: ppCurrency(data.statementOfOps.opEx.rAndD),
      indent: true,
    },
    {
      name: 'General and administrative',
      value: ppCurrency(data.statementOfOps.opEx.gAndA),
      indent: true,
    },
    {
      name: 'Total operating expenses',
      value: ppCurrency(data.statementOfOps.totalOpEx),
      indent: true,
    },
    {
      name: 'Loss from operations',
      value: ppCurrency(data.statementOfOps.lossFromOps),
    },
    {
      name: 'Other income (expense), net:',
    },
    {
      name: 'Interest expense, net',
      value: ppCurrency(
        data.statementOfOps.otherIncomeExpenseNet.interestExpenseNet,
      ),
      indent: true,
    },
    {
      name: 'Other income, net',
      value: ppCurrency(
        data.statementOfOps.otherIncomeExpenseNet.otherIncomeNet,
      ),
      indent: true,
    },
    {
      name: 'Total other income (expense), net',
      value: ppCurrency(data.statementOfOps.totalOtherIncomeExpenseNet),
    },
    {
      name: 'Net loss',
      value: ppCurrency(data.statementOfOps.netLoss),
    },
  ]);
}
