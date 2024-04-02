'use client';

import {
  CheckIcon,
  ChevronUpDownIcon,
  MinusIcon,
  PlusIcon,
} from '@heroicons/react/16/solid';
// import { zodResolver } from '@hookform/resolvers/zod';
import clsx from 'clsx';
import { Inconsolata } from 'next/font/google';
// import { useSearchParams } from 'next/navigation';
import { Fragment, useReducer, useRef } from 'react';
import {
  Button,
  ComboBox,
  Group,
  Input,
  Label,
  ListBox,
  ListBoxItem,
  Popover,
} from 'react-aria-components';
import { flushSync } from 'react-dom';
// import { useForm } from 'react-hook-form';
import useSWR, { useSWRConfig } from 'swr';
import * as z from 'zod';

import { Avatar } from '@/components/avatar';
import { saveAccountMappingAdjustments } from '@/lib/actions';
import { fIn, fOut } from '@/lib/finance';
import { ppCurrency } from '@/lib/util';
import { AccountBalanceRow2 } from './trial-balance-table';

import type { AccountAdjustmentResp } from '../../../account-adjustment/[accountMappingId]/[year]/route';
import type { UserJSON } from '@/controllers/session-user';
import type { AuditId } from '@/types';
import type {
  Key,
  ListBoxItemProps,
  PopoverProps,
} from 'react-aria-components';

const financeFont = Inconsolata({
  subsets: ['latin'],
  display: 'swap',
});

export function Adjustment({
  auditId,
  row,
  yearIdx,
  year,
  setOpen,
  accounts,
  currentUser,
}: {
  auditId: AuditId;
  row: AccountBalanceRow2;
  yearIdx: 1 | 2 | 3;
  year: string;
  setOpen: (open: boolean) => void;
  accounts: AccountBalanceRow2[];
  currentUser: UserJSON;
}) {
  const { data, isLoading, isError, mutate } = useAdjustment(
    auditId,
    row.id,
    year,
  );
  if (!data) {
    return <div>Loading...</div>;
  }

  const accountsForYear = accounts.map((a) => ({
    id: a.id,
    accountName: a.accountName,
    credit: a[`credit${yearIdx}`],
    debit: a[`debit${yearIdx}`],
  }));
  return (
    <InnerAdjustment
      auditId={auditId}
      account={{
        id: row.id,
        accountName: row.accountName,
        credit: row[`credit${yearIdx}`],
        debit: row[`debit${yearIdx}`],
      }}
      data={data}
      yearIdx={yearIdx}
      year={year}
      setOpen={setOpen}
      accounts={accountsForYear}
      currentUser={currentUser}
    />
  );
}

type EditType = 'self' | 'child' | 'other-parent' | 'other-child';
type EditRow = number;
type EditCol = 'adjustmentDebit' | 'adjustmentCredit' | 'comment';

type BalanceOverrideState = {
  editType: EditType | null;
  editRow: EditRow | null;
  editCol: EditCol | null;

  self: NonNullable<AccountAdjustmentResp['self']>;
  children: AccountAdjustmentResp['children'];
  other: AccountAdjustmentResp['other'];

  totalCredit: number;
  totalDebit: number;

  isDirty: boolean;
};

type BalanceOverrideAction =
  | {
      type: 'idle';
    }
  | {
      type: 'add-account';
      user: UserJSON;
    }
  | {
      type: 'edit';
      editType: EditType;
      editRow: EditRow;
      editCol: EditCol;
    }
  | {
      type: 'set-account-mapping-id';
      accountMappingId: string;
      editType: EditType;
      editRow: EditRow;
      credit: number;
      debit: number;
    }
  | {
      type: 'set-value';
      value: number | string;
      editType: EditType;
      editRow: EditRow;
      editCol: EditCol;
    }
  | {
      type: 'remove-row';
      editType: EditType;
      editRow: EditRow;
    };

function balanceOverrideReducer(
  prevState: BalanceOverrideState,
  action: BalanceOverrideAction,
): BalanceOverrideState {
  let ret: BalanceOverrideState;
  if (action.type === 'idle') {
    ret = {
      ...prevState,
      editType: null,
      editRow: null,
      editCol: null,
    };
  } else if (action.type === 'add-account') {
    ret = {
      ...prevState,
      children: [
        ...prevState.children,
        {
          id: '',
          accountMappingId: '',
          parentAccountMappingId: '',
          accountName: '',
          parentAccountName: '',
          credit: 0,
          debit: 0,
          adjustmentCredit: 0,
          adjustmentDebit: 0,
          user: action.user,
          comment: '',
        },
      ],
    };
  } else if (action.type === 'set-account-mapping-id') {
    const { editType, editRow, accountMappingId, credit, debit } = action;

    if (editType === 'self') {
      ret = {
        ...prevState,
        self: {
          ...prevState.self,
          accountMappingId,
          credit,
          debit,
        },
      };
    } else if (editType === 'child') {
      ret = {
        ...prevState,
        children: [
          ...prevState.children.slice(0, editRow),
          {
            ...prevState.children[editRow],
            accountMappingId,
            credit,
            debit,
          },
          ...prevState.children.slice(editRow + 1),
        ],
      };
    } else if (editType === 'other-child') {
      ret = {
        ...prevState,
        other: [
          ...prevState.other.slice(0, editRow),
          {
            ...prevState.other[editRow],
            accountMappingId,
            credit,
            debit,
          },
          ...prevState.other.slice(editRow + 1),
        ],
      };
    } else if (editType === 'other-parent') {
      throw new Error('Cannot set account mapping ID for other-parent');
    } else {
      throw new Error('Invalid edit type');
    }
  } else if (action.type === 'set-value') {
    const { editType, editRow, editCol, value } = action;
    if (editType === 'self') {
      ret = {
        ...prevState,
        self: {
          ...prevState.self,
          [editCol]: value,
        },
        editType: null,
        editCol: null,
        editRow: null,
      };
    } else if (editType === 'child') {
      ret = {
        ...prevState,
        children: [
          ...prevState.children.slice(0, editRow),
          {
            ...prevState.children[editRow],
            [editCol]: value,
          },
          ...prevState.children.slice(editRow + 1),
        ],
        editType: null,
        editCol: null,
        editRow: null,
      };
    } else if (editType === 'other-parent') {
      throw new Error('Cannot set adjustment credit or debit for other-parent');
    } else if (editType === 'other-child') {
      ret = {
        ...prevState,
        other: [
          ...prevState.other.slice(0, editRow),
          {
            ...prevState.other[editRow],
            [editCol]: value,
          },
          ...prevState.other.slice(editRow + 1),
        ],
        editType: null,
        editCol: null,
        editRow: null,
      };
    } else {
      throw new Error(`Invalid edit type for ${action.type}: ${editType}`);
    }
  } else if (action.type === 'edit') {
    ret = {
      ...prevState,
      editType: action.editType,
      editRow: action.editRow,
      editCol: action.editCol,
    };
  } else if (action.type === 'remove-row') {
    const { editType, editRow } = action;

    if (editType === 'self') {
      throw new Error('Cannot remove self');
    } else if (editType === 'child') {
      ret = {
        ...prevState,
        children: [
          ...prevState.children.slice(0, editRow),
          ...prevState.children.slice(editRow + 1),
        ],
      };
    } else if (editType === 'other-child') {
      ret = {
        ...prevState,
        other: [
          ...prevState.other.slice(0, editRow),
          ...prevState.other.slice(editRow + 1),
        ],
      };
    } else {
      throw new Error(`Invalid edit type for ${action.type}: ${editType}`);
    }
  } else {
    throw new Error('Invalid action');
  }

  ret.isDirty = true;
  return computeTotals(ret);
}

function computeTotals(state: BalanceOverrideState): BalanceOverrideState {
  return {
    ...state,
    totalCredit:
      state.self.credit +
      (state.self.adjustmentCredit || 0) +
      state.other.reduce((acc, r) => acc + r.adjustmentCredit, 0),
    totalDebit:
      state.self.debit +
      (state.self.adjustmentDebit || 0) +
      state.other.reduce((acc, r) => acc + r.adjustmentDebit, 0),
  };
}

async function fetcher(input: RequestInfo, init: RequestInit) {
  const res = await fetch(input, init);
  return (await res.json()) as AccountAdjustmentResp;
}

function useAdjustment(
  auditId: AuditId,
  accountMappingId: string,
  year: string,
) {
  const { data, error, isLoading, mutate } = useSWR(
    `/audit/${auditId}/account-adjustment/${accountMappingId}/${year}`,
    fetcher,
    {
      revalidateOnMount: true,
      revalidateOnFocus: true,
    },
  );

  return {
    data,
    isLoading,
    isError: error,
    mutate,
  };
}

const AccountAdjustment = z.object({
  accountMappingId: z.string(),
  adjustmentCredit: z
    .string()
    .regex(/^[\d,]+(\.\d{1,2})?$/)
    .transform((v) => v.replaceAll(',', '')),

  adjustmentDebit: z
    .string()
    .regex(/^[\d,]+(\.\d{1,2})?$/)
    .transform((v) => v.replaceAll(',', '')),

  comment: z.string(),
});

const ChildAccountAdjustment = AccountAdjustment.extend({
  parentAccountMappingId: z.string(),
});

const schema = z.object({
  self: AccountAdjustment,
  children: z.array(ChildAccountAdjustment).default([]),
  other: z.array(AccountAdjustment).default([]),
});

type AdjustmentAccount = {
  id: string;
  accountName: string;
  credit: number;
  debit: number;
};
export function InnerAdjustment({
  auditId,
  account,
  data,
  yearIdx,
  year,
  setOpen,
  accounts,
  currentUser,
}: {
  auditId: AuditId;
  account: AdjustmentAccount;
  data: AccountAdjustmentResp;
  yearIdx: 1 | 2 | 3;
  year: string;
  setOpen: (open: boolean) => void;
  accounts: AdjustmentAccount[];
  currentUser: UserJSON;
}) {
  // const { mutate } = useSWRConfig();
  const [state, dispatch] = useReducer(
    balanceOverrideReducer,
    {
      self: data.self || {
        id: '',
        accountMappingId: account.id,
        parentAccountMappingId: '',
        accountName: account.accountName,
        parentAccountName: '',
        credit: account.credit,
        debit: account.debit,
        adjustmentCredit: 0,
        adjustmentDebit: 0,
        user: currentUser,
        comment: '',
      },
      children: data.children,
      other: data.other,

      editType: null,
      editRow: null,
      editCol: null,

      totalCredit: 0,
      totalDebit: 0,

      isDirty: false,
    } satisfies BalanceOverrideState,
    computeTotals,
  );

  // const schema = z.object({
  //   credit: z
  //     .string()
  //     .regex(/^[\d,]+(\.\d{1,2})?$/)
  //     .transform((v) => v.replaceAll(',', '')),

  //   debit: z
  //     .string()
  //     .regex(/^[\d,]+(\.\d{1,2})?$/)
  //     .transform((v) => v.replaceAll(',', '')),

  //   comment: z.string(),
  // });
  async function saveAdjustments(ev: React.MouseEvent<HTMLButtonElement>) {
    ev.preventDefault();
    const resp = await saveAccountMappingAdjustments({
      auditId,
      accountMappingId: account.id,
      year: year,
      self: state.self,
      children: state.children,
      other: state.other,
    });
    console.log(resp);
    //setOpen(false);
  }
  // async function onSubmit(data: z.infer<typeof schema>) {
  //   await overrideAccountBalance({
  //     auditId,
  //     accountMappingId: row.id,
  //     year: row[`year${yearIdx}`],
  //     credit: data.credit,
  //     debit: data.debit,
  //     comment: data.comment,
  //   });
  //   mutate(`/audit/${auditId}/account-balance`);
  //   setOpen(false);
  // }

  // const { register, handleSubmit, reset, formState } = useForm<
  //   z.infer<typeof schema>
  // >({
  //   // resolver: c(schema),
  //   defaultValues: {
  //     credit: String(fOut(row[`adjustment${yearIdx}`].credit || 0)),
  //     debit: String(fOut(row[`adjustment${yearIdx}`].debit || 0)),
  //     comment: row[`adjustment${yearIdx}`].comment,
  //   },
  // });
  // let enableSubmit;
  // if (formState.isSubmitting) {
  //   enableSubmit = false;
  // } else if (formState.isDirty) {
  //   enableSubmit = true;
  // } else {
  //   enableSubmit = false;
  // }

  return (
    <div>
      <div className="mb-2 flex justify-between text-sm font-semibold text-gray-700">
        <span>Adjustments to {account.accountName}</span>
        <span>{year}</span>
      </div>
      {/* <form onSubmit={handleSubmit(onSubmit)}> */}
      <form>
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              <th
                scope="col"
                className="py-3.5 pl-0 pr-3 text-left align-bottom font-normal text-gray-900"
              >
                Account
              </th>
              <th
                scope="col"
                className="w-28 px-2 py-3.5 text-right align-bottom font-normal text-gray-900"
              >
                Base
                <br />
                credit
              </th>
              <th
                scope="col"
                className="w-28 px-2 py-3.5 text-right align-bottom font-normal text-gray-900"
              >
                Base
                <br />
                debit
              </th>
              <th
                scope="col"
                className="w-28 px-2 py-3.5 text-right align-bottom font-normal text-gray-900"
              >
                Adjustment
                <br />
                credit
              </th>
              <th
                scope="col"
                className="w-28 px-2 py-3.5 text-right align-bottom font-normal text-gray-900"
              >
                Adjustment
                <br />
                debit
              </th>
              <th
                scope="col"
                className="sr-only px-2 py-3.5 text-right align-bottom font-normal text-gray-900"
              >
                Actor
              </th>
              <th
                scope="col"
                className="min-w-40 px-2 py-3.5 pr-0 text-left align-bottom font-normal text-gray-900"
              >
                Memo
              </th>
            </tr>
          </thead>
          <tbody>
            <AdjustmentRow
              accountMappingId={state.self.accountMappingId}
              accountName={account.accountName}
              isChild={false}
              credit={state.self.credit}
              debit={state.self.debit}
              adjustmentCredit={state.self.adjustmentCredit}
              adjustmentDebit={state.self.adjustmentDebit}
              user={state.self.user}
              comment={state.self.comment}
              editType="self"
              editRow={0}
              dispatch={dispatch}
              state={state}
            />

            {state.children.map((r, idx) => (
              <AdjustmentRow
                key={r.id}
                isDraft={!r.id}
                accounts={accounts}
                accountMappingId={r.accountMappingId}
                accountName={r.accountName}
                isChild={true}
                credit={r.credit}
                debit={r.debit}
                adjustmentCredit={r.adjustmentCredit}
                adjustmentDebit={r.adjustmentDebit}
                user={r.user}
                comment={r.comment}
                editType="child"
                editRow={idx}
                dispatch={dispatch}
                state={state}
                className="border-t border-gray-200"
              />
            ))}
            <tr className="border-t border-gray-200">
              <td
                className="flex py-2 pl-2 pr-3 align-middle text-gray-500"
                colSpan={7}
              >
                <button
                  type="button"
                  onClick={() => {
                    dispatch({ type: 'add-account', user: currentUser });
                  }}
                  className="-mt-0.5 ml-2 flex p-1 text-slate-400 hover:text-slate-700"
                >
                  <PlusIcon className="size-4" />{' '}
                  <span className="block align-bottom">Add account</span>
                </button>
              </td>
            </tr>
            {state.other.length > 0 && (
              <>
                <tr>
                  <td
                    className="mt-4 flex py-2 pr-3 align-middle font-semibold text-gray-500"
                    colSpan={7}
                  >
                    Other adjustments
                  </td>
                </tr>
                {state.other.map((r, idx) => (
                  <Fragment key={r.id}>
                    {/* <AdjustmentRow
                      accountMappingId={String(r.parentAccountMappingId)}
                      accountName={r.parentAccountName}
                      isChild={false}
                      credit={0}
                      debit={0}
                      adjustmentCredit={0}
                      adjustmentDebit={0}
                      user={null}
                      comment=""
                      editType="other-parent"
                      editRow={idx}
                      dispatch={dispatch}
                      state={state}
                      className="border-t border-gray-200"
                      canEdit={false}
                    /> */}
                    <tr className="border-t border-gray-200">
                      <td className="py-2 pr-1 text-gray-500" colSpan={6}>
                        <span className="flex items-center justify-items-center">
                          <span className="block">
                            <span className="align-middle">
                              {r.parentAccountName}
                            </span>
                          </span>
                        </span>
                      </td>
                    </tr>
                    <AdjustmentRow
                      accountMappingId={r.accountMappingId}
                      accountName={r.accountName}
                      isChild={true}
                      credit={r.credit}
                      debit={r.debit}
                      adjustmentCredit={r.adjustmentCredit}
                      adjustmentDebit={r.adjustmentDebit}
                      user={r.user}
                      comment={r.comment}
                      editType="other-child"
                      editRow={idx}
                      dispatch={dispatch}
                      state={state}
                      className="border-t border-gray-200"
                    />
                  </Fragment>
                ))}
              </>
            )}
            <tr>
              <td
                className="mt-4 flex border-b-0 py-2 pr-3 align-middle font-semibold text-gray-500"
                colSpan={7}
              >
                &nbsp;
              </td>
            </tr>

            <tr>
              <td className="flex py-2 pr-3 align-middle font-semibold text-gray-500">
                Post adjustments
              </td>
              <td
                className={`px-2 py-2 text-right text-gray-900 ${financeFont.className}`}
              >
                {ppCurrency(fOut(state.totalCredit), {
                  cents: true,
                })}
              </td>
              <td
                className={`px-2 py-2 text-right text-gray-900 ${financeFont.className}`}
              >
                {ppCurrency(fOut(state.totalDebit), {
                  cents: true,
                })}
              </td>
              <td colSpan={4}></td>
            </tr>
          </tbody>
        </table>
        <div className="flex justify-end text-sm">
          <button
            type="button"
            className="mr-4 leading-6 text-gray-400 hover:text-gray-900"
            onClick={() => setOpen(false)}
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={state.isDirty === false}
            onClick={saveAdjustments}
            className={clsx(
              state.isDirty === false
                ? 'bg-gray-400'
                : 'bg-sky-700 hover:bg-sky-900',
              'rounded-md px-3 py-1 text-sm text-white shadow-sm',
            )}
          >
            Save adjustments
          </button>
        </div>
      </form>
    </div>
  );
}

function AdjustmentRow({
  accountMappingId,
  accountName,
  isChild,
  isDraft,
  accounts,
  credit,
  debit,
  adjustmentCredit,
  adjustmentDebit,
  user,
  comment,
  dispatch,
  state,
  className,
  editType,
  editRow,
  canEdit = true,
}: {
  accountMappingId?: string;
  accountName: string;
  isChild: boolean;
  isDraft?: boolean;
  accounts?: AdjustmentAccount[];
  credit: number;
  debit: number;
  adjustmentCredit: number;
  adjustmentDebit: number;
  user: UserJSON | null;
  comment: string;
  dispatch: React.Dispatch<BalanceOverrideAction>;
  state: BalanceOverrideState;
  className?: string;
  editType: EditType;
  editRow: EditRow;
  canEdit?: boolean;
}) {
  return (
    <tr className={className}>
      <td className={clsx(isChild ? 'pl-2' : '', 'pr-1 text-gray-500')}>
        <span className="flex items-center justify-items-center">
          {canEdit && isChild && (
            <button
              type="button"
              onClick={() => {
                dispatch({ type: 'remove-row', editType, editRow });
              }}
              className="-mt-0.5 ml-1 p-1 text-slate-400 hover:text-red-700"
              title="Remove adjustment"
            >
              <MinusIcon className="size-4" />
            </button>
          )}
          <span className="block">
            {canEdit && isDraft && accounts ? (
              <AccountSelectBox
                accounts={accounts}
                onChange={(accountMappingId: Key) => {
                  if (!accountMappingId) {
                    return;
                  }
                  const account = accounts.find(
                    (a) => a.id === accountMappingId,
                  );
                  if (!account) {
                    throw new Error('Account not found');
                  }
                  dispatch({
                    type: 'set-account-mapping-id',
                    accountMappingId: String(accountMappingId),
                    editType,
                    editRow,
                    credit: account.credit,
                    debit: account.debit,
                  });
                }}
              />
            ) : (
              <span className="align-middle">{accountName}</span>
            )}
          </span>
        </span>
      </td>
      <td
        className={`px-2 py-2 text-right text-gray-900 ${financeFont.className}`}
      >
        {ppCurrency(fOut(credit), {
          cents: true,
        })}
      </td>
      <td
        className={`px-2 py-2 text-right text-gray-900 ${financeFont.className}`}
      >
        {ppCurrency(fOut(debit), {
          cents: true,
        })}
      </td>
      <td
        className={`px-2 py-2 text-right text-gray-500 ${financeFont.className}`}
      >
        <Field
          editType={editType}
          editRow={editRow}
          editCol="adjustmentCredit"
          value={adjustmentCredit}
          dispatch={dispatch}
          state={state}
          canEdit={canEdit}
        />
      </td>
      <td
        className={`px-2 py-2 text-right text-gray-500 ${financeFont.className}`}
      >
        <Field
          editType={editType}
          editRow={editRow}
          editCol="adjustmentDebit"
          value={adjustmentDebit}
          dispatch={dispatch}
          state={state}
          canEdit={canEdit}
        />
      </td>
      <td
        className={`px-2 py-2 text-right text-gray-500 ${financeFont.className}`}
      >
        <span className="block w-full border border-transparent p-1">
          {user && (
            <Avatar
              id={user.id}
              name={user.name}
              image={user.image}
              email={user.email}
            />
          )}
        </span>
      </td>
      <td className={`px-2 py-2 pr-0 text-gray-500 ${financeFont.className}`}>
        <Field
          editType={editType}
          editRow={editRow}
          editCol="comment"
          value={comment}
          dispatch={dispatch}
          state={state}
          canEdit={canEdit}
        />
      </td>
    </tr>
  );
}

function Field({
  editType,
  editRow,
  editCol,
  value,
  state,
  dispatch,
  canEdit,
}: {
  editType: EditType;
  editRow: EditRow;
  editCol: EditCol;
  value: number | string;
  state: BalanceOverrideState;
  dispatch: React.Dispatch<BalanceOverrideAction>;
  canEdit: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isAccountingField = editCol !== 'comment';
  const hasError = inputRef.current?.checkValidity() === false;
  return (
    <span
      className={clsx(
        canEdit ? 'hover:border-slate-400' : '',
        'block w-full border border-transparent p-1',
      )}
      onClick={() => {
        if (!canEdit) {
          return;
        }
        flushSync(() => {
          dispatch({
            type: 'edit',
            editType,
            editRow,
            editCol,
          });
        });

        inputRef.current?.focus();
      }}
    >
      <span
        className={clsx(
          hasError ||
            (state.editType === editType &&
              state.editRow === editRow &&
              state.editCol === editCol &&
              canEdit)
            ? 'block'
            : 'hidden',
          `flex`,
        )}
      >
        {isAccountingField && <span className="text-nowrap pr-2">$</span>}
        <input
          type="text"
          ref={inputRef}
          onFocus={(e) => {
            const target = e.target as HTMLInputElement;
            target.select();
          }}
          pattern={isAccountingField ? '[0-9]+(.[0-9]{1,2})?' : undefined}
          autoComplete="off"
          placeholder="-"
          defaultValue={isAccountingField ? fOut(Number(value)) : value}
          onBlur={(event) => {
            if (event.target.checkValidity()) {
              const value = isAccountingField
                ? fIn(event.target.value || 0)
                : event.target.value;

              dispatch({
                type: 'set-value',
                value,
                editType,
                editRow,
                editCol,
              });
            } else {
              console.log('INVALID', event.target.value);
            }
          }}
          className={clsx(
            isAccountingField ? 'text-right' : 'text-left',
            'block w-full border-0 text-gray-900 placeholder:text-gray-400 invalid:text-red-600 focus:outline-none',
          )}
          data-1p-ignore
        />
      </span>
      <span
        className={clsx(
          hasError ||
            (state.editType === editType &&
              state.editRow === editRow &&
              state.editCol === editCol &&
              canEdit)
            ? 'hidden'
            : 'block',
        )}
      >
        {isAccountingField
          ? ppCurrency(fOut(Number(value)), {
              cents: true,
            })
          : value || '-'}
      </span>
    </span>
  );
}

function AccountSelectBox({
  accounts,
  onChange,
}: {
  accounts: AdjustmentAccount[];
  onChange?: (key: Key) => void;
}) {
  return (
    <ComboBox
      className="group flex w-[250px] flex-col gap-1"
      defaultItems={accounts}
      onSelectionChange={onChange}
    >
      <Label className="sr-only">Account</Label>
      <Group className="flex bg-white ring-1 ring-white transition hover:ring-black/10 focus:ring-black/10 focus-visible:ring-2 focus-visible:ring-black">
        <Input
          className="w-full flex-1 truncate border-none px-2 py-1 leading-5 text-gray-900 outline-none"
          placeholder="Account"
        />
        <Button className="pressed:bg-sky-100 flex items-center px-3 text-gray-700 transition">
          <ChevronUpDownIcon className="size-4" />
        </Button>
      </Group>
      <Popover className="entering:animate-in entering:fade-in exiting:animate-out exiting:fade-out max-h-60 overflow-auto rounded-md bg-white text-xs shadow-lg ring-1 ring-black/5">
        <ListBox className="p-1 outline-none">
          {(a: AccountBalanceRow2) => (
            <UserItem id={a.id} textValue={a.accountName}>
              {a.accountName}
            </UserItem>
          )}
        </ListBox>
      </Popover>
    </ComboBox>
  );
}

function UserItem(props: ListBoxItemProps & { children: React.ReactNode }) {
  return (
    <ListBoxItem
      {...props}
      className="group flex cursor-default select-none items-center rounded pr-1 text-gray-900 outline-none focus:bg-sky-600 focus:text-white"
    >
      {({ isSelected, isFocused }) => (
        <>
          <span className="mr-0.5 w-4 items-center text-sky-600 group-focus:text-white">
            {isSelected && <CheckIcon />}
          </span>
          <span
            className={clsx(
              isFocused ? 'focused bg-slate-100' : '',
              'group-selected:font-medium flex flex-1 items-center truncate px-0.5 py-1 font-normal',
            )}
          >
            {props.children}
          </span>
        </>
      )}
    </ListBoxItem>
  );
}

// function foo() {
//   return (
//     <form onSubmit={handleSubmit(onSubmit)}>
//       <div className="mb-2">
//         <label htmlFor="debit" className="block text-xs text-gray-700">
//           <span className="flex justify-between">
//             <span>Debit</span>
//             <span>
//               orig:{' '}
//               <span className={financeFont.className}>
//                 {ppCurrency(fOut(row[`debit${yearIdx}`]), {
//                   cents: true,
//                 })}
//               </span>
//             </span>
//           </span>
//         </label>
//         <div className={`flex ${financeFont.className} `}>
//           <div className="text-nowrap pr-2 pt-1">$</div>
//           <input
//             data-1p-ignore
//             onFocus={(e) => {
//               const target = e.target as HTMLInputElement;
//               target.select();
//             }}
//             type="text"
//             pattern="[0-9]+(\.[0-9]{1,2})?"
//             autoComplete="off"
//             {...register('debit')}
//             className={clsx(
//               formState.errors.debit
//                 ? ' text-red-900 ring-red-300 placeholder:text-red-300  focus:ring-red-500'
//                 : 'text-gray-900 placeholder:text-gray-400',
//               'block w-full border-0 px-1 py-1 text-right focus:outline-none',
//             )}
//           />
//         </div>
//       </div>
//       <div className="mb-2">
//         <label htmlFor="credit" className="block text-xs text-gray-700">
//           <span className="flex justify-between">
//             <span>Credit</span>
//             <span>
//               orig:{' '}
//               <span className={financeFont.className}>
//                 {ppCurrency(fOut(row[`credit${yearIdx}`]), {
//                   cents: true,
//                 })}
//               </span>
//             </span>
//           </span>
//         </label>
//         <div className={`flex ${financeFont.className} `}>
//           <div className="text-nowrap pr-2 pt-1">$</div>
//           <input
//             data-1p-ignore
//             onFocus={(e) => {
//               const target = e.target as HTMLInputElement;
//               target.select();
//             }}
//             type="text"
//             pattern="[0-9]+(\.[0-9]{1,2})?"
//             autoComplete="off"
//             {...register('credit')}
//             className={clsx(
//               formState.errors.credit
//                 ? ' text-red-900 ring-red-300 placeholder:text-red-300  focus:ring-red-500'
//                 : 'text-gray-900 placeholder:text-gray-400',
//               'block w-full border-0 px-1 py-1 text-right focus:outline-none',
//             )}
//           />
//         </div>
//       </div>
//       <div className="mb-2">
//         <label htmlFor="balance" className="block text-xs text-gray-700">
//           Comment
//         </label>
//         <textarea
//           {...register('comment')}
//           className="mt-1 block w-full rounded-sm border-gray-300 px-1.5 py-1 text-xs shadow-sm focus:border-sky-700 focus:ring focus:ring-sky-700 focus:ring-opacity-50"
//         />
//       </div>
//       <div className="flex justify-end">
//         {row[`adjustment${yearIdx}`].hasAdjustment ? (
//           <button
//             type="button"
//             className="mr-4 text-xs leading-6 text-gray-400 hover:text-gray-900"
//             onClick={() =>
//               reset({
//                 credit: String(fOut(row[`adjustment${yearIdx}`].credit || 0)),
//                 debit: String(fOut(row[`adjustment${yearIdx}`].debit || 0)),
//                 comment: row[`adjustment${yearIdx}`].comment,
//               })
//             }
//           >
//             Remove adjustment
//           </button>
//         ) : null}
//         <button
//           type="submit"
//           disabled={enableSubmit === false}
//           className={clsx(
//             enableSubmit === false
//               ? 'bg-gray-400'
//               : 'bg-sky-700 hover:bg-sky-900',
//             'rounded-md px-3 py-1 text-xs  text-white shadow-sm',
//           )}
//         >
//           {row[`adjustment${yearIdx}`].hasAdjustment ? 'Update' : 'Adjust'}
//         </button>
//       </div>
//     </form>
//   );
// }

export function AdjustmentPopover(props: PopoverProps) {
  return (
    <Popover
      {...props}
      className={({ isEntering, isExiting }) => `
          placement-bottom:mt-2 placement-top:mb-2 group w-[970px] rounded-lg bg-white ring-1 ring-black/10 drop-shadow-lg
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
