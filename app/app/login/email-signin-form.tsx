'use client';

import { Dialog, Transition } from '@headlessui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Fragment, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { BooleanField, Text, Year } from '@/components/form-fields';
import { createAudit } from '@/lib/actions';
import { classNames } from '@/lib/util';

const schema = z.object({
  email: z.string().min(3).max(96),
});

export default function NewAuditModal() {
  const searchParams = useSearchParams();

  const { formState, register, handleSubmit, getValues, setValue } = useForm<
    z.infer<typeof schema>
  >({
    resolver: zodResolver(schema),

    defaultValues: {
      email: '',
    },
  });
  const router = useRouter();
  const pathname = usePathname();

  const cancelButtonRef = useRef(null);

  async function onSubmit(data: z.infer<typeof schema>) {
    // const audit = await createAudit({
    //   name: data.name,
    //   year: data.year,
    //   hasDemoData: data.hasDemoData,
    // });
    // router.push(`/audit/${audit.id}/request/basic-info`);
  }

  return (
    <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
      <form onSubmit={handleSubmit(onSubmit)}>
        <div>
          <div className="mt-3 sm:mt-5">
            <Dialog.Title
              as="h3"
              className="text-base font-semibold leading-6 text-gray-900"
            >
              Create a new audit
            </Dialog.Title>
            <div className="mt-2">
              <div className="block">
                <label
                  htmlFor="name"
                  className="block text-sm font-medium leading-6 text-gray-900 text-left"
                >
                  Name
                </label>
                <Text
                  field="name"
                  register={register}
                  formState={formState}
                  config={{
                    input: 'text',
                    label: 'Name',
                    defaultValue: '',
                  }}
                />
              </div>
              <div className="align-left">
                <label
                  htmlFor="name"
                  className="block text-sm font-medium leading-6 text-gray-900 text-left"
                >
                  Year
                </label>
                <Year
                  field="year"
                  register={register}
                  formState={formState}
                  config={{
                    input: 'year',
                    label: 'Year',
                    defaultValue: '',
                  }}
                />
              </div>
              <div className="">
                <label
                  htmlFor="hasDemoData"
                  className="block text-sm font-medium leading-6 text-gray-900 text-left"
                >
                  Add demo data
                </label>
                <BooleanField
                  field="hasDemoData"
                  register={register}
                  formState={formState}
                  getValues={getValues}
                  // @ts-expect-error
                  setValue={setValue}
                  config={{
                    input: 'boolean',
                    label: 'Add demo data',
                    defaultValue: false,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
          <button
            type="submit"
            disabled={!formState.isDirty || formState.isSubmitting}
            className={classNames(
              !formState.isDirty || formState.isSubmitting
                ? 'bg-gray-400'
                : 'bg-sky-700 hover:bg-sky-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700',
              'inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm sm:col-start-2',
            )}
          >
            {formState.isSubmitting ? 'Creating' : 'Create'}
          </button>
          <button
            type="button"
            className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0"
            onClick={() => router.push(pathname)}
            ref={cancelButtonRef}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
