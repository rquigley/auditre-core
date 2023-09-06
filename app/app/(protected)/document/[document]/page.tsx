import { notFound } from 'next/navigation';
import { classNames } from '@/lib/util';
import { PaperClipIcon } from '@heroicons/react/20/solid';
import Header from '@/components/header';
import Datetime from '@/components/datetime';
import { getCurrent } from '@/controllers/session-user';
import {
  getById as getRequestById,
  getChangesById,
  Change,
} from '@/controllers/request';
import type { User } from '@/types';
import { getById } from '@/controllers/document';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import {
  DocumentArrowDownIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import { Document } from '@/types';
import AI from '@/components/ai';

//import FormContainer from './form-container';

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
            <Activity changes={await getChangesById(id)} user={user} />
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

function Activity({ changes, user }: { changes: Change[]; user: User }) {
  return (
    <>
      <h2 className="text-sm font-semibold leading-6 text-gray-900">
        Activity
      </h2>
      <ul role="list" className="mt-6 space-y-6">
        {changes.map((change, idx) => (
          <li key={idx} className="relative flex gap-x-4">
            <div
              className={classNames(
                idx === changes.length - 1 ? 'h-6' : '-bottom-6',
                'absolute left-0 top-0 flex w-6 justify-center',
              )}
            >
              <div className="w-px bg-gray-200" />
            </div>
            {
              //@ts-ignore
              change.type === 'COMMENT' ? (
                <>
                  {change.actor.type === 'USER' && change.actor.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={change.actor.image}
                      alt=""
                      className="relative mt-3 h-6 w-6 flex-none rounded-full bg-gray-50"
                    />
                  )}
                  <div className="flex-auto rounded-md p-3 ring-1 ring-inset ring-gray-200">
                    <div className="flex justify-between gap-x-4">
                      <div className="py-0.5 text-xs leading-5 text-gray-500">
                        <span className="font-medium text-gray-900">
                          {
                            //@ts-ignore
                            change.actor.name
                          }
                        </span>{' '}
                        commented
                      </div>
                      <Datetime
                        className="flex-none py-0.5 text-xs leading-5 text-gray-500"
                        dateTime={change.createdAt}
                      />
                    </div>
                    <p className="text-sm leading-6 text-gray-500">
                      {change.comment}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="relative flex h-6 w-6 flex-none items-center justify-center bg-white">
                    {
                      //@ts-ignore
                      change.type === 'paid' ? (
                        <CheckCircleIcon
                          className="h-6 w-6 text-sky-700"
                          aria-hidden="true"
                        />
                      ) : (
                        <div className="h-1.5 w-1.5 rounded-full bg-gray-100 ring-1 ring-gray-300" />
                      )
                    }
                  </div>
                  <p className="flex-auto py-0.5 text-xs leading-5 text-gray-500">
                    <span className="font-medium text-gray-900">
                      {
                        //@ts-ignore
                        change.actor.name
                      }
                    </span>{' '}
                    {change.type} the request.
                  </p>
                  <Datetime
                    className="flex-none py-0.5 text-xs leading-5 text-gray-500"
                    dateTime={change.createdAt}
                  />
                </>
              )
            }
          </li>
        ))}
      </ul>

      {/* New comment form */}
      <div className="mt-6 flex gap-x-3">
        {user.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.image}
            alt=""
            className="h-6 w-6 flex-none rounded-full bg-gray-50"
          />
        )}
        <form action="#" className="relative flex-auto">
          <div className="overflow-hidden rounded-lg pb-12 shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-sky-700">
            <label htmlFor="comment" className="sr-only">
              Add your comment
            </label>
            <textarea
              rows={2}
              name="comment"
              id="comment"
              className="block w-full resize-none border-0 bg-transparent py-1.5 px-2 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6"
              placeholder="Add your comment..."
              defaultValue={''}
            />
          </div>

          <div className="absolute inset-x-0 bottom-0 flex justify-between py-2 pl-3 pr-2">
            <div className="flex items-center space-x-5">
              <div className="flex items-center">
                <button
                  type="button"
                  className="-m-2.5 flex h-10 w-10 items-center justify-center rounded-full text-gray-400 hover:text-gray-500"
                >
                  <PaperClipIcon className="h-5 w-5" aria-hidden="true" />
                  <span className="sr-only">Attach a file</span>
                </button>
              </div>
            </div>
            <button
              type="submit"
              className="rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              Comment
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
