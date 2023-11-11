import { db } from '@/lib/db';
import { AccountType } from '@/types';

import type {
  AccountMapping,
  AccountMappingId,
  AccountMappingUpdate,
  AuditId,
  NewAccountMapping,
} from '@/types';

export const accountTypes: Record<AccountType, string> = {
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

export function createAccountMapping(
  accountMapping: NewAccountMapping,
): Promise<AccountMapping | undefined> {
  return db
    .insertInto('accountMapping')
    .values({ ...accountMapping })
    .onConflict((oc) =>
      oc
        .columns(['auditId', 'accountNumber', 'accountName', 'documentId'])
        .doNothing(),
    )
    .returningAll()
    .executeTakeFirst();
}

export function getAccountMappingById(
  id: AccountMappingId,
): Promise<AccountMapping> {
  return db
    .selectFrom('accountMapping')
    .where('id', '=', id)
    .where('isDeleted', '=', false)
    .selectAll()
    .executeTakeFirstOrThrow();
}

export type AccountMappingAll = Pick<
  AccountMapping,
  'id' | 'documentId' | 'accountNumber' | 'accountName' | 'accountType'
>;
export function getAllAccountMappingsByAuditId(
  auditId: AuditId,
): Promise<AccountMappingAll[]> {
  return db
    .selectFrom('accountMapping')
    .select(['id', 'documentId', 'accountNumber', 'accountName', 'accountType'])
    .where('auditId', '=', auditId)
    .where('isDeleted', '=', false)
    .execute();
}

export function updateAccountMapping(
  id: AccountMappingId,
  updateWith: AccountMappingUpdate,
) {
  return db
    .updateTable('accountMapping')
    .set(updateWith)
    .where('id', '=', id)
    .execute();
}
