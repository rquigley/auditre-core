'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

type Props = {
  audit: { id: string; name: string; year: string };
  request0Slug: string;
};
export function AuditHeader(props: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const { audit } = props;
  const tabs = [
    {
      name: 'Requests',
      href: `/audit/${audit.id}/request/${props.request0Slug}`,
      matchHref: `/audit/${audit.id}/request`,
    },
    { name: 'Preview', href: `/audit/${audit.id}/preview` },
    { name: 'Output', href: `/audit/${audit.id}/output` },
    // { name: 'Settings', href: `/audit/${audit.id}/settings` },
  ] as const;

  const matchPath = tabs.find((tab) =>
    // @ts-expect-error
    pathname.startsWith(tab?.matchHref || tab.href),
  )?.href;

  return (
    <div className="">
      <div className="mt-4 sm:mt-3 border-b border-gray-200 pb-5 sm:pb-0 pl-4">
        <div className="sm:hidden">
          <label htmlFor="current-tab" className="sr-only">
            Select a tab
          </label>
          <select
            id="current-tab"
            name="current-tab"
            className="block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-sky-700 focus:outline-none focus:ring-sky-700 sm:text-sm"
            defaultValue={matchPath}
            onChange={(e) => router.push(e.target.value)}
          >
            {tabs.map((tab) => (
              <option key={tab.name} value={tab.href}>
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
                  matchPath === tab.href
                    ? 'border-sky-700 text-sky-700'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                  'whitespace-nowrap border-b-2 px-1 pb-2 text-xs select-none transition-all',
                )}
                aria-current={matchPath === tab.href ? 'page' : undefined}
              >
                {tab.name}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}
