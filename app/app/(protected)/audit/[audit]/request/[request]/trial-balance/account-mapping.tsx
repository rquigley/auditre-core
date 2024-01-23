'use client';

import clsx from 'clsx';

import {
  accountTypeGroupToLabel,
  accountTypes,
  accountTypeToGroup,
  groupAccountTypes,
} from '@/lib/finance';
import { accountTypeGroupBGColors } from './util';

import type { AccountType, AccountTypeGroup } from '@/lib/finance';

export function AccountMapping({
  accountType,
  setMapping,
}: {
  accountType: AccountType;
  setMapping: (mapping: AccountType) => void;
}) {
  const groups = groupAccountTypes(accountTypes);
  return (
    <select
      className={clsx(
        getStylesForAccountType(accountType),
        'block w-full rounded-md border-0 py-1.5 pl-3 pr-10 ring-1 ring-inset focus:ring-2 focus:ring-sky-600 sm:text-xs sm:leading-6',
      )}
      value={accountType || 'UNKNOWN'}
      onChange={(e) => {
        setMapping(e.target.value as AccountType);
      }}
    >
      <option value="UNKNOWN">None</option>
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
    </select>
  );
}

function getStylesForAccountType(accountType: AccountType | null) {
  const group = accountTypeToGroup(accountType);
  return accountTypeGroupBGColors[group];
}
