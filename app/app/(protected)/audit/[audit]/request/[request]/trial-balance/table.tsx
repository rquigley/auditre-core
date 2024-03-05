'use client';

import clsx from 'clsx';
import { Inconsolata } from 'next/font/google';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import useSWR from 'swr';

import { Spinner } from '@/components/spinner';
import { SortableHeader } from '@/components/table';
import { overrideAccountMapping } from '@/lib/actions';
import {
  AccountType,
  fOut,
  getBalance,
  getGroupLabel,
  groupLabels,
} from '@/lib/finance';
import { ppCurrency } from '@/lib/util';
import { AccountBalanceResp } from '../../../account-balance/route';
import { AccountMapping } from './account-mapping';
import { accountTypeGroupBGColors, sortRows } from './util';

import type { AuditId } from '@/types';

const financeFont = Inconsolata({
  subsets: ['latin'],
  display: 'swap',
});

async function fetcher(input: RequestInfo, init: RequestInit) {
  const res = await fetch(input, init);
  return (await res.json()) as AccountBalanceResp;
}

function useAccountBalances(auditId: AuditId) {
  const [isProcessing, setIsProcessing] = useState(false);

  const { data, error, isLoading, mutate } = useSWR(
    `/audit/${auditId}/account-balance`,
    fetcher,
    {
      revalidateOnMount: true,
      revalidateOnFocus: true,
      refreshInterval: isProcessing ? 1000 : undefined,
    },
  );

  if (
    data &&
    typeof data === 'object' &&
    'isProcessing' in data &&
    isProcessing !== data.isProcessing
  ) {
    setIsProcessing(data.isProcessing);
  }

  return {
    rows:
      data && typeof data === 'object' && 'rows' in data
        ? (data.rows as AccountBalanceResp['rows'])
        : [],
    isLoading,
    isProcessing: isProcessing || data?.isProcessing || false,
    isError: error,
    numProcessed: data?.numProcessed || 0,
    numToProcessTotal: data?.numToProcessTotal || 0,
    mutate,
  };
}

export function Table({ auditId }: { auditId: AuditId }) {
  const searchParams = useSearchParams();

  const currentSort = searchParams.get('sort') as string;
  const currentOrder = searchParams.get('order') as string;

  const {
    rows,
    isLoading,
    isProcessing,
    numProcessed,
    numToProcessTotal,
    mutate,
  } = useAccountBalances(auditId);

  const years = new Set<string>();
  let year1 = '';
  let year2 = '';
  let year3 = '';
  const rows2 = rows.map((row) => {
    if (!year1) {
      year1 = row.year1;
    }
    if (!year2) {
      year2 = row.year2;
    }
    if (!year3) {
      year3 = row.year3;
    }
    years.add(row.year1);
    years.add(row.year2);
    years.add(row.year3);
    return {
      ...row,
      balance1: getBalance({
        accountType: row.accountType,
        credit: row.credit1,
        debit: row.debit1,
      }),
      balance2: getBalance({
        accountType: row.accountType,
        credit: row.credit2,
        debit: row.debit2,
      }),
      balance3: getBalance({
        accountType: row.accountType,
        credit: row.credit3,
        debit: row.debit3,
      }),
    };
  });
  const sortedRows = sortRows<(typeof rows2)[number]>(
    rows2,
    currentSort,
    currentOrder,
  );

  return (
    <div className="mt-8">
      {isProcessing ? (
        <div className="flex">
          <div className="mt-3 flex items-center text-xs text-gray-400">
            <Spinner />
            {numToProcessTotal === -1 ? (
              <>Extracting</>
            ) : (
              <>
                Classified {numProcessed}/{numToProcessTotal} accounts
              </>
            )}
          </div>
        </div>
      ) : null}
      <table className="min-w-full divide-y divide-gray-300">
        <thead>
          <tr className="divide-x divide-gray-200 text-slate-600">
            <th
              scope="col"
              className="whitespace-nowrap py-1 pl-2 pr-3 text-left align-bottom text-xs font-medium"
            >
              <SortableHeader column="account">Account</SortableHeader>
            </th>

            <th
              scope="col"
              className="whitespace-nowrap px-2 py-1 text-left align-bottom text-xs font-medium"
            >
              <AccountTypeMappingKey />

              <SortableHeader column="account-type">Mapped to</SortableHeader>
            </th>
            <th
              scope="col"
              className="min-w-min whitespace-nowrap px-2 py-1 align-bottom text-xs font-medium"
            >
              <SortableHeader column="balance1">
                {year1 || 'Previous year'}
              </SortableHeader>
            </th>
            <th
              scope="col"
              className="min-w-min whitespace-nowrap px-2 py-1 align-bottom text-xs font-medium"
            >
              <SortableHeader column="balance2">
                {year2 || 'Current year'}
              </SortableHeader>
            </th>
            <th
              scope="col"
              className="min-w-min whitespace-nowrap px-2 py-1 align-bottom text-xs font-medium"
            >
              <SortableHeader column="balance3">
                {year3 || 'Current year'}
              </SortableHeader>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={4}
                className="px-2 py-2 text-xs font-normal text-gray-500"
              >
                {!isLoading ? 'No accounts found' : 'Loading...'}
              </td>
            </tr>
          ) : (
            sortedRows.map((row) => (
              <tr
                key={row.id}
                className="group divide-x divide-gray-100 hover:bg-slate-50"
              >
                <td className="relative py-2 pl-2 pr-3 text-xs text-gray-500">
                  {/* <span className="absolute -left-4 hidden group-hover:block">
                    <input
                      type="checkbox"
                      className="size-4 rounded border-gray-300 text-sky-700 focus:ring-sky-700"
                    />
                  </span> */}
                  {row.accountName}

                  {row.classificationScore && row.classificationScore < 0.95 ? (
                    <span className="font-bold text-red-500">
                      ({row.classificationScore})
                    </span>
                  ) : null}
                </td>
                <td className="px-2 py-2 text-left text-xs text-gray-900">
                  <span className="block h-7">
                    {isProcessing && row.accountType === 'UNKNOWN' ? (
                      <span className="flex h-full items-center text-gray-400">
                        <span className="mr-2 block h-1.5 w-1.5 animate-ping rounded-full bg-gray-400 opacity-75"></span>{' '}
                        <span>Classifying</span>
                      </span>
                    ) : (
                      <AccountMapping
                        accountType={row.accountType as AccountType}
                        setMapping={async (accountType: AccountType) => {
                          mutate(
                            async (data: AccountBalanceResp | undefined) => {
                              await overrideAccountMapping({
                                auditId,
                                accountMappingId: row.id,
                                accountType,
                              });
                              const idx =
                                data?.rows.findIndex((r) => r.id === row.id) ||
                                0;
                              const newRow = {
                                ...row,
                                accountType,
                              } as unknown as AccountBalanceResp['rows'][number];
                              const newRows = [
                                ...rows.slice(0, idx),
                                newRow,
                                ...rows.slice(idx + 1),
                              ];
                              return {
                                ...data,
                                rows: newRows,
                                isProcessing: data?.isProcessing || false,
                                numProcessed: data?.numProcessed || 0,
                                numToProcessTotal: data?.numToProcessTotal || 0,
                              };
                            },
                            {
                              revalidate: false,
                              populateCache: true,
                            },
                          );
                        }}
                      />
                    )}
                  </span>
                </td>
                <td
                  className={`px-2 py-2 text-right text-sm text-gray-900 ${financeFont.className} group-hover:font-bold`}
                >
                  {ppCurrency(fOut(row.balance1), {
                    cents: true,
                  })}
                </td>
                <td
                  className={`px-2 py-2 text-right text-sm text-gray-900 ${financeFont.className} group-hover:font-bold`}
                >
                  {ppCurrency(fOut(row.balance2), {
                    cents: true,
                  })}
                </td>
                <td
                  className={`px-2 py-2 text-right text-sm text-gray-900 ${financeFont.className} group-hover:font-bold`}
                >
                  {ppCurrency(fOut(row.balance3), {
                    cents: true,
                  })}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function AccountTypeMappingKey() {
  return (
    <div className="mb-1 flex space-x-2 text-xs font-normal">
      {Object.keys(groupLabels).map((group) => (
        <div
          key={group}
          className={clsx(
            accountTypeGroupBGColors[group as keyof typeof groupLabels],
            'rounded px-1 py-0.5 text-gray-600',
          )}
        >
          {getGroupLabel(group as keyof typeof groupLabels)}
        </div>
      ))}
    </div>
  );
}
