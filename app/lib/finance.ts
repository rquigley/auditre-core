export const accountTypes = {
  ASSET_CASH_AND_CASH_EQUIVALENTS: 'Cash and cash equivalents',
  ASSET_INTANGIBLE_ASSETS: 'Intangible assets, net',
  ASSET_INVENTORY: 'Inventory',
  ASSET_OPERATING_LEASE_RIGHT_OF_USE: 'Operating lease right-of-use assets',
  ASSET_CURRENT_OTHER: 'Other current assets',
  ASSET_OTHER: 'Other assets',
  ASSET_PREPAID_EXPENSES: 'Prepaid expenses',
  ASSET_PROPERTY_AND_EQUIPMENT: 'Property and equipment, net',

  LIABILITY_ACCOUNTS_PAYABLE: 'Accounts payable',
  LIABILITY_ACCRUED_INTEREST: 'Accrued interest',
  LIABILITY_ACCRUED_LIABILITIES: 'Accrued liabilities',
  LIABILITY_CONVERTIBLE_NOTES_PAYABLE: 'Convertible notes payable',
  LIABILITY_DEBT: 'Long-term debt',
  LIABILITY_DEFERRED_REVENUE: 'Deferred revenue',
  LIABILITY_OPERATING_LEASE_LIABILITIES_CURRENT:
    'Operating lease liabilities, current',
  LIABILITY_OPERATING_LEASE_LIABILITIES_NET_OF_CURRENT_PORTION:
    'Operating lease liabilities, net of current portion',
  LIABILITY_OTHER: 'Other current liabilities',

  EQUITY_ACCUMULATED_DEFICIT: 'Accumulated deficit',
  EQUITY_COMMON_STOCK: 'Common stock',
  EQUITY_PAID_IN_CAPITAL: 'Additional paid-in capital',
  EQUITY_PREFERRED_STOCK: 'Convertible preferred stock',
  EQUITY_RETAINED_EARNINGS: 'Retained earnings',

  INCOME_STATEMENT_COST_OF_REVENUE: 'Cost of revenue',
  INCOME_STATEMENT_G_AND_A: 'General and administrative',
  INCOME_STATEMENT_INTEREST_EXPENSE: 'Interest expense',
  INCOME_STATEMENT_INTEREST_INCOME: 'Interest income',
  INCOME_STATEMENT_OTHER_INCOME: 'Other income',
  INCOME_STATEMENT_RESEARCH_AND_DEVELOPMENT: 'Research and development',
  INCOME_STATEMENT_REVENUE: 'Revenue',
  INCOME_STATEMENT_SALES_AND_MARKETING: 'Sales and marketing',
  INCOME_TAXES: 'Income taxes',
  INCOME_STATEMENT_TAXES: 'Income taxes',

  INTERCOMPANY: 'Intercompany',

  UNKNOWN: `You are unsure of the account type or it doesn't map to one of the other values`,
} as const;

export type AccountType = keyof typeof accountTypes;

export class AccountMap {
  private map: Map<AccountType, number>;

  constructor(
    aTypes: AccountType[],
    initialPairs?: { accountType: AccountType; balance: number }[],
  ) {
    this.map = new Map(aTypes.map((aType) => [aType, 0])) as Map<
      AccountType,
      number
    >;

    if (initialPairs) {
      initialPairs.forEach((pair) => {
        if (!aTypes.includes(pair.accountType)) {
          throw new Error('Invalid account type');
        }
        this.map.set(pair.accountType, Number(pair.balance));
      });
    }
  }

  set(key: AccountType, value: number): void {
    if (!this.map.has(key)) {
      throw new Error(
        `key is not one of ${Array.from(this.map.keys())}: ${key}`,
      );
    }
    this.map.set(key, value);
  }

  get(key: AccountType): number {
    if (!this.map.has(key)) {
      throw new Error(
        `key is not one of ${Array.from(this.map.keys())}: ${key}`,
      );
    }
    return this.map.get(key) || 0;
  }

  get size(): number {
    return this.map.size;
  }
}

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

export function getGroupLabel(group: AccountTypeGroup) {
  return groupLabels[group];
}
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

export function accountTypeToGroup(
  type: AccountType | 'UNKNOWN' | null,
): AccountTypeGroup | 'UNKNOWN' {
  if (!type) {
    return 'UNKNOWN';
  }
  if (type.startsWith('ASSET_')) {
    return 'ASSET';
  } else if (type.startsWith('LIABILITY_')) {
    return 'LIABILITY';
  } else if (type.startsWith('EQUITY_')) {
    return 'EQUITY';
  } else if (type.startsWith('INCOME_STATEMENT_')) {
    return 'INCOME_STATEMENT';
  }
  return 'UNKNOWN';
}

export function getAccountTypes() {
  return accountTypes;
}

export function accountTypeGroupToLabel(
  type: AccountTypeGroup,
): (typeof groupLabels)[AccountTypeGroup] {
  return groupLabels[type];
}
