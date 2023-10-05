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
