'use client';

import { Dialog, Menu, Transition } from '@headlessui/react';
import {
  Bars3Icon,
  BuildingLibraryIcon,
  ChartPieIcon,
  DocumentDuplicateIcon,
  HomeIcon,
  UsersIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Fragment, useState } from 'react';

import { classNames } from '@/lib/util';

import type { IconProps } from '@/types';

export default function Navbar({
  userName,
  userImage,
}: {
  userName: string | null;
  userImage: string | null;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const rootPathname = `/${pathname.split('/')[1]}`;

  const navigation = [
    {
      name: 'Dashboard',
      href: '/',
      icon: HomeIcon,
    },
    {
      name: 'Audits',
      href: '/audits',
      altRoots: ['/request', '/audit'],
      icon: BuildingLibraryIcon,
    },
    {
      name: 'Documents',
      href: '/documents',
      altRoots: ['/document'],
      icon: DocumentDuplicateIcon,
    },
    {
      name: 'Organization',
      href: '/organization-settings',
      icon: UsersIcon,
    },
  ];

  return (
    <>
      <Transition.Root show={sidebarOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-40 lg:hidden"
          onClose={setSidebarOpen}
        >
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-900/80" />
          </Transition.Child>

          <div className="fixed inset-0 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                <Transition.Child
                  as={Fragment}
                  enter="ease-in-out duration-300"
                  enterFrom="opacity-0"
                  enterTo="opacity-100"
                  leave="ease-in-out duration-300"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                    <button
                      type="button"
                      className="-m-2.5 p-2.5"
                      onClick={() => setSidebarOpen(false)}
                    >
                      <span className="sr-only">Close sidebar</span>
                      <XMarkIcon
                        className="h-6 w-6 text-white"
                        aria-hidden="true"
                      />
                    </button>
                  </div>
                </Transition.Child>
                {/* Sidebar component, swap this element with another sidebar if you like */}
                <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-2">
                  <div className="flex h-16 shrink-0 items-center">
                    <img className="h-8 w-auto" src="/logo.svg" alt="AuditRe" />
                  </div>
                  <nav className="flex flex-1 flex-col">
                    <ul role="list" className="flex flex-1 flex-col gap-y-7">
                      <li>
                        <ul role="list" className="-mx-2 space-y-1">
                          {navigation.map((item) => (
                            <NavItem
                              key={item.name}
                              item={item}
                              rootPathname={rootPathname}
                            />
                          ))}
                        </ul>
                      </li>
                    </ul>
                  </nav>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Static sidebar for desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-40 lg:flex lg:w-55 lg:flex-col">
        {/* Sidebar component, swap this element with another sidebar if you like */}
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white px-6">
          <div className="flex h-16 shrink-0 items-center">
            <img className="h-8 w-auto" src="/logo.svg" alt="AuditRe" />
          </div>
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {navigation.map((item) => (
                    <NavItem
                      key={item.name}
                      item={item}
                      rootPathname={rootPathname}
                    />
                  ))}
                </ul>
              </li>
              <li className="-mx-6 mt-auto">
                <Menu as="div" className="flex relative text-left">
                  <div>
                    <Menu.Button className="flex items-center gap-x-4 px-6 py-3 text-sm font-semibold leading-6 text-gray-900 hover:bg-gray-50">
                      {userImage && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          className="h-8 w-8 rounded-full bg-gray-50"
                          src={userImage}
                          alt={userName || ''}
                        />
                      )}
                      <span className="sr-only">Your profile</span>
                      <span aria-hidden="true">{userName || ''}</span>
                    </Menu.Button>
                  </div>
                  <AccountMenuItems />
                </Menu>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      <div className="sticky top-0 z-30 flex items-center gap-x-6 bg-white px-4 py-4 shadow-sm sm:px-6 lg:hidden">
        <button
          type="button"
          className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
          onClick={() => setSidebarOpen(true)}
        >
          <span className="sr-only">Open sidebar</span>
          <Bars3Icon className="h-6 w-6" aria-hidden="true" />
        </button>
        <div className="flex-1 text-sm font-semibold leading-6 text-gray-900">
          Dashboard
        </div>
        <a href="#">
          <span className="sr-only">Your profile</span>
          {userImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="h-8 w-8 rounded-full bg-gray-50"
              src={userImage}
              alt={userName || ''}
            />
          )}
        </a>
      </div>
    </>
  );
}

function AccountMenuItems() {
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
      <Menu.Items className="absolute right-0 z-10 mt-2 w-50 origin-top-right bottom-full rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
        <div className="py-1">
          <Menu.Item>
            {({ active }) => (
              <Link
                href="/settings"
                className={classNames(
                  active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                  'block px-4 py-2 text-sm',
                )}
              >
                Account settings
              </Link>
            )}
          </Menu.Item>
          <Menu.Item>
            {({ active }) => (
              <Link
                href="/support"
                className={classNames(
                  active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                  'block px-4 py-2 text-sm',
                )}
              >
                Support
              </Link>
            )}
          </Menu.Item>
          <Menu.Item>
            {({ active }) => (
              <a
                onClick={() => signOut()}
                className={classNames(
                  active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                  'block w-full px-4 py-2 text-left text-sm',
                )}
              >
                Sign out
              </a>
            )}
          </Menu.Item>
        </div>
      </Menu.Items>
    </Transition>
  );
}

type NavItemProps = {
  name: string;
  href: string;
  icon: React.FC<IconProps>;
  altRoots?: string[];
};
function NavItem({
  item,
  rootPathname,
}: {
  item: NavItemProps;
  rootPathname: string;
}) {
  const matchingPaths = [
    `/${item.href.split('/')[1]}`,
    ...(item.altRoots ?? []),
  ];
  const isSelected = matchingPaths.includes(rootPathname);

  return (
    <li key={item.name}>
      <Link
        href={item.href}
        className={classNames(
          isSelected
            ? 'bg-gray-50 text-sky-700'
            : 'text-gray-700 hover:text-sky-700 hover:bg-gray-50',
          'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold',
        )}
      >
        <item.icon
          className={classNames(
            isSelected
              ? 'text-sky-700'
              : 'text-gray-400 group-hover:text-sky-700',
            'h-6 w-6 shrink-0',
          )}
          aria-hidden="true"
        />
        {item.name}
      </Link>
    </li>
  );
}
