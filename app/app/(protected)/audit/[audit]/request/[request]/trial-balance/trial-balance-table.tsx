'use client';

import clsx from 'clsx';
import { Inconsolata } from 'next/font/google';
import { useSearchParams } from 'next/navigation';
import { useRef, useState } from 'react';
import { Button, Dialog, OverlayArrow } from 'react-aria-components';
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
import { AccountMapping } from './account-mapping';
import { Adjustment, AdjustmentPopover } from './trial-balance-override';
import { accountTypeGroupBGColors, sortRows } from './util';

import type { AccountBalanceResp } from '../../../account-balance/route';
import type { UserJSON } from '@/controllers/session-user';
import type { AuditId } from '@/types';

type AccountBalanceRow = AccountBalanceResp['rows'][number];

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

export function TrialBalanceTable({
  auditId,
  currentUser,
}: {
  auditId: AuditId;
  currentUser: UserJSON;
}) {
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
        credit: row.credit1 + row.adjustment1.credit,
        debit: row.debit1 + row.adjustment1.debit,
      }),
      balance2: getBalance({
        accountType: row.accountType,
        credit: row.credit2 + row.adjustment2.credit,
        debit: row.debit2 + row.adjustment2.debit,
      }),
      balance3: getBalance({
        accountType: row.accountType,
        credit: row.credit3 + row.adjustment3.credit,
        debit: row.debit3 + row.adjustment3.debit,
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
                {year3 || 'Initial year'}
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
                <td className="px-1 py-1 text-right group-hover:font-bold">
                  <Balance
                    auditId={auditId}
                    row={row}
                    yearIdx={1}
                    year={year1}
                    accounts={rows}
                    currentUser={currentUser}
                  />
                </td>
                <td className="px-1 py-1 text-right group-hover:font-bold">
                  <Balance
                    auditId={auditId}
                    row={row}
                    yearIdx={2}
                    year={year2}
                    accounts={rows}
                    currentUser={currentUser}
                  />
                </td>
                <td className="px-1 py-1 text-right group-hover:font-bold">
                  <Balance
                    auditId={auditId}
                    row={row}
                    yearIdx={3}
                    year={year3}
                    accounts={rows}
                    currentUser={currentUser}
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

export type AccountBalanceRow2 = AccountBalanceRow & {
  balance1: number;
  balance2: number;
  balance3: number;
};
function Balance({
  auditId,
  row,
  yearIdx,
  year,
  accounts,
  currentUser,
}: {
  auditId: AuditId;
  row: AccountBalanceRow2;
  yearIdx: 1 | 2 | 3;
  year: string;
  accounts: AccountBalanceRow2[];
  currentUser: UserJSON;
}) {
  const balance = row[`balance${yearIdx}`];
  const [isOpen, setOpen] = useState(false);
  const triggerRef = useRef(null);

  return (
    <>
      <Button
        ref={triggerRef}
        onPress={() => setOpen(true)}
        className={clsx(
          row[`adjustment${yearIdx}`].hasAdjustment
            ? 'bg-yellow-300 text-yellow-900 ring-yellow-300'
            : '',
          `w-full rounded-md border border-transparent p-1 text-right text-sm text-gray-900 hover:border-slate-400 hover:text-black ${financeFont.className}`,
        )}
      >
        {ppCurrency(fOut(balance), {
          cents: true,
        })}
      </Button>
      <AdjustmentPopover
        triggerRef={triggerRef}
        isOpen={isOpen}
        onOpenChange={setOpen}
      >
        <OverlayArrow>
          <svg
            viewBox="0 0 12 12"
            className="block h-4 w-4 rotate-180 fill-white"
          >
            <path d="M0 0L6 6L12 0" />
          </svg>
        </OverlayArrow>
        <Dialog className="p-3 text-gray-700 outline-none">
          <div className="flex flex-col">
            <Adjustment
              auditId={auditId}
              row={row}
              yearIdx={yearIdx}
              year={year}
              setOpen={setOpen}
              accounts={accounts}
              currentUser={currentUser}
            />
          </div>
        </Dialog>
      </AdjustmentPopover>
    </>
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
