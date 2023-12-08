export function groupFixedAccountsByCategories(
  accounts: { name: string; balance: number }[],
  categories: string[],
): Record<string, { name: string; balance: number }[]> {
  const result: Record<string, { name: string; balance: number }[]> = {};
  for (const category of categories) {
    result[category] = [];
  }
  for (const account of accounts) {
    const category = categories.find((c) => account.name.includes(c));
    if (category) {
      result[category].push(account);
    }
  }
  return result;
}

export const groupLabels = {
  ASSET: 'Asset',
  LIABILITY: 'Liability',
  EQUITY: 'Equity',
  INCOME_STATEMENT: 'Income Statement',
} as const;
export type AccountTypeGroup = keyof typeof groupLabels;

export function groupAccountTypes(types: Record<string, string>) {
  const grouped: Record<AccountTypeGroup, Record<string, any>> = {
    ASSET: {},
    LIABILITY: {},
    EQUITY: {},
    INCOME_STATEMENT: {},
  };

  for (const key in types) {
    if (key.startsWith('ASSET_')) {
      grouped.ASSET[key] = types[key];
    } else if (key.startsWith('LIABILITY_')) {
      grouped.LIABILITY[key] = types[key];
    } else if (key.startsWith('EQUITY_')) {
      grouped.EQUITY[key] = types[key];
    } else if (key.startsWith('INCOME_STATEMENT_')) {
      grouped.INCOME_STATEMENT[key] = types[key];
    }
  }

  return grouped;
}

export function accountTypeGroupToLabel(type: AccountTypeGroup): string {
  return groupLabels[type];
}
