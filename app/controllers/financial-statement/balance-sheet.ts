import { getBalancesByAccountType } from '@/controllers/account-mapping';
import { getLastDayOfMonth, getMonthName, ppCurrency } from '@/lib/util';

import type { AuditData } from '../audit-output';
import type { AuditId } from '@/types';

function addFP(...args: number[]) {
  return args.reduce((existing, x) => existing + x * 1000, 0) / 1000;
}

export async function get(auditId: AuditId) {
  const t = await getBalancesByAccountType(auditId);
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
  return {
    assets,
    liabilities,
  };
}

export function buildBalanceSheet(
  data: AuditData,
  buildTableRow: any,
): React.ReactNode {
  const fiscalCloseStr = `As of ${getMonthName(
    data.auditInfo.fiscalYearMonthEnd,
  )} ${getLastDayOfMonth(
    data.auditInfo.fiscalYearMonthEnd,
    data.auditInfo.year,
  )},`;

  let idx = 0;
  return [
    buildTableRow({
      key: idx++,
      name: fiscalCloseStr,
      value: data.auditInfo.year,
      bold: true,
      borderBottom: true,
    }),
    buildTableRow({
      key: idx++,
      name: 'Assets',
      bold: true,
      padTop: true,
    }),
    buildTableRow({
      key: idx++,
      name: 'Current assets:',
      padTop: true,
    }),
    buildTableRow({
      key: idx++,
      name: 'Cash',
      value: ppCurrency(data.balanceSheet.assets.currentAssets.cash),
      indent: true,
    }),
    buildTableRow({
      key: idx++,
      name: 'Prepaid expenses and other current assets',
      value: ppCurrency(data.balanceSheet.assets.currentAssets.other),
      indent: true,
      borderBottom: true,
    }),
    buildTableRow({
      key: idx++,
      name: 'Total current assets',
      value: ppCurrency(data.balanceSheet.assets.totalCurrentAssets),
      borderBottom: true,
      padTop: true,
    }),
    buildTableRow({
      key: idx++,
      name: 'Property and equipment, net',
      value: ppCurrency(data.balanceSheet.assets.property),
    }),
    buildTableRow({
      key: idx++,
      name: 'Intangible assets, net',
      value: ppCurrency(data.balanceSheet.assets.intangible),
    }),
    buildTableRow({
      key: idx++,
      name: 'Operating lease right-of-use assets',
      value: ppCurrency(data.balanceSheet.assets.operatingLeaseRightOfUse),
    }),
    buildTableRow({
      key: idx++,
      name: 'Other assets',
      value: ppCurrency(data.balanceSheet.assets.other),
      borderBottom: true,
    }),
    buildTableRow({
      key: idx++,
      name: 'Total assets',
      value: ppCurrency(data.balanceSheet.assets.total),
      bold: true,
      borderBottom: true,
      padTop: true,
    }),

    buildTableRow({
      key: idx++,
      name: 'Liabilities and Stockholders’ Deficit',
      bold: true,
      padTop: true,
    }),
    buildTableRow({
      key: idx++,
      name: 'Current liabilities:',
      padTop: true,
    }),
    buildTableRow({
      key: idx++,
      name: 'Accounts payable',
      value: ppCurrency(data.balanceSheet.liabilities.current.accountsPayable),
      indent: true,
    }),
    buildTableRow({
      key: idx++,
      name: 'Accrued liabilities',
      value: ppCurrency(data.balanceSheet.liabilities.current.accrued),
      indent: true,
    }),
    buildTableRow({
      key: idx++,
      name: 'Operating lease liabilities, current',
      value: ppCurrency(data.balanceSheet.liabilities.current.operatingLease),
      indent: true,
      borderBottom: true,
    }),
    buildTableRow({
      key: idx++,
      name: 'Total current liabilities',
      value: ppCurrency(data.balanceSheet.liabilities.totalCurrent),
      borderBottom: true,
      padTop: true,
    }),
    buildTableRow({
      key: idx++,
      name: 'Accrued interest',
      value: ppCurrency(data.balanceSheet.liabilities.accruedInterest),
      indent: true,
    }),
    buildTableRow({
      key: idx++,
      name: 'Convertible notes payable',
      value: ppCurrency(data.balanceSheet.liabilities.converableNotes),
      indent: true,
    }),
    buildTableRow({
      key: idx++,
      name: 'Operating lease liabilities, net of current portion',
      value: ppCurrency(data.balanceSheet.liabilities.operatingLease),
      indent: true,
    }),
    buildTableRow({
      key: idx++,
      name: 'Total liabilities',
      value: ppCurrency(data.balanceSheet.liabilities.total),
      bold: true,
      borderBottom: true,
      padTop: true,
    }),
  ];
}
