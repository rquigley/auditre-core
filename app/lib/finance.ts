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

export function groupAccountTypes(
  types: Record<string, string>,
): Record<string, Record<string, string>> {
  const grouped: Record<string, Record<string, any>> = {
    Asset: {},
    Liability: {},
    Equity: {},
    'Income Statement': {},
  };

  for (const key in types) {
    if (key.startsWith('ASSET_')) {
      grouped.Asset[key] = types[key];
    } else if (key.startsWith('LIABILITY_')) {
      grouped.Liability[key] = types[key];
    } else if (key.startsWith('EQUITY_')) {
      grouped.Equity[key] = types[key];
    } else if (key.startsWith('INCOME_STATEMENT_')) {
      grouped['Income Statement'][key] = types[key];
    }
  }

  return grouped;
}
