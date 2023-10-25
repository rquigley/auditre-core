'use client';

import { Menu, Transition } from '@headlessui/react';
import { EllipsisVerticalIcon } from '@heroicons/react/20/solid';
import { Fragment } from 'react';
import {
  // @ts-expect-error
  experimental_useFormState as useFormState,
  // @ts-expect-error
  experimental_useFormStatus as useFormStatus,
} from 'react-dom';

import { classNames } from '@/lib/util';

import type { Invitation } from '@/types';

export default function InviteSubmenu({
  invitation,
  deleteInvite,
}: {
  invitation: Invitation;
  deleteInvite: (
    prevState: any,
    formData: FormData,
  ) => Promise<{ message: string }>;
}) {
  return (
    <Menu as="div" className="relative flex-none">
      <Menu.Button className="-m-2.5 block p-2.5 text-gray-500 hover:text-gray-900">
        <span className="sr-only">Open options</span>
        <EllipsisVerticalIcon className="h-5 w-5" aria-hidden="true" />
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
              <a
                href="#"
                className={classNames(
                  active ? 'bg-gray-50' : '',
                  'block px-3 py-1 text-sm leading-6 text-gray-900',
                )}
              >
                Resend invite
                <span className="sr-only">to {invitation.email}</span>
              </a>
            )}
          </Menu.Item>
          <Menu.Item>
            {({ active }) => (
              <div>
                <DeleteForm
                  invitation={invitation}
                  active={active}
                  deleteInvite={deleteInvite}
                />
              </div>
            )}
          </Menu.Item>
        </Menu.Items>
      </Transition>
    </Menu>
  );
}

function DeleteForm({
  invitation,
  active,
  deleteInvite,
}: {
  invitation: Invitation;
  active: boolean;
  deleteInvite: any;
}) {
  const initialState = {
    message: null,
  };
  const [state, formAction] = useFormState(deleteInvite, initialState);
  return (
    <form action={formAction}>
      <input type="hidden" name="inviteId" value={invitation.id} />
      <button
        className={classNames(
          active ? 'bg-gray-50' : '',
          'w-full text-left block px-3 py-1 text-sm leading-6 text-gray-900',
        )}
      >
        Delete<span className="sr-only">, {invitation.email}</span>
      </button>
    </form>
  );
}
