export function sortRows<
  T extends {
    accountName: string;
    accountType: string;
    balance1: number;
    balance2: number;
    balance3: number;
    sortIdx: number;
  },
>(
  rows: Array<T>,
  currentSort: string | undefined,
  currentOrder: string | undefined,
): T[] {
  if (currentSort === null) {
    return rows;
  }
  return rows.toSorted((a, b) => {
    if (currentSort === 'account') {
      if (currentOrder === 'desc') {
        return b.accountName.localeCompare(a.accountName);
      } else {
        return a.accountName.localeCompare(b.accountName);
      }
    }
    if (currentSort === 'account-type') {
      if (currentOrder === 'desc') {
        return b.accountType.localeCompare(a.accountType);
      } else {
        return a.accountType.localeCompare(b.accountType);
      }
    }
    if (currentSort === 'balance1') {
      if (currentOrder === 'desc') {
        return b.balance1 - a.balance1;
      } else {
        return a.balance1 - b.balance1;
      }
    }
    if (currentSort === 'balance2') {
      if (currentOrder === 'desc') {
        return b.balance2 - a.balance2;
      } else {
        return a.balance2 - b.balance2;
      }
    }
    if (currentSort === 'balance3') {
      if (currentOrder === 'desc') {
        return b.balance3 - a.balance3;
      } else {
        return a.balance3 - b.balance3;
      }
    }
    return a.sortIdx - b.sortIdx;
  });
}

export const accountTypeGroupBGColors = {
  ASSET: 'bg-lime-100',
  LIABILITY: 'bg-sky-100',
  EQUITY: 'bg-violet-100',
  INCOME_STATEMENT: 'bg-amber-100',
  UNKNOWN: 'bg-rose-100 ring-red-600 text-red-900',
  OTHER: 'bg-white',
} as const;
