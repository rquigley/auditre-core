'use client';

import { Dialog, Menu, Transition } from '@headlessui/react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { signOut } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Fragment, useState } from 'react';

import { classNames } from '@/lib/util';

export function Navbar({
  userName,
  userImage,
  orgName,
}: {
  userName: string | null;
  userImage: string | null;
  orgName: string;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const rootPathname = `/${pathname.split('/')[1]}`;

  const navigation = [
    {
      name: 'Home',
      href: '/',
    },
    {
      name: 'Audits',
      href: '/audits',
      altRoots: ['/request', '/audit'],
    },
    {
      name: 'Documents',
      href: '/documents',
      altRoots: ['/document'],
    },
    // {
    //   name: 'Organization',
    //   href: '/organization-settings',
    // },
  ];

  return (
    <>
      {/* Menu button */}
      <button
        className="lg:hidden fixed z-50 p-5"
        type="button"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-4 h-4 bg-white"
        >
          <path
            fillRule="evenodd"
            d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10zm0 5.25a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Full background on limited width screen when menu enabled */}
      <div
        className={clsx(
          sidebarOpen
            ? 'inset-0 h-screen w-screen opacity-100 absolute'
            : 'opacity-0 w-0',
          'bg-gray-200 opacity-40 z-30 lg:hidden transition-opacity',
        )}
      ></div>

      {/* Sidebar */}
      <div
        className={clsx(
          sidebarOpen
            ? 'left-0'
            : ' -left-72 overflow-hidden lg:overflow-visible',
          'h-screen lg:left-0 w-56 fixed z-40 transition-[left]',
        )}
      >
        <div className="flex w-56 grow flex-col h-full border-r border-gray-200 bg-gray-50 transition-none shadow-md">
          <div className="flex justify-between mt-8 lg:mt-0 h-14 w-full shrink-0 items-center pl-5 pr-1">
            <Menu as="div">
              <Menu.Button className="flex hover:bg-slate-100 cursor-pointer select-none rounded-md p-2 -ml-2">
                <Image
                  width="28"
                  height="30"
                  src="/img/auditre_mark.svg"
                  alt="AuditRe"
                  className="w-5 h-5"
                />
                <div className="ml-2 text-sm text-gray-600 whitespace-nowrap">
                  {orgName}
                </div>
              </Menu.Button>
              <OrgMenuItems />
            </Menu>
            <Menu as="div" className="relative">
              <Menu.Button className="p-3 hover:bg-gray-50">
                {userImage && (
                  <div className="h-5 w-5 rounded-full bg-gray-50 overflow-hidden">
                    <Image
                      width="36"
                      height="36"
                      src={userImage}
                      alt={userName || ''}
                    />
                  </div>
                )}
                <span className="sr-only">Your profile</span>
              </Menu.Button>
              <AccountMenuItems />
            </Menu>
          </div>
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list">
                  {navigation.map((item) => (
                    <NavItem
                      key={item.name}
                      item={item}
                      rootPathname={rootPathname}
                      setSidebarOpen={setSidebarOpen}
                    />
                  ))}
                </ul>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </>
  );
}

function OrgMenuItems() {
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
      <Menu.Items className="absolute left-4 z-10 mt-2 w-52 origin-top-left  rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
        <div className="py-1">
          <Menu.Item>
            {({ active }) => (
              <Link
                href="#"
                className={classNames(
                  active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                  'block px-4 py-2 text-xs',
                )}
              >
                Switch workspace
              </Link>
            )}
          </Menu.Item>
          <Menu.Item>
            {({ active }) => (
              <Link
                href="/organization-settings"
                className={classNames(
                  active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                  'block px-4 py-2 text-xs',
                )}
              >
                Workplace settings
              </Link>
            )}
          </Menu.Item>
        </div>
      </Menu.Items>
    </Transition>
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
      <Menu.Items className="absolute left-4 z-10 mt-2 w-52 origin-top-left  rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
        <div className="py-1">
          <Menu.Item>
            {({ active }) => (
              <Link
                href="/settings"
                className={classNames(
                  active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                  'block px-4 py-2 text-xs',
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
                  'block px-4 py-2 text-xs',
                )}
              >
                Support
              </Link>
            )}
          </Menu.Item>
          <Menu.Item>
            {({ active }) => (
              <a
                href="#"
                onClick={() => signOut()}
                className={classNames(
                  active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                  'block w-full px-4 py-2 text-left text-xs',
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
  altRoots?: string[];
};
function NavItem({
  item,
  rootPathname,
  setSidebarOpen,
}: {
  item: NavItemProps;
  rootPathname: string;
  setSidebarOpen: (open: boolean) => void;
}) {
  const matchingPaths = [
    `/${item.href.split('/')[1]}`,
    ...(item.altRoots ?? []),
  ];
  const isSelected = matchingPaths.includes(rootPathname);

  return (
    <li
      key={item.name}
      className={classNames(
        isSelected ? 'border-l-sky-700 border-l-2' : 'border-l-2',
      )}
    >
      <Link
        href={item.href}
        onClick={() => setSidebarOpen(false)}
        className={classNames(
          isSelected
            ? ' text-sky-700'
            : 'text-gray-700 hover:text-sky-700 hover:bg-gray-50',
          'group pl-5 flex gap-x-3 rounded-md p-1 text-sm leading-6 transition-colors',
        )}
      >
        {item.name}
      </Link>
    </li>
  );
}
