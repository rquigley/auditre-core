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
