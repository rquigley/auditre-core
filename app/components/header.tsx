'use client';

import { Menu, Transition } from '@headlessui/react';
import { ChevronRightIcon } from '@heroicons/react/20/solid';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Fragment, useState } from 'react';

type Props = {
  title: string;
  subtitle?: string;
  breadcrumbs?: { name: string; href: string }[];
  settings?: React.ReactNode;
};

export function Header({ title, subtitle, breadcrumbs, settings }: Props) {
  return (
    <div className="w-screen bg-white h-14 fixed border-b border-gray-200 pl-14 lg:pl-4 flex lg:pr-56 items-center justify-between">
      <div className="flex-0 flex items-center">
        <h2 className="text-sm sm:truncate sm:tracking-tight text-gray-700">
          {breadcrumbs &&
            breadcrumbs.map((b, idx) => (
              <span key={b.name}>
                {idx > 0 ? (
                  <ChevronRightIcon
                    className="size-4 text-gray-400 inline"
                    aria-hidden="true"
                  />
                ) : null}
                <Link
                  href={b.href}
                  className="hover:text-gray-600 hover:underline"
                >
                  {b.name}
                  {idx === breadcrumbs.length - 1 ? (
                    <ChevronRightIcon
                      className="size-4 text-gray-400 inline"
                      aria-hidden="true"
                    />
                  ) : (
                    ''
                  )}
                </Link>
              </span>
            ))}

          {title}
          {subtitle && <span className=""> ({subtitle})</span>}
        </h2>
        {settings ? <Settings options={settings} /> : null}
      </div>

      <Search />

      <div className="self-end w-20">{/* Options here */}</div>
    </div>
  );
}

function Search() {
  const [focused, setFocused] = useState(false);
  return (
    <div
      className={clsx(
        focused ? 'bg-red-400' : '',
        'flex-0 self-center w-96 relative',
      )}
    >
      <label htmlFor="search" className="sr-only">
        Search
      </label>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <MagnifyingGlassIcon
            className="size-5 text-gray-400"
            aria-hidden="true"
          />
        </div>
        <input
          id="search"
          name="search"
          className="block w-full rounded-md border-0 bg-white py-1.5 pl-10 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
          placeholder="Search"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          type="search"
        />
      </div>
      {/* <div className="absolute -l-4 -r-4 border bg-red-500 w-full"> </div> */}
      {focused ? (
        <div className="absolute h-60 border bg-white w-full">Search here</div>
      ) : null}
    </div>
  );
}

function Settings({ options }: { options: React.ReactNode }) {
  return (
    <Menu as="div" className="relative">
      <Menu.Button className="text-gray-500 hover:text-gray-900 p-2 hover:bg-gray-50 rounded-sm">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="size-4 "
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </Menu.Button>
      <SettingsItems options={options} />
    </Menu>
  );
}

function SettingsItems({ options }: { options: React.ReactNode }) {
  return (
    <Transition
      as={Fragment}
      enter="transition ease-out duration-100"
      enterFrom="transform opacity-0 scale-95"
      enterTo="transform opacity-100 scale-100"
      leave="transition ease-in duration-75"
      leaveFrom="transform opacity-100 scale-100"
      leaveTo="transform opacity-0 scale-95"
    >
      <Menu.Items className="absolute left-0 w-52 origin-top-left divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
        {options}
      </Menu.Items>
    </Transition>
  );
}

export function AuditSettings({ auditId }: { auditId: string }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <>
      <div className="px-1 py-1">
        <Menu.Item>
          {({ active }) => (
            <Link
              href={`/audit/${auditId}/settings`}
              className={clsx(
                active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                'group flex w-full items-center rounded-md px-4 py-2 text-xs',
              )}
            >
              Edit audit...
            </Link>
          )}
        </Menu.Item>
      </div>

      <div className="px-1 py-1">
        <Menu.Item>
          {({ active }) => (
            <button
              type="button"
              onClick={() => router.push(pathname + '?delete-audit=1')}
              className={clsx(
                active ? 'bg-gray-100 text-red-500' : 'text-red-600',
                'group flex w-full items-center rounded-md px-4 py-2 text-xs',
              )}
            >
              Delete
            </button>
          )}
        </Menu.Item>
      </div>
    </>
  );
}
