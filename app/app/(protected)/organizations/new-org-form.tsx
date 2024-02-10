'use client';

import { useFormState, useFormStatus } from 'react-dom';

import { createOrg } from '@/lib/actions';
import { classNames } from '@/lib/util';

const initialState = {
  message: '',
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
      Create Workspace
    </button>
  );
}

export default function NewOrgForm({
  currentOrgName,
}: {
  currentOrgName: string;
}) {
  const [state, formAction] = useFormState(createOrg, initialState);

  return (
    <form action={formAction}>
      <div className="sm:col-span-4">
        <label
          htmlFor="email"
          className="block text-sm font-medium leading-6 text-gray-900"
        >
          Create new workspace
        </label>

        <div className="mt-2 flex items-center">
          <div className="text-sm mr-2">{currentOrgName} / </div>
          <input
            id="name"
            name="name"
            type="text"
            className="block w-70 rounded-md border-0 p-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
          />
        </div>
      </div>
      {state?.message && (
        <div className="my-2 text-red-500 text-sm">{state?.message}</div>
      )}
      <SubmitButton />
      {/* <p aria-live="polite" className="sr-only" role="status">
        {state?.message}
      </p> */}
    </form>
  );
}
