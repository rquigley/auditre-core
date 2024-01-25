'use client';

import { useRouter } from 'next/navigation';
import { useFormState, useFormStatus } from 'react-dom';

import { classNames } from '@/lib/util';

const initialState = {
  email: '',
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      aria-disabled={pending}
      className={classNames(
        pending
          ? 'bg-gray-400'
          : 'bg-sky-700 hover:bg-sky-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700',
        'mt-6 rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm',
      )}
    >
      Send Invite
    </button>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function Row({ org, action }: { org: any; action: () => void }) {
  const router = useRouter();
  return (
    <div>
      <a
        href="#"
        onClick={async () => {
          await action();
          router.refresh();
        }}
      >
        {org.name}
      </a>
    </div>
  );
}
