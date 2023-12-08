'use client';

import clsx from 'clsx';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { overrideAccountMapping } from '@/lib/actions';
import { accountTypeGroupToLabel } from '@/lib/finance';

import type { AccountType } from '@/controllers/account-mapping';
import type { AccountTypeGroup, groupLabels } from '@/lib/finance';
import type { AccountMappingId, AuditId } from '@/types';

export function AccountMapping({
  auditId,
  accountMappingId,
  accountType,
  accountTypes,
}: {
  auditId: AuditId;
  accountMappingId: AccountMappingId;
  accountType: AccountType;
  accountTypes: Record<AccountTypeGroup, Record<string, string>>;
}) {
  const [currentAccountType, setCurrentAccountType] =
    useState<AccountType | null>(accountType);
  useEffect(() => {
    setCurrentAccountType(accountType);
  }, [accountType]);
  return useMemo(
    () => (
      <select
        className={clsx(
          !currentAccountType || currentAccountType === 'UNKNOWN'
            ? 'ring-red-600 text-red-900'
            : 'ring-gray-300 text-gray-900',
          'mt-2 block w-full rounded-md border-0 py-1.5 pl-3 pr-10 ring-1 ring-inset focus:ring-2 focus:ring-sky-600 sm:text-sm sm:leading-6',
        )}
        value={currentAccountType || ''}
        onChange={async (e) => {
          const val = (e.target.value as AccountType) || null;
          setCurrentAccountType(val);
          await overrideAccountMapping({
            auditId,
            accountMappingId,
            accountType: val,
          });
          toast.success('Account mapping updated');
        }}
      >
        <option value="">None</option>
        {Object.keys(accountTypes).map((group) => (
          <optgroup
            key={group}
            label={accountTypeGroupToLabel(group as AccountTypeGroup)}
          >
            {Object.keys(accountTypes[group as AccountTypeGroup]).map((t) => (
              <option key={t} value={t}>
                {accountTypes[group as AccountTypeGroup][t]}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    ),
    [auditId, accountMappingId, currentAccountType, accountTypes],
  );
}
