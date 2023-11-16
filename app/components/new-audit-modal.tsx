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

// this duplicates the schema in actions, but Next prevents non-async actions
// from export
const newAuditSchema = z.object({
  name: z.string().min(3).max(72),
  year: z.string().min(1),
  hasDemoData: z.coerce.boolean(),
});

export default function NewAuditModal() {
  const searchParams = useSearchParams();

  const { formState, register, handleSubmit, getValues, setValue } = useForm<
    z.infer<typeof newAuditSchema>
  >({
    resolver: zodResolver(newAuditSchema),

    defaultValues: {
      name: '',
      year: '',
      hasDemoData: false,
    },
  });
  const router = useRouter();
  const pathname = usePathname();

  const cancelButtonRef = useRef(null);

  async function onSubmit(data: z.infer<typeof newAuditSchema>) {
    const audit = await createAudit({
      name: data.name,
      year: data.year,
      hasDemoData: data.hasDemoData,
    });
    router.push(`/audit/${audit.id}/request/basic-info`);
  }

  return (
    <Transition.Root show={searchParams.get('new') === '1'} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-50"
        initialFocus={cancelButtonRef}
        onClose={() => router.push(pathname)}
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
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
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
