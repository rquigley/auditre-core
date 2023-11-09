'use client';

import { CalendarIcon, ChevronRightIcon } from '@heroicons/react/20/solid';
import { Breadcrumbs } from '@sentry/nextjs';

import { balanceSheetTypes } from '@/lib/consolidated-balance-sheet';

type Props = {
  title: string;
  subtitle?: string;
  breadcrumbs?: { name: string; href: string }[];
};

export default function Header({ title, subtitle, breadcrumbs }: Props) {
  // return null;
  return (
    <div className="w-screen bg-white h-14 fixed border-b border-gray-200 pl-14 lg:pl-4 flex lg:pr-56 items-center justify-between">
      <h2 className="text-sm sm:truncate sm:tracking-tight text-gray-700 flex-0">
        {breadcrumbs &&
          breadcrumbs.map((b, idx) => (
            <span key={b.name}>
              {idx > 0 ? (
                <ChevronRightIcon
                  className="h-4 w-4 text-gray-400 inline"
                  aria-hidden="true"
                />
              ) : null}
              <a href={b.href} className="hover:text-gray-600">
                {b.name}
                {idx === breadcrumbs.length - 1 ? ': ' : ''}
              </a>
            </span>
          ))}

        {title}
        {subtitle && <span className="text-gray-400"> - {subtitle}</span>}
      </h2>
      <div className="flex-0">
        <label htmlFor="search" className="sr-only">
          Search
        </label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            {/* <MagnifyingGlassIcon
              className="h-5 w-5 text-gray-400"
              aria-hidden="true"
            /> */}
          </div>
          <input
            id="search"
            name="search"
            className="block w-full rounded-md border-0 bg-white py-1.5 pl-10 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            placeholder="Search"
            type="search"
          />
        </div>
      </div>
      <div>{/* Options here */}</div>
    </div>
  );
}
