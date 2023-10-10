'use client';

import { Dialog, Transition } from '@headlessui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Fragment, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Text, Year } from '@/components/form-fields';
import { createAudit } from '@/lib/actions';
import { newAudit } from '@/lib/form-schema';
import { classNames } from '@/lib/util';

export default function NewAuditModal() {
  const searchParams = useSearchParams();

  const {
    formState: { isDirty, isSubmitting },
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof newAudit>>({
    resolver: zodResolver(newAudit),

    defaultValues: {
      name: '',
      year: new Date().getFullYear(),
    },
  });
  const router = useRouter();
  const pathname = usePathname();

  const cancelButtonRef = useRef(null);

  async function onSubmit(data: z.infer<typeof newAudit>) {
    await createAudit({
      name: data.name,
      year: data.year,
    });
    router.push(pathname);
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
                    <div className="mt-3 text-center sm:mt-5">
                      <Dialog.Title
                        as="h3"
                        className="text-base font-semibold leading-6 text-gray-900"
                      >
                        Create a new audit
                      </Dialog.Title>
                      <div className="mt-2">
                        <div>
                          <label
                            htmlFor={'name'}
                            className="block text-sm font-medium leading-6 text-gray-900 text-left"
                          >
                            Name
                          </label>
                          <Text
                            field="name"
                            register={register}
                            errors={errors}
                            config={{
                              input: 'text',
                              label: 'Name',
                              defaultValue: '',
                            }}
                          />
                        </div>
                        <div>
                          <label
                            htmlFor={'name'}
                            className="block text-sm font-medium leading-6 text-gray-900 text-left"
                          >
                            Year
                          </label>
                          <Year
                            field="year"
                            register={register}
                            errors={errors}
                            config={{
                              input: 'year',
                              label: 'Year',
                              defaultValue: '',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                    <button
                      type="submit"
                      disabled={!isDirty || isSubmitting}
                      className={classNames(
                        !isDirty
                          ? 'bg-gray-400'
                          : 'bg-sky-700 hover:bg-sky-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700',
                        'inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm sm:col-start-2',
                      )}
                    >
                      Create
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
