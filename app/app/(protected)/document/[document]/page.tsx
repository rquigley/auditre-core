import { UserCircleIcon } from '@heroicons/react/24/outline';
import { notFound } from 'next/navigation';

import AI from '@/components/ai';
import Header from '@/components/header';
import { getById } from '@/controllers/document';
import { getCurrent } from '@/controllers/session-user';
import { Document } from '@/types';

export default async function DocumentPage({
  params: { document: id },
}: {
  params: { document: string };
}) {
  const user = await getCurrent();
  const document = await getById(id);
  if (document.orgId !== user.orgId) {
    return notFound();
  }

  const breadcrumbs = [{ name: 'Documents', href: '/documents' }];

  return (
    <>
      <Header title={document.name} breadcrumbs={breadcrumbs} />

      <div className=" max-w-7xl px-4 py-16 sm:px-1 lg:px-1">
        <div className=" grid max-w-2xl grid-cols-1 grid-rows-1 items-start gap-x-8 gap-y-8 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          <div className="-mx-4 px-4 py-8 shadow-sm ring-1 ring-gray-900/5 sm:mx-0 sm:rounded-lg sm:px-8 sm:pb-14 lg:col-span-2 lg:row-span-2 lg:row-end-2 xl:px-16 xl:pb-20 xl:pt-16">
            <div className="text-med leading-6 text-gray-500">Raw Content</div>
            <div className="text-xs h-48 overflow-y-scroll p-4 rounded-lg shadow-sm ring-1 ring-inset ring-gray-300">
              {document.extracted}
            </div>
            <AI document={document} />
          </div>
          <div className="lg:col-start-3">
            {/* <Actions document={document} /> */}
            {/* <Activity changes={await getChangesById(id)} user={user} /> */}
          </div>
        </div>
      </div>
    </>
  );
}

function Actions({ document }: { document: Document }) {
  return (
    <div className="lg:col-start-3 lg:row-end-1 mb-5">
      <h2 className="sr-only">Document Info</h2>
      <div className="rounded-lg bg-gray-50 shadow-sm ring-1 ring-gray-900/5">
        <dl className="flex flex-wrap">
          <div className="flex w-full flex-none gap-x-4 px-3 pt-6">
            <dt className="flex-none">
              <span className="sr-only">Document Info</span>
              <UserCircleIcon
                className="h-6 w-5 text-gray-400"
                aria-hidden="true"
              />
            </dt>
            <dd className="text-sm font-medium leading-6 text-gray-900">
              Download
            </dd>
          </div>
          <div className="flex w-full flex-none gap-x-4 px-3">
            <dt className="flex-none">
              <span className="sr-only">Client</span>
              <UserCircleIcon
                className="h-6 w-5 text-gray-400"
                aria-hidden="true"
              />
            </dt>
            <dd className="text-sm font-medium leading-6 text-gray-900">AI</dd>
          </div>

          {/* <div className="flex-auto pl-6 pt-6">
            <dt className="text-sm font-semibold leading-6 text-gray-900">
              Amount
            </dt>
            <dd className="mt-1 text-base font-semibold leading-6 text-gray-900">
              $10,560.00
            </dd>
          </div>
          <div className="flex-none self-end px-6 pt-4">
            <dt className="sr-only">Status</dt>
            <dd className="rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-600 ring-1 ring-inset ring-green-600/20">
              Paid
            </dd>
          </div> */}
          <div className="mt-6 flex w-full flex-none gap-x-4 border-t border-gray-900/5 px-6 pt-6">
            <dt className="flex-none">
              <span className="sr-only">Client</span>
              <UserCircleIcon
                className="h-6 w-5 text-gray-400"
                aria-hidden="true"
              />
            </dt>
            <dd className="text-sm font-medium leading-6 text-gray-900">
              Alex Curren
            </dd>
          </div>
          <div className="mt-4 flex w-full flex-none gap-x-4 px-6">
            <dt className="flex-none">
              <span className="sr-only">Due date</span>
              {/* <CalendarDaysIcon
                className="h-6 w-5 text-gray-400"
                aria-hidden="true"
              /> */}
            </dt>
            <dd className="text-sm leading-6 text-gray-500">
              <time dateTime="2023-01-31">January 31, 2023</time>
            </dd>
          </div>
          <div className="mt-4 flex w-full flex-none gap-x-4 px-6">
            <dt className="flex-none">
              <span className="sr-only">Status</span>
              {/* <CreditCardIcon
                className="h-6 w-5 text-gray-400"
                aria-hidden="true"
              /> */}
            </dt>
            <dd className="text-sm leading-6 text-gray-500">
              Paid with MasterCard
            </dd>
          </div>
        </dl>
        <div className="mt-6 border-t border-gray-900/5 px-6 py-6">
          <a href="#" className="text-sm font-semibold leading-6 text-gray-900">
            Download receipt <span aria-hidden="true">&rarr;</span>
          </a>
        </div>
      </div>
    </div>
  );
}
