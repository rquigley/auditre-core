import { AccountMap, accountTypes } from '@/controllers/account-mapping';

// import { normalizeBalanceSheet } from '../table';

import type { AccountType } from '@/controllers/account-mapping';

// describe('normalizeBalanceSheet', () => {
//   it('should calculate total current assets correctly', () => {
//     const t = new AccountMap(Object.keys(accountTypes) as AccountType[]);

//     t.set('ASSET_CASH_AND_CASH_EQUIVALENTS', 100);
//     t.set('ASSET_OTHER', 200);

//     t.set('ASSET_PROPERTY_AND_EQUIPMENT', 300);
//     t.set('ASSET_INTANGIBLE_ASSETS', 400);
//     t.set('ASSET_OPERATING_LEASE_RIGHT_OF_USE', 500);

//     const result = normalizeBalanceSheet(t);

//     expect(result.assets.totalCurrentAssets).toBe(300);
//     expect(result.assets.total).toBe(1700);
//   });

//   it('should calculate total liabilities correctly', () => {
//     const t = new AccountMap(Object.keys(accountTypes) as AccountType[]);

//     t.set('LIABILITY_ACCOUNTS_PAYABLE', 700);
//     t.set('LIABILITY_ACCRUED_LIABILITIES', 800);
//     t.set('LIABILITY_OPERATING_LEASE_LIABILITIES_CURRENT', 900);

//     t.set('LIABILITY_ACCRUED_INTEREST', 1000);
//     t.set('LIABILITY_CONVERTIBLE_NOTES_PAYABLE', 1100);
//     t.set('LIABILITY_OPERATING_LEASE_LIABILITIES_NET_OF_CURRENT_PORTION', 1200);

//     const result = normalizeBalanceSheet(t);

//     expect(result.liabilities.totalCurrent).toBe(2400);
//     expect(result.liabilities.total).toBe(5700);
//     expect(result.totalLiabilitiesAndStockholdersDeficit).toBe(5700);
//   });

//   it('should calculate total equity correctly', () => {
//     const t = new AccountMap(Object.keys(accountTypes) as AccountType[]);

//     t.set('EQUITY_PREFERRED_STOCK', 1300);
//     t.set('EQUITY_COMMON_STOCK', 1400);
//     t.set('EQUITY_PAID_IN_CAPITAL', 1500);
//     t.set('EQUITY_RETAINED_EARNINGS', 1600);
//     t.set('EQUITY_ACCUMULATED_DEFICIT', 1700);

//     const result = normalizeBalanceSheet(t);

//     expect(result.totalStockholdersDeficit).toBe(7500);
//     expect(result.totalLiabilitiesAndStockholdersDeficit).toBe(7500);
//   });
// });
