'use client';

import clsx from 'clsx';
import { Inconsolata } from 'next/font/google';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import useSWR from 'swr';

import { Spinner } from '@/components/spinner';
import { SortableHeader } from '@/components/table';
import { extractTrialBalance } from '@/lib/actions';
import { AccountType, getGroupLabel, groupLabels } from '@/lib/finance';
import { ppCurrency } from '@/lib/util';
import { AccountBalanceResp } from '../../../account-balance/route';
import { AccountMapping } from './account-mapping';
import { sortRows } from './util';

import type { AuditId } from '@/types';

export const financeFont = Inconsolata({
  subsets: ['latin'],
  display: 'swap',
});

type Fetcher = (
  input: RequestInfo,
  init?: RequestInit,
) => Promise<AccountBalanceResp>;

async function fetcher(input: RequestInfo, init: RequestInit) {
  const res = await fetch(input, init);
  return (await res.json()) as AccountBalanceResp;
}

function useAccountBalances(
  auditId: AuditId,
  prefetchedData: AccountBalanceResp['rows'],
  isProcessing: boolean,
  setIsProcessing: (isProcessing: boolean) => void,
) {
  const { data, error, isLoading, mutate } = useSWR(
    `/audit/${auditId}/account-balance`,
    fetcher,
    {
      revalidateOnMount: true,
      fallbackData: {
        rows: prefetchedData,
        isProcessing,
        numProcessed: 0,
        numToProcessTotal: 0,
      },
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
    isProcessing: data?.isProcessing || false,
    numProcessed: data?.numProcessed || 0,
    numToProcessTotal: data?.numToProcessTotal || 0,
    isLoading,
    isError: error,
    mutate,
  };
}

export function Table({
  auditId,
  prefetchRows,
  isProcessing: _isProcessing,
}: {
  auditId: AuditId;
  prefetchRows: AccountBalanceResp['rows'];
  isProcessing: boolean;
}) {
  const searchParams = useSearchParams();
  const [isProcessing, setIsProcessing] = useState(_isProcessing);

  const currentSort = searchParams.get('sort') as string;
  const currentOrder = searchParams.get('order') as string;
  let { rows, numProcessed, numToProcessTotal, isLoading, mutate } =
    useAccountBalances(auditId, prefetchRows, isProcessing, setIsProcessing);

  useEffect(() => {
    if (!isProcessing && !rows.length) {
      extractTrialBalance(auditId).then(() => {
        setIsProcessing(true);
        mutate();
      });
    }
  }, [isProcessing, rows.length, auditId, mutate]);

  const sortedRows = sortRows(rows, currentSort, currentOrder);
  return (
    <div className="mt-8">
      {isProcessing ? (
        <div className="flex">
          <div className="flex items-center text-xs text-gray-400 mt-3">
            <Spinner />
            Classified {numProcessed}/{numToProcessTotal} accounts
          </div>
        </div>
      ) : null}
      <table className="min-w-full divide-y divide-gray-300">
        <thead>
          <tr className="divide-x divide-gray-200 text-slate-600">
            <th
              scope="col"
              className="align-bottom whitespace-nowrap py-1 pl-2 pr-3 text-left text-xs font-medium"
            >
              <SortableHeader column="account">Account</SortableHeader>
            </th>

            <th
              scope="col"
              className="align-bottom whitespace-nowrap px-2 py-1 text-xs text-left font-medium"
            >
              <AccountTypeMappingKey />

              <SortableHeader column="account-type">Mapped to</SortableHeader>
            </th>
            <th
              scope="col"
              className="align-bottom whitespace-nowrap min-w-min px-2 py-1 text-right text-xs font-medium"
            >
              <SortableHeader column="credit">Credit</SortableHeader>
            </th>
            <th
              scope="col"
              className="align-bottom whitespace-nowrap min-w-min px-2 py-1 text-right text-xs font-medium"
            >
              <SortableHeader column="debit">Debit</SortableHeader>
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
                      className="h-4 w-4 rounded border-gray-300 text-sky-700 focus:ring-sky-700"
                    />
                  </span> */}
                  {row.accountName}

                  {row.classificationScore && row.classificationScore < 0.95 ? (
                    <span className="font-bold text-red-500">
                      ({row.classificationScore})
                    </span>
                  ) : null}
                </td>
                <td className="px-2 py-2 text-xs text-gray-900 text-left">
                  <span className="block h-7">
                    {isProcessing && row.accountType === '' ? (
                      <span className="h-full text-gray-400 flex items-center">
                        <span className="mr-2 animate-ping w-1.5 h-1.5 block rounded-full bg-gray-400 opacity-75"></span>{' '}
                        <span>Classifying</span>
                      </span>
                    ) : (
                      <AccountMapping
                        auditId={auditId}
                        accountBalanceId={row.id}
                        accountType={
                          (row.accountTypeMerged || 'UNKNOWN') as AccountType
                        }
                      />
                    )}
                  </span>
                </td>
                <td
                  className={`px-2 py-2 text-sm text-gray-900 text-right ${financeFont.className} group-hover:font-bold`}
                >
                  {' '}
                  {row.credit > 0
                    ? ppCurrency(row.credit, { cents: true })
                    : '-'}
                </td>
                <td
                  className={`px-2 py-2 text-sm text-gray-900 text-right ${financeFont.className} group-hover:font-bold`}
                >
                  {row.debit > 0 ? ppCurrency(row.debit, { cents: true }) : '-'}
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
    <div className="flex text-xs space-x-2 font-normal mb-1">
      {Object.keys(groupLabels).map((group) => (
        <div
          key={group}
          className={clsx(
            accountTypeGroupBGColors[group as keyof typeof groupLabels],
            'px-1 py-0.5 rounded text-gray-600',
          )}
        >
          {getGroupLabel(group as keyof typeof groupLabels)}
        </div>
      ))}
    </div>
  );
}

export const accountTypeGroupBGColors = {
  ASSET: 'bg-lime-100',
  LIABILITY: 'bg-sky-100',
  EQUITY: 'bg-violet-100',
  INCOME_STATEMENT: 'bg-amber-100',
  UNKNOWN: 'bg-rose-100 ring-red-600 text-red-900',
  OTHER: 'bg-white',
} as const;
