'use client';

import clsx from 'clsx';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { overrideAccountMapping } from '@/lib/actions';
import {
  accountTypeGroupToLabel,
  accountTypes,
  accountTypeToGroup,
  groupAccountTypes,
} from '@/lib/finance';
import { accountTypeGroupBGColors } from './table';

import type { AccountType, AccountTypeGroup } from '@/lib/finance';
import type { AccountBalanceId, AuditId } from '@/types';

export function AccountMapping({
  auditId,
  accountBalanceId,
  accountType,
}: {
  auditId: AuditId;
  accountBalanceId: AccountBalanceId;
  accountType: AccountType;
}) {
  const [currentAccountType, setCurrentAccountType] =
    useState<AccountType | null>(accountType);
  useEffect(() => {
    setCurrentAccountType(accountType);
  }, [accountType]);

  const groups = groupAccountTypes(accountTypes);
  return (
    <select
      className={clsx(
        getStylesForAccountType(currentAccountType),
        'block w-full rounded-md border-0 py-1.5 pl-3 pr-10 ring-1 ring-inset focus:ring-2 focus:ring-sky-600 sm:text-xs sm:leading-6',
      )}
      value={currentAccountType || ''}
      onChange={async (e) => {
        const val = (e.target.value as AccountType) || null;
        setCurrentAccountType(val);
        await overrideAccountMapping({
          auditId,
          accountBalanceId,
          accountType: val,
        });
        toast.success('Account mapping updated');
      }}
    >
      <option value="">None</option>
      {Object.keys(groups).map((g) => {
        const group = g as AccountTypeGroup;
        return (
          <optgroup key={group} label={accountTypeGroupToLabel(group)}>
            {Object.keys(groups[group]).map((t) => (
              <option key={t} value={t}>
                {groups[group][t]}
              </option>
            ))}
          </optgroup>
        );
      })}
      {/* {currentAccountType === 'INTERCOMPANY' ? (
        <optgroup label="Other">
          <option value={currentAccountType}>
            {accountTypes[currentAccountType]}
          </option>
        </optgroup>
      ) : null} */}
    </select>
  );
}

function getStylesForAccountType(accountType: AccountType | null) {
  const group = accountTypeToGroup(accountType);
  return accountTypeGroupBGColors[group];
}
