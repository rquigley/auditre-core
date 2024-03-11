'use client';

import { Menu, Transition } from '@headlessui/react';
import { EllipsisVerticalIcon } from '@heroicons/react/20/solid';
import clsx from 'clsx';
import { Fragment } from 'react';

import { deleteInvite, getInviteLink, resendInvite } from '@/lib/actions';

import type { Invitation } from '@/types';

export default function InviteSubmenu({
  invitation,
}: {
  invitation: Invitation;
}) {
  return (
    <Menu as="div" className="relative flex-none">
      <Menu.Button className="-m-2.5 block p-2.5 text-gray-500 hover:text-gray-900">
        <span className="sr-only">Open options</span>
        <EllipsisVerticalIcon className="size-5" aria-hidden="true" />
      </Menu.Button>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 z-10 mt-2 w-32 origin-top-right rounded-md bg-white py-2 shadow-lg ring-1 ring-gray-900/5 focus:outline-none">
          <Menu.Item>
            {({ active }) => (
              <button
                type="button"
                onClick={async () => {
                  const link = await getInviteLink(
                    invitation.orgId,
                    invitation.id,
                  );
                  navigator.clipboard.writeText(String(link));
                }}
                className={clsx(
                  active ? 'bg-gray-50' : '',
                  'flex w-full px-3 py-1 text-sm leading-6 text-gray-900',
                )}
              >
                Copy link
                <span className="sr-only">to {invitation.email}</span>
              </button>
            )}
          </Menu.Item>
          <Menu.Item>
            {({ active }) => (
              <button
                type="button"
                onClick={() => resendInvite(invitation.orgId, invitation.id)}
                className={clsx(
                  active ? 'bg-gray-50' : '',
                  'flex w-full px-3 py-1 text-sm leading-6 text-gray-900',
                )}
              >
                Resend invite
                <span className="sr-only">to {invitation.email}</span>
              </button>
            )}
          </Menu.Item>
          <Menu.Item>
            {({ active }) => (
              <button
                type="button"
                onClick={() => deleteInvite(invitation.orgId, invitation.id)}
                className={clsx(
                  active ? 'bg-gray-50' : '',
                  'flex w-full px-3 py-1 text-sm leading-6 text-gray-900',
                )}
              >
                Delete
                <span className="sr-only">to {invitation.email}</span>
              </button>
            )}
          </Menu.Item>
        </Menu.Items>
      </Transition>
    </Menu>
  );
}
