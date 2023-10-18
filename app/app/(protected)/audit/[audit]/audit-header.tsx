'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import Header from '@/components/header';

import type { Audit } from '@/types';

type Props = { audit: Audit };
export function AuditHeader(props: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const { audit } = props;
  const tabs = [
    { name: 'Requests', href: `/audit/${audit.id}` },
    { name: 'Output', href: `/audit/${audit.id}/output` },
    // { name: 'Documents', href: `/audit/${audit.id}/documents` },
    { name: 'Settings', href: `/audit/${audit.id}/settings` },
  ] as const;
  return (
    <>
      <Header
        title={`${audit.name} (${audit.year})`}
        //subtitle={audit.year ? String(audit.year) : undefined}
        breadcrumbs={[{ name: 'Audits', href: '/audits' }]}
      />

      <div className="mt-4 sm:mt-3">
        <div className="sm:hidden">
          <label htmlFor="current-tab" className="sr-only">
            Select a tab
          </label>
          <select
            id="current-tab"
            name="current-tab"
            className="block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-sky-700 focus:outline-none focus:ring-sky-700 sm:text-sm"
            // @ts-ignore
            defaultValue={tabs.find((tab) => pathname === tab.href).name}
          >
            {tabs.map((tab) => (
              <option key={tab.name} onClick={() => router.push(tab.href)}>
                {tab.name}
              </option>
            ))}
          </select>
        </div>
        <div className="hidden sm:block">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <Link
                key={tab.name}
                href={tab.href}
                className={clsx(
                  pathname === tab.href
                    ? 'border-sky-700 text-sky-700'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                  'whitespace-nowrap border-b-2 px-1 pb-4 text-sm font-medium',
                )}
                aria-current={pathname === tab.href ? 'page' : undefined}
              >
                {tab.name}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </>
  );
}
