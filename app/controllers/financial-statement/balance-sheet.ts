import {
  getLastDayOfMonth,
  getMonthName,
  kebabToCamel,
  ppCurrency,
} from '@/lib/util';

import type { AuditData } from '../audit-output';
import type { AuditId } from '@/types';

export async function get(auditId: AuditId) {
  const assets = {
    currentAssets: {
      cash: 25979389,
      other: 873839,
    },
    totalCurrentAssets: 0, // computed
    property: 11164032,
    intangible: 346801,
    operatingLeaseRightOfUse: 3800326,
    other: 162656,
    total: 0, // computed
  };
  assets.totalCurrentAssets =
    assets.currentAssets.cash + assets.currentAssets.other;

  assets.total =
    assets.totalCurrentAssets +
    assets.property +
    assets.intangible +
    assets.operatingLeaseRightOfUse +
    assets.other;

  const liabilities = {
    current: {
      accountsPayable: 25979389,
      accrued: 873839,
      operatingLease: 873839,
    },
    totalCurrent: 0, // computed
    accruedInterest: 11164032,
    converableNotes: 346801,
    operatingLease: 3800326,
    total: 0, // computed
  };
  liabilities.totalCurrent =
    liabilities.current.accountsPayable +
    liabilities.current.accrued +
    liabilities.current.operatingLease;

  liabilities.total =
    liabilities.totalCurrent +
    liabilities.accruedInterest +
    liabilities.converableNotes +
    liabilities.operatingLease;
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
