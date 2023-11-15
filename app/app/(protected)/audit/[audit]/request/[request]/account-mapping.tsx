'use client';

import { useMemo } from 'react';
import { toast } from 'sonner';

import { overrideAccountMapping } from '@/lib/actions';
import { AccountMappingId, AccountType, AuditId } from '@/types';

export function AccountMapping({
  auditId,
  accountMappingId,
  accountType,
  accountTypes,
}: {
  auditId: AuditId;
  accountMappingId: AccountMappingId;
  accountType: AccountType | null;
  accountTypes: Record<string, Record<string, string>>;
}) {
  return useMemo(
    () => (
      <select
        className="mt-2 block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-sky-600 sm:text-sm sm:leading-6"
        defaultValue={accountType || ''}
        onChange={async (e) => {
          await overrideAccountMapping({
            auditId,
            accountMappingId,
            accountType: e.target.value as AccountType,
          });
          toast.success('Account mapping updated');
        }}
      >
        <option value="">None</option>
        {Object.keys(accountTypes).map((group) => (
          <optgroup key={group} label={group}>
            {Object.keys(accountTypes[group]).map((t) => (
              <option key={t} value={t}>
                {accountTypes[group][t]}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    ),
    [auditId, accountMappingId, accountType, accountTypes],
  );
}
