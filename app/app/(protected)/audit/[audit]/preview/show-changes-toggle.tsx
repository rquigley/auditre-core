'use client';

import { Switch } from '@headlessui/react';
import clsx from 'clsx';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export function ShowChangesToggle() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isEnabled = searchParams.get('show-changes') === '1';

  return (
    <Switch.Group as="div" className="flex items-center">
      <Switch
        checked={isEnabled}
        onChange={() => {
          router.push(pathname + '?show-changes=' + (isEnabled ? '0' : '1'));
        }}
        className={clsx(
          isEnabled ? 'bg-sky-700' : 'bg-gray-200',
          'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-700 focus:ring-offset-2',
        )}
      >
        <span
          aria-hidden="true"
          className={clsx(
            isEnabled ? 'translate-x-5' : 'translate-x-0',
            'pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
          )}
        />
      </Switch>
      <Switch.Label as="span" className="ml-3 text-sm">
        <span className="font-medium text-gray-900">Show changes</span>
      </Switch.Label>
    </Switch.Group>
  );
}
