export function sortRows<
  T extends {
    account: string;
    accountType: string;
    credit: number;
    debit: number;
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
        return b.account.localeCompare(a.account);
      } else {
        return a.account.localeCompare(b.account);
      }
    }
    if (currentSort === 'account-type') {
      if (currentOrder === 'desc') {
        return b.accountType.localeCompare(a.accountType);
      } else {
        return a.accountType.localeCompare(b.accountType);
      }
    }
    if (currentSort === 'credit') {
      if (currentOrder === 'desc') {
        return b.credit - a.credit;
      } else {
        return a.credit - b.credit;
      }
    }
    if (currentSort === 'debit') {
      if (currentOrder === 'desc') {
        return b.debit - a.debit;
      } else {
        return a.debit - b.debit;
      }
    }
    return a.sortIdx - b.sortIdx;
  });
}
