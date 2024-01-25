'use client';

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

export default function NewInviteForm({
  createInvite,
}: {
  createInvite: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prevState: any,
    formData: FormData,
  ) => Promise<{ message: string }>;
}) {
  // @ts-expect-error
  const [state, formAction] = useFormState(createInvite, initialState);

  return (
    <form action={formAction}>
      <div className="sm:col-span-4">
        <label
          htmlFor="email"
          className="block text-sm font-medium leading-6 text-gray-900"
        >
          New invite email
        </label>
        <div className="mt-2">
          <input
            id="email"
            name="email"
            type="text"
            className="block w-70 rounded-md border-0 p-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
          />
        </div>
      </div>
      <SubmitButton />
      <p aria-live="polite" className="sr-only" role="status">
        {state?.message}
      </p>
    </form>
  );
}
