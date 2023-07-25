'use client';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { businessDescriptionSchema as formSchema } from '@/lib/form-schema';
import { classNames } from '@/lib/util';
import type { RequestData } from '@/types';

type Props = {
  data: RequestData;
  saveData: (data: z.infer<typeof formSchema>) => void;
};

export default function BusinessDescriptionForm({ data, saveData }: Props) {
  const router = useRouter();

  async function onSubmit(data: z.infer<typeof formSchema>) {
    await saveData(data);
    router.refresh();
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      value: data.value,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-12">
        <div className="border-b border-gray-900/10 pb-12">
          {/* <h2 className="text-base font-semibold leading-7 text-gray-900">
            Description of the business
          </h2> */}
          <p className="mt-1 text-sm leading-6 text-gray-600">
            [Description of the business TODO]
          </p>

          <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
            <div className="sm:col-span-4">
              <label
                htmlFor="username"
                className="block text-sm font-medium leading-6 text-gray-900"
              >
                Description
              </label>
              <div className="mt-4">
                <textarea
                  rows={4}
                  {...register('value')}
                  className={classNames(
                    errors.value
                      ? ' text-red-900 ring-red-300 placeholder:text-red-300  focus:ring-red-500'
                      : 'text-gray-900 ring-gray-300 placeholder:text-gray-400 focus:ring-indigo-600',
                    'block w-full rounded-md border-0 py-1.5 px-2.5  shadow-sm ring-1 ring-inset  focus:ring-2 focus:ring-inset  sm:text-sm sm:leading-6',
                  )}
                />

                <p className="mt-2 text-sm text-red-600" id="email-error">
                  {errors.value?.message}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end gap-x-6">
        <button
          type="button"
          className="text-sm font-semibold leading-6 text-gray-900"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          Save
        </button>
      </div>
    </form>
  );
}
