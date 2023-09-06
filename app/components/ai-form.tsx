'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { DocumentQuery } from '@/types';
import { classNames } from '@/lib/util';
import { zodResolver } from '@hookform/resolvers/zod';
import SaveNotice from '@/components/save-notice';

import z from 'zod';

const schema = z.object({
  query: z.string().max(500),
});
export default function AI({
  saveData,
}: {
  saveData: (data: z.infer<typeof schema>) => void;
}) {
  const [hasSaved, setHasSaved] = useState(false);

  const {
    formState: { isDirty, dirtyFields },
    register,
    setValue,
    getValues,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),

    defaultValues: {
      query: '',
    },

    //values: data,
  });

  async function onSubmit(data: z.infer<typeof schema>) {
    setHasSaved(false);
    //@ts-ignore
    await saveData(data);
    setHasSaved(true);
    // prevent documents from being created multiple times
    // UNDONE because it breaks inputs reflecting the current value
    //reset();
    // reload activity feed
    //router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-12">
        <textarea
          {...register('query')}
          rows={3}
          className={classNames(
            errors.query
              ? ' text-red-900 ring-red-300 placeholder:text-red-300  focus:ring-red-500'
              : 'text-gray-900 ring-gray-300 placeholder:text-gray-400 focus:ring-sky-700',
            'block w-full rounded-md border-0 py-1.5 px-2.5  shadow-sm ring-1 ring-inset  focus:ring-2 focus:ring-inset  sm:text-sm sm:leading-6',
          )}
        />
      </div>
      <div className="mt-4 flex items-center justify-end gap-x-6">
        {!isDirty && hasSaved && (
          <div className="flex-grow">
            <SaveNotice />
          </div>
        )}
        {isDirty && (
          <button
            type="button"
            className="text-sm font-semibold leading-6 text-gray-900"
            onClick={() => reset()}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={!isDirty}
          className={classNames(
            !isDirty
              ? 'bg-gray-400'
              : 'bg-sky-700 hover:bg-sky-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700',
            'rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm',
          )}
        >
          Ask
        </button>
      </div>
    </form>
  );
}
