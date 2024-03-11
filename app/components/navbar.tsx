'use client';

import { Menu, Transition } from '@headlessui/react';
import clsx from 'clsx';
import { signOut } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Fragment, useState } from 'react';

import { switchOrg } from '@/lib/actions';

import type { OrgId } from '@/types';

type Props = {
  userName: string | null;
  userImage: string | null;
  orgName: string;
  orgId: OrgId;
  availableOrgs: {
    id: OrgId;
    name: string;
  }[];
  canManageOrgSettings: boolean;
  canManageOrgs: boolean;
};
export function Navbar({
  userName,
  userImage,
  orgName,
  orgId,
  availableOrgs,
  canManageOrgSettings,
  canManageOrgs,
}: Props) {
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
  ];
  if (orgName.length > 19) {
    orgName = orgName.slice(0, 18).trim() + '...';
  }
  return (
    <>
      {/* Menu button */}
      <button
        className="fixed z-50 p-5 lg:hidden"
        type="button"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="currentColor"
          viewBox="0 0 16 16"
          className="size-4 bg-white"
        >
          <path
            fillRule="evenodd"
            d="M2 3.75A.75.75 0 0 1 2.75 3h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 3.75ZM2 8a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 8Zm0 4.25a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Full background on limited width screen when menu enabled */}
      <div
        onClick={() => setSidebarOpen(false)}
        className={clsx(
          sidebarOpen
            ? 'absolute inset-0 h-screen w-screen opacity-100'
            : 'w-0 opacity-0',
          'z-30 bg-gray-200 opacity-40 transition-opacity lg:hidden',
        )}
      ></div>

      {/* Sidebar */}
      <div
        className={clsx(
          sidebarOpen
            ? 'left-0'
            : ' -left-72 overflow-hidden lg:overflow-visible',
          'fixed z-40 h-screen w-56 transition-[left] lg:left-0',
        )}
      >
        <div className="flex h-full w-56 grow flex-col border-r border-gray-200 bg-gray-50 shadow-md transition-none">
          <div className="mt-8 flex h-14 w-full shrink-0 items-center justify-between pl-5 pr-1 lg:mt-0">
            <Menu as="div">
              <Menu.Button className="-ml-2 flex cursor-pointer select-none rounded-md p-2 hover:bg-slate-100">
                <Image
                  width="28"
                  height="30"
                  src="/img/auditre_mark.svg"
                  alt="AuditRe"
                  className="size-5"
                />
                <div
                  className={clsx(
                    orgName.length > 18 ? 'text-xs' : 'text-sm',
                    'ml-2 whitespace-nowrap text-gray-600',
                  )}
                >
                  {orgName}
                </div>
              </Menu.Button>
              <OrgMenuItems
                availableOrgs={availableOrgs}
                activeOrgId={orgId}
                canManageOrgs={canManageOrgs}
                canManageOrgSettings={canManageOrgSettings}
              />
            </Menu>
            <Menu as="div" className="relative">
              <Menu.Button className="p-3 hover:bg-gray-50">
                <div className="flex size-5 items-center justify-center overflow-hidden rounded-full bg-gray-200">
                  {userImage ? (
                    <Image
                      width="36"
                      height="36"
                      src={userImage}
                      alt={userName || ''}
                    />
                  ) : (
                    <div className="text-xs text-slate-800">
                      {userName?.charAt(0)}
                    </div>
                  )}
                </div>
                <span className="sr-only">Your profile</span>
              </Menu.Button>
              <AccountMenuItems />
            </Menu>
          </div>
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-0">
              {navigation.map((item) => (
                <NavItem
                  key={item.name}
                  item={item}
                  rootPathname={rootPathname}
                  setSidebarOpen={setSidebarOpen}
                />
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </>
  );
}

function OrgMenuItems({
  availableOrgs,
  activeOrgId,
  canManageOrgs,
  canManageOrgSettings,
}: {
  availableOrgs: Props['availableOrgs'];
  activeOrgId: OrgId;
  canManageOrgs: boolean;
  canManageOrgSettings: boolean;
}) {
  const router = useRouter();

  availableOrgs.sort((a, b) => a.name.localeCompare(b.name));
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
      <Menu.Items className="absolute left-4 mt-2 w-52 origin-top-left divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
        <div className="px-1 py-1">
          {availableOrgs.map((org, idx) => (
            <Menu.Item key={idx}>
              {({ active }) => (
                <button
                  type="button"
                  onClick={async () => {
                    await switchOrg(org.id);
                    router.refresh();
                  }}
                  className={clsx(
                    active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                    'flex w-full items-center justify-between rounded-md px-4 py-2 text-xs',
                  )}
                >
                  <span className="inline-block text-left">{org.name}</span>

                  {org.id === activeOrgId && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="size-4 text-green-600"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m4.5 12.75 6 6 9-13.5"
                      />
                    </svg>
                  )}
                </button>
              )}
            </Menu.Item>
          ))}
        </div>
        {canManageOrgSettings && (
          <div className="px-1 py-1">
            <Menu.Item>
              {({ active }) => (
                <Link
                  href="/organization-settings"
                  className={clsx(
                    active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                    'block rounded-md px-4 py-2 text-xs',
                  )}
                >
                  Organization settings
                </Link>
              )}
            </Menu.Item>
          </div>
        )}
        {canManageOrgs && (
          <div className="px-1 py-1">
            <Menu.Item>
              {({ active }) => (
                <Link
                  href="/organizations"
                  className={clsx(
                    active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                    'block rounded-md px-4 py-2 text-xs',
                  )}
                >
                  Manage organizations
                </Link>
              )}
            </Menu.Item>
          </div>
        )}
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
      <Menu.Items className="absolute left-4 mt-2 w-52 origin-top-left divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
        <div className="px-1 py-1">
          <Menu.Item>
            {({ active }) => (
              <Link
                href="/settings"
                className={clsx(
                  active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                  'block rounded-md px-4 py-2 text-xs',
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
                className={clsx(
                  active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                  'block rounded-md px-4 py-2 text-xs',
                )}
              >
                Support
              </Link>
            )}
          </Menu.Item>
        </div>
        <div className="px-1 py-1">
          <Menu.Item>
            {({ active }) => (
              <button
                type="button"
                onClick={() => signOut()}
                className={clsx(
                  active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                  'group flex w-full items-center rounded-md px-4 py-2 text-xs',
                )}
              >
                Sign out
              </button>
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
      // className={clsx(
      //   isSelected ? 'border-l-sky-700 border-l-2' : 'border-l-2',
      // )}
      className="px-2"
    >
      <Link
        href={item.href}
        onClick={() => setSidebarOpen(false)}
        className={clsx(
          isSelected
            ? ' bg-slate-200 '
            : 'active-text-gray-400 text-gray-500 hover:bg-slate-200 active:bg-slate-300',
          'group flex w-full select-none gap-x-3 rounded-md px-3 py-1 text-sm leading-6 text-gray-700 transition-colors',
        )}
      >
        {item.name}
      </Link>
    </li>
  );
}
