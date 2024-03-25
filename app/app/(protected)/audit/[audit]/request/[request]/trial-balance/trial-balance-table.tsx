'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import clsx from 'clsx';
import { Inconsolata } from 'next/font/google';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogTrigger,
  Heading,
  OverlayArrow,
  Popover,
  Switch,
} from 'react-aria-components';
import { useForm } from 'react-hook-form';
import useSWR, { useSWRConfig } from 'swr';
import * as z from 'zod';

import { Spinner } from '@/components/spinner';
import { SortableHeader } from '@/components/table';
import { overrideAccountBalance, overrideAccountMapping } from '@/lib/actions';
import {
  AccountType,
  fIn,
  fOut,
  getBalance,
  getGroupLabel,
  groupLabels,
} from '@/lib/finance';
import { ppCurrency } from '@/lib/util';
import { AccountMapping } from './account-mapping';
import { accountTypeGroupBGColors, sortRows } from './util';

import type { AccountBalanceResp } from '../../../account-balance/route';
import type { AuditId } from '@/types';
import type { PopoverProps } from 'react-aria-components';

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

export function TrialBalanceTable({ auditId }: { auditId: AuditId }) {
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
                <td className={`px-1 py-1 text-right  group-hover:font-bold`}>
                  <Balance auditId={auditId} row={row} year={1} />
                </td>
                <td className={`px-1 py-1 text-right  group-hover:font-bold`}>
                  <Balance auditId={auditId} row={row} year={2} />
                </td>
                <td className={`px-1 py-1 text-right  group-hover:font-bold`}>
                  <Balance auditId={auditId} row={row} year={3} />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

type AccountBalanceRow2 = AccountBalanceRow & {
  balance1: number;
  balance2: number;
  balance3: number;
};
function Balance({
  auditId,
  row,
  year,
}: {
  auditId: AuditId;
  row: AccountBalanceRow2;
  year: 1 | 2 | 3;
}) {
  const balance = row[`balance${year}`];
  return (
    <DialogTrigger>
      <Button
        className={`w-full border border-transparent p-1 text-right text-sm text-gray-900 hover:border-slate-400 hover:text-black ${financeFont.className}`}
      >
        {ppCurrency(fOut(balance), {
          cents: true,
        })}
      </Button>
      <OverridePopover className="w-50 h-50 border bg-white p-3">
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
            <BalanceOverrideForm auditId={auditId} row={row} year={year} />
          </div>
        </Dialog>
      </OverridePopover>
    </DialogTrigger>
  );
}

function BalanceOverrideForm({
  auditId,
  row,
  year,
}: {
  auditId: AuditId;
  row: AccountBalanceRow2;
  year: 1 | 2 | 3;
}) {
  const { mutate } = useSWRConfig();

  const schema = z.object({
    credit: z
      .string()
      .regex(/^[\d,]+(\.\d{1,2})?$/)
      .transform((v) => v.replaceAll(',', '')),

    debit: z
      .string()
      .regex(/^[\d,]+(\.\d{1,2})?$/)
      .transform((v) => v.replaceAll(',', '')),

    comment: z.string(),
  });

  async function onSubmit(data: z.infer<typeof schema>) {
    // const ret = fIn(v.replaceAll(',', ''));
    // return ppCurrency(fOut(ret), {
    //   cents: true,
    // });
    console.log(data);
    console.log(row);
    await overrideAccountBalance({
      auditId,
      accountMappingId: row.id,
      year: row[`year${year}`],
      credit: data.credit,
      debit: data.debit,
      comment: data.comment,
    });
    mutate(`/audit/${auditId}/account-balance`);
  }

  const {
    register,
    setValue,
    getValues,
    handleSubmit,
    reset,
    resetField,
    watch,
    formState,
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      credit: String(fOut(row[`adjustment${year}`].credit || 0)),
      debit: String(fOut(row[`adjustment${year}`].debit || 0)),
      comment: row[`adjustment${year}`].comment,
    },
  });
  let enableSubmit;
  if (formState.isSubmitting) {
    enableSubmit = false;
  } else if (formState.isDirty) {
    enableSubmit = true;
  } else {
    enableSubmit = false;
  }

  return (
    <div>
      <div className="mb-2 text-xs  text-gray-700">Make adjustment:</div>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="mb-2">
          <label htmlFor="debit" className="block text-xs text-gray-700">
            <span className="flex justify-between">
              <span className="font-medium">Debit</span>
              <span>
                initial:{' '}
                <span className={financeFont.className}>
                  {ppCurrency(fOut(row[`debit${year}`]), {
                    cents: true,
                  })}
                </span>
              </span>
            </span>
          </label>
          <div className={`flex ${financeFont.className} `}>
            <div className="pr-2 pt-1">$</div>
            <input
              data-1p-ignore
              onFocus={(e) => {
                const target = e.target as HTMLInputElement;
                target.select();
              }}
              type="text"
              autoComplete="off"
              {...register('debit')}
              className={clsx(
                formState.errors.debit
                  ? ' text-red-900 ring-red-300 placeholder:text-red-300  focus:ring-red-500'
                  : 'text-gray-900 placeholder:text-gray-400',
                'block w-full border-0 px-1 py-1 text-right',
              )}
            />
          </div>
        </div>
        <div className="mb-2">
          <label htmlFor="credit" className="block text-xs text-gray-700">
            <span className="flex justify-between">
              <span className="font-medium">Credit</span>
              <span>
                initial:{' '}
                <span className={financeFont.className}>
                  {ppCurrency(fOut(row[`credit${year}`]), {
                    cents: true,
                  })}
                </span>
              </span>
            </span>
          </label>
          <div className={`flex ${financeFont.className} `}>
            <div className="pr-2 pt-1">$</div>
            <input
              data-1p-ignore
              onFocus={(e) => {
                const target = e.target as HTMLInputElement;
                target.select();
              }}
              type="text"
              autoComplete="off"
              {...register('credit')}
              className={clsx(
                formState.errors.credit
                  ? ' text-red-900 ring-red-300 placeholder:text-red-300  focus:ring-red-500'
                  : 'text-gray-900 placeholder:text-gray-400',
                'block w-full border-0 px-1 py-1 text-right',
              )}
            />
          </div>
        </div>
        <div className="mb-2">
          <label
            htmlFor="balance"
            className="block text-xs font-medium text-gray-700"
          >
            Comment
          </label>
          <textarea
            {...register('comment')}
            className="mt-1 block w-full rounded-sm border-gray-300 px-1.5 py-1 text-xs shadow-sm focus:border-sky-700 focus:ring focus:ring-sky-700 focus:ring-opacity-50"
          />
        </div>
        <div className="flex justify-end">
          {enableSubmit && formState.isDirty ? (
            <button
              type="button"
              className="mr-4 text-xs leading-6 text-gray-400 hover:text-gray-900"
              onClick={() =>
                reset({
                  credit: String(fOut(row[`adjustment${year}`].credit || 0)),
                  debit: String(fOut(row[`adjustment${year}`].debit || 0)),
                  comment: row[`adjustment${year}`].comment,
                })
              }
            >
              Reset
            </button>
          ) : null}
          <button
            type="submit"
            disabled={enableSubmit === false}
            className={clsx(
              enableSubmit === false
                ? 'bg-gray-400'
                : 'bg-sky-700 hover:bg-sky-900',
              'rounded-md px-3 py-1 text-xs  text-white shadow-sm',
            )}
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
}

function OverridePopover(props: PopoverProps) {
  return (
    <Popover
      {...props}
      className={({ isEntering, isExiting }) => `
        placement-bottom:mt-2 placement-top:mb-2 group w-[280px] rounded-lg bg-white ring-1 ring-black/10 drop-shadow-lg
        ${
          isEntering
            ? 'animate-in fade-in placement-bottom:slide-in-from-top-1 placement-top:slide-in-from-bottom-1 duration-200 ease-out'
            : ''
        }
        ${
          isExiting
            ? 'animate-out fade-out placement-bottom:slide-out-to-top-1 placement-top:slide-out-to-bottom-1 duration-150 ease-in'
            : ''
        }
      `}
    />
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
