import {
  accountTypes,
  getAllAccountMappingsByAuditId,
} from '@/controllers/account-mapping';
import { AccountMapping } from './account-mapping';

import type { AccountType, AuditId } from '@/types';

export async function TrialBalance({ auditId }: { auditId: AuditId }) {
  const accountMapping = await getAllAccountMappingsByAuditId(auditId);
  const aTypes = groupAccountTypes(accountTypes);

  return (
    <div className="mt-8">
      <table className="min-w-full divide-y divide-gray-300">
        <thead>
          <tr>
            <th
              scope="col"
              className="whitespace-nowrap py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0"
            >
              Account Id
            </th>
            <th
              scope="col"
              className="whitespace-nowrap px-2 py-3.5 text-left text-sm font-semibold text-gray-900"
            >
              Account Name
            </th>
            <th
              scope="col"
              className="whitespace-nowrap px-2 py-3.5 text-left text-sm font-semibold text-gray-900"
            >
              Mapped to
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {accountMapping.length === 0 ? (
            <tr>
              <td
                colSpan={3}
                className="px-2 py-2 text-sm font-medium text-gray-900"
              >
                No accounts found
              </td>
            </tr>
          ) : (
            accountMapping.map((am) => (
              <tr key={am.id}>
                <td className="w-30 py-2 pl-4 pr-3 text-sm text-gray-500 sm:pl-0">
                  {am.accountNumber}
                </td>
                <td className="w-30 px-2 py-2 text-sm font-medium text-gray-900">
                  {am.accountName}
                </td>
                <td className="w-full whitespace-nowrap px-2 py-2 text-sm text-gray-900">
                  <AccountMapping
                    auditId={auditId}
                    accountMappingId={am.id}
                    accountType={am.accountType}
                    accountTypes={aTypes}
                  />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function groupAccountTypes(
  types: Record<string, string>,
): Record<string, Record<string, string>> {
  const grouped: Record<string, Record<string, any>> = {
    Asset: {},
    Liability: {},
    Equity: {},
  };

  for (const key in types) {
    if (key.startsWith('ASSET_')) {
      grouped.Asset[key] = types[key];
    } else if (key.startsWith('LIABILITY_')) {
      grouped.Liability[key] = types[key];
    } else if (key.startsWith('EQUITY_')) {
      grouped.Equity[key] = types[key];
    }
  }

  return grouped;
}
