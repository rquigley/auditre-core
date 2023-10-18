'use client';

import { Dialog, Transition } from '@headlessui/react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Fragment, useEffect, useRef, useState } from 'react';
import { z } from 'zod';

import type { Audit, AuditId } from '@/types';

// this duplicates the schema in actions, but Next prevents non-async actions
// from export
const newAuditSchema = z.object({
  name: z.string().min(3).max(72),
  year: z.coerce
    .number()
    .min(1970, 'The year must be at least 1970')
    .max(2050, 'The year must be before 2050'),
});

async function getData(auditId: AuditId) {
  const res = await fetch(`/audit/${auditId}/output/data`, {
    cache: 'no-store',
  });
  const data = (await res.json()) as any;
  return data;
}

export default function DataModal({ auditId }: { auditId: AuditId }) {
  const searchParams = useSearchParams();

  const router = useRouter();
  const pathname = usePathname();

  const cancelButtonRef = useRef(null);

  const [data, setData] = useState(null);

  useEffect(() => {
    getData(auditId).then((data) => setData(data));
  }, [auditId]);

  return (
    <Transition.Root show={searchParams.get('view-data') === '1'} as={Fragment}>
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
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-6">
                <div className="w-full h-full">
                  Data:
                  <br />
                  {/* {data ? JSON.stringify(data) : null} */}
                  {data
                    ? Object.keys(data).map((key) => {
                        return (
                          <RequestType key={key} name={key} data={data[key]} />
                        );
                      })
                    : null}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}

// @ts-ignore
function RequestType({ name, data }) {
  //   return (
  //     <div>
  //       {name}: {JSON.stringify(Object.keys(data))}
  //     </div>
  //   );
  return (
    <div className="my-4">
      <div className="font-semibold text-sm">{name}</div>
      <ul>
        {Object.keys(data).map((key) => (
          <li key={key}>
            {key}: {JSON.stringify(data[key])}
          </li>
        ))}
      </ul>
    </div>
  );
}
