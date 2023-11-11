import { AccountType } from '@/types';

// move to account-mapping
export const balanceSheetTypes: Record<AccountType, string> = {
  ASSET_CASH: 'Cash',
  ASSET_PREPAID_EXPENSES: 'Prepaid expenses and other current assets',
  ASSET_PROPERTY_AND_EQUIPMENT: 'Property and equipment, net',
  ASSET_INTANGIBLE_ASSETS: 'Intangible assets, net',
  ASSET_OPERATING_LEASE_RIGHT_OF_USE: 'Operating lease right-of-use assets',
  ASSET_OTHER: 'Other assets',

  LIABILITY_ACCOUNTS_PAYABLE: 'Accounts payable',
  LIABILITY_ACCRUED_EXPENSES: 'Accrued expenses',
  LIABILITY_OPERATING_LEASE_LIABILITIES_CURRENT:
    'Operating lease liabilities, current',
  LIABILITY_ACCRUED_INTEREST: 'Accrued interest',
  LIABILITY_CONVERTIBLE_NOTES_PAYABLE: 'Convertible notes payable',
  LIABILITY_OPERATING_LEASE_LIABILITIES_NET_OF_CURRENT_PORTION:
    'Operating lease liabilities, net of current portion',

  EQUITY_PREFERRED_STOCK: 'Convertible preferred stock',
  EQUITY_COMMON_STOCK: 'Common stock',
  EQUITY_PAID_IN_CAPITAL: 'Additional paid-in capital',
  EQUITY_ACCUMULATED_DEFICIT: 'Accumulated deficit',
};

interface FinancialElement {
  //   name: string;
  //   group?: string;
  value: number;
  currency: 'USD';
  timestamp: Date;
  type: AccountType;
  //subsidiary?: string;
}

interface Asset extends FinancialElement {}
interface Liability extends FinancialElement {}
interface Equity extends FinancialElement {}

class ConsolidatedBalanceSheet {
  assets: Asset[] = [];
  liabilities: Liability[] = [];
  equities: Equity[] = [];

  // Function to add assets, for example
  addAsset(asset: Asset) {
    this.assets.push(asset);
  }

  // Other similar functions can go here

  // Consolidation Logic
  consolidate(targetCurrency: string = 'USD') {
    // Implement logic to handle:
    // 1. Currency conversions
    // 2. Inter-company eliminations
    // 3. Time-based aggregation
    // Your advanced algorithms here
    const consolidatedAssets: Record<string, number> = {};
    const consolidatedLiabilities: Record<string, number> = {};
    const consolidatedEquities: Record<string, number> = {};

    // Consolidate Assets
    this.assets.forEach((asset) => {
      const valueInTargetCurrency = convertCurrency(
        asset.value,
        asset.currency,
        targetCurrency,
      );
      if (consolidatedAssets[asset.type]) {
        consolidatedAssets[asset.type] += valueInTargetCurrency;
      } else {
        consolidatedAssets[asset.type] = valueInTargetCurrency;
      }
    });
    //console.log(consolidatedAssets);
  }
}

function convertCurrency(
  value: number,
  sourceCurrency: string,
  targetCurrency: string,
): number {
  // Your currency conversion logic here
  // Mock conversion for demonstration
  return value * 1; // Assume a 1:1 conversion for demonstration
}

// const bs = new ConsolidatedBalanceSheet();
// bs.addAsset({
//   type: 'ASSET_PREPAID_EXPENSES',
//   value: 25979389,
//   currency: 'USD',
//   timestamp: new Date('2020-12-31'),
// });
// bs.addAsset({
//   type: 'ASSET_PROPERTY_AND_EQUIPMENT',
//   value: 11164032,
//   currency: 'USD',
//   timestamp: new Date('2020-12-31'),
// });
// bs.addAsset({
//   type: 'ASSET_INTANGIBLE_ASSETS',
//   value: 346801,
//   currency: 'USD',
//   timestamp: new Date('2020-12-31'),
// });
// bs.addAsset({
//   type: 'ASSET_OPERATING_LEASE_RIGHT_OF_USE',
//   value: 3800326,
//   currency: 'USD',
//   timestamp: new Date('2020-12-31'),
// });
// bs.addAsset({
//   type: 'ASSET_OTHER',
//   value: 162656,
//   currency: 'USD',
//   timestamp: new Date('2020-12-31'),
// });
// bs.consolidate();
