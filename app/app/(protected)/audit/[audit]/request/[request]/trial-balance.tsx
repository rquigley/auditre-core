import { Inconsolata } from 'next/font/google';

import { SecondaryButton } from '@/components/button';
import {
  accountTypes,
  getAllAccountBalancesByAuditId,
} from '@/controllers/account-mapping';
import { extractTrialBalance } from '@/lib/actions';
import { ppCurrency } from '@/lib/util';

import type { AuditId } from '@/types';

export const financeFont = Inconsolata({
  subsets: ['latin'],
  display: 'swap',
});
export async function TrialBalance({ auditId }: { auditId: AuditId }) {
  const accountMapping = await getAllAccountBalancesByAuditId(auditId);

  return (
    <div className="mt-8">
      <table className="min-w-full divide-y divide-gray-300">
        <thead>
          <tr>
            <th
              scope="col"
              className="whitespace-nowrap py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0"
            >
              Account
            </th>
            <th
              scope="col"
              className="whitespace-nowrap px-2 py-3.5 text-left text-sm font-semibold text-gray-900"
            >
              Mapped to
            </th>
            <th
              scope="col"
              className="whitespace-nowrap min-w-min px-2 py-3.5 text-right text-sm font-semibold text-gray-900"
            >
              Credit
            </th>
            <th
              scope="col"
              className="whitespace-nowrap min-w-min px-2 py-3.5 text-right text-sm font-semibold text-gray-900"
            >
              Debit
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {accountMapping.length === 0 ? (
            <tr>
              <td
                colSpan={4}
                className="px-2 py-2 text-sm font-medium text-gray-900"
              >
                No accounts found
              </td>
            </tr>
          ) : (
            accountMapping.map((am) => (
              <tr key={am.id}>
                <td className="w-30 py-2 pl-4 pr-3 text-sm text-gray-500 sm:pl-0">
                  {am.accountNumber || ''}
                  {am.accountNumber && am.accountName ? ' - ' : ''}
                  {am.accountName || ''}
                </td>
                <td className="w-30 px-2 py-2 text-xs text-gray-900">
                  {am.accountType === 'UNKNOWN' ? (
                    <span className="text-red-600">Unknown</span>
                  ) : (
                    accountTypes[am.accountType]
                  )}
                </td>
                <td
                  className={`w-30 px-2 py-2 text-sm text-gray-900 text-right ${financeFont.className}`}
                >
                  {' '}
                  {am.credit > 0 ? ppCurrency(am.credit, { cents: true }) : '-'}
                </td>
                <td
                  className={`w-30 px-2 py-2 text-sm text-gray-900 text-right ${financeFont.className}`}
                >
                  {am.debit > 0 ? ppCurrency(am.debit, { cents: true }) : '-'}
                </td>
                {/* <td className="w-full whitespace-nowrap px-2 py-2 text-sm text-gray-900">
                  <AccountBalance
                    auditId={auditId}
                    accountMappingId={am.id}
                    accountType={am.accountType}
                    accountTypes={aTypes}
                  />
                </td> */}
              </tr>
            ))
          )}
        </tbody>
      </table>
      <form
        className="my-4"
        action={async () => {
          'use server';
          await extractTrialBalance(auditId);
        }}
      >
        <SecondaryButton type="submit" label="Reprocess" />
      </form>
    </div>
  );
}
