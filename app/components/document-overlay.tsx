'use client';

import { Dialog, Transition } from '@headlessui/react';
// import {
//   LinkIcon,
//   PlusIcon,
//   QuestionMarkCircleIcon,
// } from '@heroicons/react/20/solid';
import { XMarkIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Fragment, Suspense, useState } from 'react';
import useSWR from 'swr';

// import { Await } from '@/components/await';
import { FiletypeIcon } from '@/components/filetype-icon';
import { MiniSpinner, PageSpinner } from '@/components/spinner';
import { reprocessDocument, reprocessDocumentQuery } from '@/lib/actions';
import { useIntercom } from '@/lib/hooks/use-intercom';
import Datetime from './datetime';

import type { DocumentDetails } from '@/app/(protected)/document/[document]/detail/route';
import type { DocumentId } from '@/types';

// const team = [
//   {
//     name: 'Tom Cook',
//     email: 'tom.cook@example.com',
//     href: '#',
//     imageUrl:
//       'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
//   },
//   {
//     name: 'Whitney Francis',
//     email: 'whitney.francis@example.com',
//     href: '#',
//     imageUrl:
//       'https://images.unsplash.com/photo-1517365830460-955ce3ccd263?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
//   },
//   {
//     name: 'Leonard Krasner',
//     email: 'leonard.krasner@example.com',
//     href: '#',
//     imageUrl:
//       'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
//   },
//   {
//     name: 'Floyd Miles',
//     email: 'floyd.miles@example.com',
//     href: '#',
//     imageUrl:
//       'https://images.unsplash.com/photo-1463453091185-61582044d556?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
//   },
//   {
//     name: 'Emily Selman',
//     email: 'emily.selman@example.com',
//     href: '#',
//     imageUrl:
//       'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
//   },
// ];

export function DocumentOverlay() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentDocumentId = searchParams.get('show-document-id');
  const onClose = () => router.push(pathname);

  useIntercom(null, !!currentDocumentId);

  return (
    <Transition.Root show={!!currentDocumentId} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <div className="fixed inset-0" />

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10 sm:pl-16">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-500 sm:duration-700"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-500 sm:duration-700"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <Dialog.Panel className="pointer-events-auto w-screen max-w-md">
                  <div className="flex h-full flex-col divide-y divide-gray-200 bg-white shadow-xl">
                    {currentDocumentId ? (
                      <Suspense fallback={<PageSpinner />}>
                        <Document
                          documentId={currentDocumentId}
                          onClose={onClose}
                        />{' '}
                      </Suspense>
                    ) : null}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}

type Fetcher = (input: RequestInfo, init?: RequestInit) => Promise<unknown>;

const fetcher: Fetcher = (input, init) =>
  fetch(input, init).then((res) => res.json());

function useDocument(documentId: DocumentId) {
  const { data, error, isLoading } = useSWR(
    `/document/${documentId}/detail`,
    fetcher,
    { suspense: true },
  );

  return {
    document: data as DocumentDetails,
    isLoading,
    isError: error,
  };
}

function Document({
  documentId,
  onClose,
}: {
  documentId: DocumentId;
  onClose: () => void;
}) {
  const { document } = useDocument(documentId);

  return (
    <div className="flex h-full flex-col divide-y divide-gray-200">
      <div className="h-0 flex-1 overflow-y-auto">
        <div className="bg-white px-4 py-6 sm:px-6 pt-24 lg:pt-6">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-base font-semibold leading-6 text-slate-700 flex">
              <FiletypeIcon filename={document.key} />
              <Link href={`/document/${document.id}`} className="ml-2">
                {document.name}
              </Link>
            </Dialog.Title>
            <div className="ml-3 flex h-7 items-center">
              <button
                type="button"
                className="relative rounded-md bg-gray-100 text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-white"
                onClick={onClose}
              >
                <span className="absolute -inset-2.5" />
                <span className="sr-only">Close panel</span>
                <XMarkIcon className="size-6" aria-hidden="true" />
              </button>
            </div>
          </div>

          <dl className="-my-3 divide-y divide-gray-100 px-1 py-4 text-sm leading-6">
            <div className="flex justify-between gap-x-4 py-3">
              <dt className="text-slate-500">Created</dt>
              <dd className="text-slate-900 font-medium">
                <Datetime dateTime={document.createdAt} />
              </dd>
            </div>
            <div className="flex justify-between gap-x-4 py-3">
              <dt className="text-slate-500">File last modified</dt>
              <dd className="text-slate-900 font-medium">
                <Datetime dateTime={document.fileLastModified} />
              </dd>
            </div>
            {document.uploadedByUser ? (
              <div className="flex align-middle justify-between gap-x-4 py-3">
                <dt className="text-slate-500">Uploaded by</dt>
                <dd className="text-slate-900 font-medium">
                  {document.uploadedByUser.image ? (
                    <Image
                      src={document.uploadedByUser.image}
                      alt={document.uploadedByUser.name || ''}
                      width="36"
                      height="36"
                      className="inline-block size-5 mr-2 rounded-full"
                    />
                  ) : null}
                  {document.uploadedByUser.name}
                </dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-x-4 py-3">
              <dt className="text-slate-500">Classified as</dt>
              <dd className="text-slate-900 font-medium">
                {document.classifiedType}
              </dd>
            </div>

            <div className="mt-1">
              <div className="text-sm text-slate-500 mt-3">
                {Object.keys(document.dataWithLabels).map((identifier) => (
                  <DataRow
                    key={identifier}
                    documentId={documentId}
                    identifier={identifier}
                    data={document.dataWithLabels[identifier]}
                  />
                ))}
              </div>
            </div>
          </dl>
        </div>

        {/* <div className="flex flex-1 flex-col justify-between">
          <div className="divide-y divide-gray-200 px-4 sm:px-6">
            <div className="space-y-6 pb-5 pt-6">
              <div>
                <label
                  htmlFor="project-name"
                  className="block text-sm font-medium leading-6 text-gray-900"
                >
                  Project name
                </label>
                <div className="mt-2">
                  <input
                    type="text"
                    name="project-name"
                    id="project-name"
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium leading-6 text-gray-900"
                >
                  Description
                </label>
                <div className="mt-2">
                  <textarea
                    id="description"
                    name="description"
                    rows={4}
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    defaultValue={''}
                  />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium leading-6 text-gray-900">
                  Uploaded by
                </h3>
                <div className="mt-2">
                  <div className="flex space-x-2">
                    {team.map((person) => (
                      <a
                        key={person.email}
                        href={person.href}
                        className="relative rounded-full hover:opacity-75"
                      >
                        <img
                          className="inline-block h-8 w-8 rounded-full"
                          src={person.imageUrl}
                          alt={person.name}
                        />
                      </a>
                    ))}
                    <button
                      type="button"
                      className="relative inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 border-dashed border-gray-200 bg-white text-gray-400 hover:border-gray-300 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                      <span className="absolute -inset-2" />
                      <span className="sr-only">Add team member</span>
                      <PlusIcon className="size-5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
              <fieldset>
                <legend className="text-sm font-medium leading-6 text-gray-900">
                  Privacy
                </legend>
                <div className="mt-2 space-y-4">
                  <div className="relative flex items-start">
                    <div className="absolute flex h-6 items-center">
                      <input
                        id="privacy-public"
                        name="privacy"
                        aria-describedby="privacy-public-description"
                        type="radio"
                        className="size-4 border-gray-300 text-indigo-600 focus:ring-indigo-600"
                        defaultChecked
                      />
                    </div>
                    <div className="pl-7 text-sm leading-6">
                      <label
                        htmlFor="privacy-public"
                        className="font-medium text-gray-900"
                      >
                        Public access
                      </label>
                      <p
                        id="privacy-public-description"
                        className="text-gray-500"
                      >
                        Everyone with the link will see this project.
                      </p>
                    </div>
                  </div>
                  <div>
                    <div className="relative flex items-start">
                      <div className="absolute flex h-6 items-center">
                        <input
                          id="privacy-private-to-project"
                          name="privacy"
                          aria-describedby="privacy-private-to-project-description"
                          type="radio"
                          className="size-4 border-gray-300 text-indigo-600 focus:ring-indigo-600"
                        />
                      </div>
                      <div className="pl-7 text-sm leading-6">
                        <label
                          htmlFor="privacy-private-to-project"
                          className="font-medium text-gray-900"
                        >
                          Private to project members
                        </label>
                        <p
                          id="privacy-private-to-project-description"
                          className="text-gray-500"
                        >
                          Only members of this project would be able to access.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="relative flex items-start">
                      <div className="absolute flex h-6 items-center">
                        <input
                          id="privacy-private"
                          name="privacy"
                          aria-describedby="privacy-private-to-project-description"
                          type="radio"
                          className="size-4 border-gray-300 text-indigo-600 focus:ring-indigo-600"
                        />
                      </div>
                      <div className="pl-7 text-sm leading-6">
                        <label
                          htmlFor="privacy-private"
                          className="font-medium text-gray-900"
                        >
                          Private to you
                        </label>
                        <p
                          id="privacy-private-description"
                          className="text-gray-500"
                        >
                          You are the only one able to access this project.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </fieldset>
            </div>
            <div className="pb-6 pt-4">
              <div className="flex text-sm">
                <a
                  href="#"
                  className="group inline-flex items-center font-medium text-indigo-600 hover:text-indigo-900"
                >
                  <LinkIcon
                    className="size-5 text-indigo-500 group-hover:text-indigo-900"
                    aria-hidden="true"
                  />
                  <span className="ml-2">Copy link</span>
                </a>
              </div>
              <div className="mt-4 flex text-sm">
                <a
                  href="#"
                  className="group inline-flex items-center text-gray-500 hover:text-gray-900"
                >
                  <QuestionMarkCircleIcon
                    className="size-5 text-gray-400 group-hover:text-gray-500"
                    aria-hidden="true"
                  />
                  <span className="ml-2">Learn more about sharing</span>
                </a>
              </div>
            </div>
          </div>
        </div> */}
      </div>
      <div className="flex flex-shrink-0 justify-end px-4 py-4">
        {/* <button
          type="button"
          className="mr-2 rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          onClick={async () => {
            onClose();
            await deleteDocument(documentId);
          }}
        >
          Delete
        </button> */}
        {process.env.NEXT_PUBLIC_ENVIRONMENT !== 'production' && (
          <button
            type="button"
            className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            onClick={() => reprocessDocument(documentId)}
          >
            Reprocess
          </button>
        )}
        <a
          href={`/document/${documentId}/download`}
          className="ml-4 inline-flex justify-center rounded-md bg-slate-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600"
        >
          Download
        </a>
      </div>
    </div>
  );
}

function DataRow({
  identifier,
  documentId,
  data,
}: {
  identifier: string;
  documentId: DocumentId;
  data: {
    value: string | undefined;
    label: string | undefined;
    status: string | undefined;
  };
}) {
  const [processing, setProcessing] = useState(false);
  if (!data.label) {
    return null;
  }
  return (
    <div className="mb-2">
      <div className="flex  items-center text-xs leading-5 font-semibold text-gray-600">
        <span className="inline-block">{data.label}</span>
        <button
          onClick={async () => {
            setProcessing(true);
            await reprocessDocumentQuery(documentId, identifier);
            setProcessing(false);
          }}
          className="ml-1 hover:bg-slate-100 rounded p-0.5"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            fill="currentColor"
            className={clsx(
              processing ? 'animate-spin' : '',
              'size-3 text-gray-500',
            )}
          >
            <path
              fillRule="evenodd"
              d="M13.836 2.477a.75.75 0 0 1 .75.75v3.182a.75.75 0 0 1-.75.75h-3.182a.75.75 0 0 1 0-1.5h1.37l-.84-.841a4.5 4.5 0 0 0-7.08.932.75.75 0 0 1-1.3-.75 6 6 0 0 1 9.44-1.242l.842.84V3.227a.75.75 0 0 1 .75-.75Zm-.911 7.5A.75.75 0 0 1 13.199 11a6 6 0 0 1-9.44 1.241l-.84-.84v1.371a.75.75 0 0 1-1.5 0V9.591a.75.75 0 0 1 .75-.75H5.35a.75.75 0 0 1 0 1.5H3.98l.841.841a4.5 4.5 0 0 0 7.08-.932.75.75 0 0 1 1.025-.273Z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
      <p className="text-xs leading-5 text-gray-600">
        {data.status === 'PENDING' ? <MiniSpinner /> : data.value}
      </p>
    </div>
  );
}
