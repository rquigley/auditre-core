'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import clsx from 'clsx';
import { useForm } from 'react-hook-form';
import z from 'zod';

import type { KeyboardEvent } from 'react';

const schema = z.object({
  comment: z.string().max(500),
});
export default function CommentForm({
  saveData,
}: {
  saveData: (data: z.infer<typeof schema>) => void;
}) {
  const {
    formState: { isDirty },
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),

    defaultValues: {
      comment: '',
    },
  });

  async function onSubmit(data: z.infer<typeof schema>) {
    await saveData(data);
    reset();
  }

  function handleKeyDown(ev: KeyboardEvent<HTMLTextAreaElement>) {
    if (ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey)) {
      ev.preventDefault();
      onSubmit(getValues());
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="relative flex-auto">
      <div className="overflow-hidden rounded-lg pb-12 shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-sky-700">
        <label htmlFor="comment" className="sr-only">
          Add your comment
        </label>
        <textarea
          {...register('comment')}
          rows={2}
          className={clsx(
            errors.comment
              ? ' text-red-900 ring-red-300 placeholder:text-red-300  focus:ring-red-500'
              : 'text-gray-900 ring-gray-300 placeholder:text-gray-400 focus:ring-sky-700',
            'block w-full resize-none border-0 bg-transparent px-2 py-1.5 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6',
          )}
          placeholder="Add your comment..."
          onKeyDown={handleKeyDown}
        />
      </div>

      <div className="absolute inset-x-0 bottom-0 flex justify-between py-2 pl-3 pr-2">
        <div className="flex items-center space-x-5">
          <div className="flex items-center"></div>
        </div>
        <button
          type="submit"
          disabled={!isDirty}
          className={clsx(
            !isDirty
              ? 'text-gray-300 ring-gray-100'
              : 'text-gray-900 ring-gray-300 hover:bg-gray-50',
            'rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold  shadow-sm ring-1 ring-inset ',
          )}
        >
          Comment
        </button>
      </div>
    </form>
  );
}
