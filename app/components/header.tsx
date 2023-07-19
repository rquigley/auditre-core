'use client';
import { Fragment } from 'react';
import {
  BriefcaseIcon,
  CalendarIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CurrencyDollarIcon,
  LinkIcon,
  MapPinIcon,
  PencilIcon,
} from '@heroicons/react/20/solid';
import { Menu, Transition } from '@headlessui/react';

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

type Props = {
  title: string;
  subtitle?: string;
  breadcrumbs?: Breadcrumb[];
};

export default function Header({ title, subtitle, breadcrumbs }: Props) {
  return (
    <div className="lg:flex lg:items-center lg:justify-between">
      <div className="min-w-0 flex-1">
        <nav className="flex" aria-label="Breadcrumb">
          <ol role="list" className="flex items-center space-x-4">
            {breadcrumbs
              ? breadcrumbs.map(({ name, href }, idx) => (
                  <BreadcrumbItem name={name} href={href} idx={idx} />
                ))
              : null}
          </ol>
        </nav>
        <h2 className="mt-2 text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
          {title}
        </h2>
        <div className="mt-1 flex flex-col sm:mt-0 sm:flex-row sm:flex-wrap sm:space-x-6">
          <div className="mt-2 flex items-center text-sm text-gray-500">
            <CalendarIcon
              className="mr-1.5 h-5 w-5 flex-shrink-0 text-gray-400"
              aria-hidden="true"
            />
            {subtitle}
          </div>
        </div>
      </div>
    </div>
  );
}

type Breadcrumb = { name: string; href?: string };
function BreadcrumbItem({ name, href, idx }: Breadcrumb & { idx: number }) {
  return (
    <li>
      <div className={idx === 0 ? 'flex' : 'flex items-center'}>
        {idx !== 0 ? (
          <ChevronRightIcon
            className="h-5 w-5 flex-shrink-0 text-gray-400"
            aria-hidden="true"
          />
        ) : null}
        <a
          href={href ? href : '#'}
          className={classNames(
            idx !== 0 ? 'ml-4' : '',
            'text-sm font-medium text-gray-500 hover:text-gray-700',
          )}
        >
          {name}
        </a>
      </div>
    </li>
  );
}
