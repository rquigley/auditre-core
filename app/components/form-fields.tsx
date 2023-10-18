'use client';

import { Switch } from '@headlessui/react';
import {
  ArrowLongRightIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import * as Sentry from '@sentry/react';
import clsx from 'clsx';
import { useEffect, useState } from 'react';

import Calendar from '@/components/calendar';
import { Document } from '@/components/document';
import {
  createDocument,
  // deleteDocument,
  getPresignedUploadUrl,
} from '@/lib/actions';
import { fetchWithProgress } from '@/lib/fetch-with-progress';
import {
  FormFieldBoolean,
  FormFieldCheckbox,
  FormFieldDate,
  FormFieldFile,
  FormFieldText,
  FormFieldYear,
} from '@/lib/request-types';
import { delay, pWithResolvers, ucFirst } from '@/lib/util';

import type { ClientSafeRequest, DocumentId, S3File } from '@/types';

type FormFieldProps = {
  field: string;
  register: any;
  formState: any;
};

export function Text({
  field,
  register,
  formState: { errors },
  config,
}: FormFieldProps & { config: FormFieldText }) {
  return (
    <>
      <input
        {...register(field)}
        autoComplete="off"
        className={clsx(
          errors[field]
            ? ' text-red-900 ring-red-300 placeholder:text-red-300  focus:ring-red-500'
            : 'text-gray-900 ring-gray-300 placeholder:text-gray-400 focus:ring-sky-700',
          'block w-full rounded-md border-0 py-1.5 px-2.5  shadow-sm ring-1 ring-inset  focus:ring-2 focus:ring-inset  sm:text-sm sm:leading-6',
        )}
      />

      <p className="mt-2 text-sm text-red-600" id="email-error">
        {errors[field]?.message}
      </p>
    </>
  );
}

export function Textarea({
  field,
  register,
  formState: { errors },
  config,
}: FormFieldProps & { config: FormFieldText }) {
  return (
    <>
      <textarea
        rows={4}
        {...register(field)}
        className={clsx(
          errors[field]
            ? ' text-red-900 ring-red-300 placeholder:text-red-300  focus:ring-red-500'
            : 'text-gray-900 ring-gray-300 placeholder:text-gray-400 focus:ring-sky-700',
          'block w-full rounded-md border-0 py-1.5 px-2.5  shadow-sm ring-1 ring-inset  focus:ring-2 focus:ring-inset  sm:text-sm sm:leading-6',
        )}
      />

      <p className="mt-2 text-sm text-red-600" id="email-error">
        {errors[field]?.message}
      </p>
    </>
  );
}

export function DateField({
  field,
  register,
  getValues,
  setValue,
  formState: { errors },
  config,
}: FormFieldProps & {
  config: FormFieldDate;
  getValues: (key: string) => any;
  setValue: (key: string, val: any, opts: any) => void;
}) {
  const [currentDate, setCurrentDate] = useState(getValues(field));
  return (
    <>
      <Calendar
        value={currentDate}
        onChange={(val) => {
          setCurrentDate(val);
          setValue(field, val, { shouldDirty: true, shouldTouch: true });
        }}
      />
      {/* <input
        {...register(field)}
        autoComplete="off"
        className={clsx(
          errors[field]
            ? ' text-red-900 ring-red-300 placeholder:text-red-300  focus:ring-red-500'
            : 'text-gray-900 ring-gray-300 placeholder:text-gray-400 focus:ring-sky-700',
          'block w-full rounded-md border-0 py-1.5 px-2.5  shadow-sm ring-1 ring-inset  focus:ring-2 focus:ring-inset  sm:text-sm sm:leading-6',
        )}
      /> */}
      <p className="mt-2 text-sm text-red-600" id="email-error">
        {errors[field]?.message}
      </p>
    </>
  );
}

export function Year({
  field,
  register,
  formState: { errors },
  config,
}: FormFieldProps & { config: FormFieldYear }) {
  const nextYear = new Date().getFullYear() + 1;
  const years = Array.from({ length: 10 }, (_, i) => nextYear - i);
  return (
    <>
      <select
        {...register(field)}
        className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
      >
        <option key={0} value="-">
          -
        </option>
        {years.map((year) => (
          <option key={year.toString()} value={year}>
            {year}
          </option>
        ))}
      </select>
      <span className="sr-only">{config.label}</span>

      <p className="mt-2 text-sm text-red-600" id="email-error">
        {errors[field]?.message}
      </p>
    </>
  );
}

export function Checkbox({
  field,
  register,
  formState: { errors },
  config,
}: FormFieldProps & { config: FormFieldCheckbox }) {
  const items = Object.keys(config.items).map((key, idx) => {
    return { type: key, ...config.items[key] };
  });
  return (
    <>
      {items.map((model, idx) => (
        <label
          htmlFor={`checkbox-${model.type}`}
          key={model.type}
          className="relative flex items-start my-2"
        >
          <div className="flex h-6 items-center">
            <input
              {...register(field)}
              value={model.type}
              id={`checkbox-${model.type}`}
              aria-describedby={`${model.type}-description`}
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-sky-700 focus:ring-sky-700"
            />
          </div>
          <div className="ml-3 text-sm leading-6">
            <span className="font-medium text-gray-900">{model.name}</span>
            <p id={`${model.type}-description`} className="text-gray-500">
              {model.description}
            </p>
          </div>
        </label>
      ))}

      <p className="mt-2 text-sm text-red-600" id="email-error">
        {errors[field]?.message}
      </p>
    </>
  );
}

export function BooleanField({
  field,
  getValues,
  setValue,
  formState: { errors },
  config,
}: FormFieldProps & {
  config: FormFieldBoolean;
  getValues: (field: string) => any;
  setValue: (key: string, val: any, opts?: any) => void;
}) {
  const [enabled, setEnabled] = useState(getValues(field));
  return (
    <>
      <Switch
        checked={enabled}
        name={field}
        onChange={(val) => {
          setValue(field, val, { shouldDirty: true, shouldTouch: true });
          setEnabled(val);
        }}
        className={clsx(
          enabled ? 'bg-sky-700' : 'bg-gray-200',
          'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-700 focus:ring-offset-2',
        )}
      >
        <span className="sr-only">{config.label}</span>
        <span
          aria-hidden="true"
          className={clsx(
            enabled ? 'translate-x-5' : 'translate-x-0',
            'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
          )}
        />
      </Switch>

      <p className="mt-2 text-sm text-red-600" id="email-error">
        {errors[field]?.message}
      </p>
    </>
  );
}

type FileState =
  | { state: 'idle' }
  | { state: 'uploading'; pct: number }
  | {
      state: 'uploaded';
      pct: number;
    }
  | {
      state: 'processing';
      documentId: string;
      name: string;
      key: string;
    }
  | {
      state: 'readyToSave';
      documentId: string;
      name: string;
      key: string;
      classifiedType: string;
    }
  | {
      state: 'classifyTypeMismatch';
      documentId: string;
      name: string;
      key: string;
      classifiedType: string;
    }
  | {
      state: 'error';
      message: string;
    };

export function FileUpload({
  field,
  register,
  setValue,
  getValues,
  formState: { isSubmitSuccessful },
  config,
  request,
  document,
  resetField,
}: FormFieldProps & {
  config: FormFieldFile;
  request: ClientSafeRequest;
  setValue: (key: string, val: any, opts: any) => void;
  getValues: (key?: string) => any;
  document: { id: DocumentId; doc: JSX.Element; data: JSX.Element } | null;
  resetField: (field: string) => void;
}) {
  const [fileState, setFileState] = useState<FileState>({ state: 'idle' });

  useEffect(() => {
    if (isSubmitSuccessful && fileState.state === 'readyToSave') {
      setFileState({ state: 'idle' });
    }
  }, [isSubmitSuccessful, fileState]);

  async function uploadDocument(e: React.ChangeEvent<HTMLInputElement>) {
    setFileState({ state: 'uploading', pct: 0 });

    const file = e.target.files?.[0]!;
    const filename = encodeURIComponent(file.name);
    //const fileType = encodeURIComponent(file.type);

    const signedUrl = await getPresignedUploadUrl({
      requestId: request.id,
      filename,
      contentType: file.type,
    });

    // For visual effect, ensure uplading takes at least 3s. This also
    // reduces the perception of the processing time, which can currently go > 20s
    const { promise, resolve } = pWithResolvers();
    delay(3000).then(resolve);

    const resp = await fetchWithProgress(signedUrl.url, file, async (ev) => {
      if (ev.lengthComputable) {
        if (ev.loaded === ev.total) {
          await promise;
          setFileState({ state: 'uploaded', pct: 100 });
        } else {
          setFileState({
            state: 'uploading',
            pct: Math.round((ev.loaded / ev.total) * 100),
          });
        }
      }
    });

    if (resp.ok) {
      const toSave: S3File = {
        documentId: signedUrl.documentId,
        key: signedUrl.key,
        bucket: signedUrl.bucket,
        name: file.name,
        size: file.size,
        lastModified: file.lastModified,
        type: file.type,
      };

      const { id, name, key } = await createDocument(toSave, request.id);

      // Same as above, reduce perception of processing time
      await promise;
      await delay(2000);

      setFileState({
        state: 'processing',
        documentId: id,
        name,
        key,
      });

      const { isProcessed, classifiedType } = await getClassificationStatus(id);

      if (classifiedType === 'UNKNOWN') {
        setFileState({
          state: 'error',
          message: 'Could not determine the type of document',
        });
        return;
      } else if (classifiedType !== config.aiClassificationType) {
        setFileState({
          state: 'classifyTypeMismatch',
          documentId: id,
          name,
          key,
          classifiedType,
        });
        console.log(
          `Mismatch on classified type, expected ${config.aiClassificationType} got ${classifiedType}`,
        );
        return;
      } else {
        setFileState({
          state: 'readyToSave',
          documentId: id,
          name,
          key,
          classifiedType,
        });
      }

      setValue(field, id, { shouldDirty: true, shouldTouch: true });
    } else {
      setFileState({ state: 'error', message: 'Error uploading file' });
      Sentry.captureException('Error uploading file');
    }
  }
  const currentDocumentId = getValues(field);
  return (
    <>
      <div className="flex">
        <label
          htmlFor={`${field}-file`}
          className={clsx(
            fileState.state === 'uploading' ||
              fileState.state === 'uploaded' ||
              fileState.state === 'processing' ||
              fileState.state === 'readyToSave'
              ? 'cursor-not-allowed hover:bg-white'
              : 'hover:bg-gray-50 cursor-pointer',
            ' inline-flex items-center rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300',
          )}
        >
          {fileState.state === 'uploading' ||
          fileState.state === 'uploaded' ||
          fileState.state === 'processing' ? (
            <>
              <svg
                className="mr-3 h-5 w-5 animate-spin text-green-700"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              {ucFirst(fileState.state)}
              {fileState.state === 'uploading' || fileState.state === 'uploaded'
                ? ` ${fileState.pct}%`
                : ''}
            </>
          ) : fileState.state === 'readyToSave' ? (
            <>
              <CheckCircleIcon
                className="-ml-0.5 mr-1 h-5 w-5 text-green-700"
                aria-hidden="true"
              />
              Ready to save
            </>
          ) : (
            <>{currentDocumentId ? 'Replace document' : 'Add document'}</>
          )}
          <input
            id={`${field}-file`}
            name={`${field}-file`}
            type="file"
            className="sr-only"
            multiple={false}
            onChange={uploadDocument}
            disabled={
              fileState.state === 'uploading' ||
              fileState.state === 'processing' ||
              fileState.state === 'readyToSave'
            }

            // accept="image/png, image/jpeg"
          />
        </label>
        {fileState.state === 'readyToSave' ||
        fileState.state === 'classifyTypeMismatch' ||
        // A bug exists here that if a user cancels while in "processing"
        // the system can still mark it as "readyToSave". TODO: Fix this
        fileState.state === 'processing' ? (
          <a
            href="#"
            onClick={() => {
              setFileState({ state: 'idle' });
              resetField(field);
            }}
            className="ml-4 p-2 text-xs text-slate-500 hover:text-slate-700"
          >
            Cancel
          </a>
        ) : null}
      </div>
      {/* {state.state === 'uploading' && <div className="mt-2">{state.pct}%</div>} */}
      <input {...register(field, { required: true })} type="hidden" />
      {fileState.state === 'processing' ||
      fileState.state === 'readyToSave' ||
      fileState.state === 'classifyTypeMismatch' ? (
        <div className="flex items-center">
          <Document docKey={fileState.key} name={fileState.name} />
          {document && document.doc ? (
            <div
              className={clsx(
                fileState.state === 'classifyTypeMismatch' ? 'opacity-20' : '',
                'flex items-center',
              )}
            >
              <div className="flex text-xs mx-4 text-slate-500">
                <div>to replace</div>
                <ArrowLongRightIcon className="h-4 ml-1" />
              </div>
              {document.doc}
            </div>
          ) : null}
        </div>
      ) : document ? (
        <div
          className={clsx(
            fileState.state === 'uploading' || fileState.state === 'uploaded'
              ? 'opacity-20'
              : '',
            'flex items-center',
          )}
        >
          {document.doc}
        </div>
      ) : null}

      {/* <p className="text-xs leading-5 text-gray-600">
          {config.extensions.join(', ')} up to {config.maxFilesizeMB}MB
        </p> */}
      {fileState.state === 'classifyTypeMismatch' && (
        <div className="mt-2 text-sm text-red-900">
          It looks like you&lsquo;re trying to upload a different type of file (
          {fileState.classifiedType}). Please try again.
        </div>
      )}
      {fileState.state === 'error' && (
        <p className="mt-2 text-sm text-red-600" id={`${field}-error`}>
          {fileState.message}
        </p>
      )}

      {/* {value && (
          <div className="mt-2">
            <p className="text-xs leading-5 text-gray-600">
              File has been uploaded but not saved
            </p>
          </div>
        )} */}
      <div className={fileState.state !== 'idle' ? 'opacity-20' : ''}>
        {document ? document.data : null}
      </div>
    </>
  );
}

type StatusRes = {
  isProcessed: boolean;
  classifiedType: string;
};
async function getClassificationStatus(documentId: DocumentId) {
  for (let i = 0; i < 30; i++) {
    await delay(1000);

    const res = await fetch(`/document/${documentId}/status`, {
      cache: 'no-store',
    });
    const data = (await res.json()) as StatusRes;
    if (data.classifiedType !== 'UNCLASSIFIED') {
      return data;
    }
  }
  return {
    isProcessed: false,
    classifiedType: 'UNKNOWN',
  };
}

// function Documents({
//   documents,
//   currentDocumentId,
//   auditId,
//   field,
// }: {
//   documents: BasicFormProps['documents'];
//   currentDocumentId: DocumentId;
//   auditId: AuditId;
//   field: string;
// }) {
//   if (!documents.length) {
//     return null;
//   }
//   return (
//     <div className="-mx-4 ring-1 ring-gray-300 sm:mx-0 sm:rounded-lg mb-4">
//       <table className="min-w-full divide-y divide-gray-300">
//         <thead>
//           <tr>
//             <th scope="col" className="py-3.5 pl-3"></th>
//             <th
//               scope="col"
//               className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-4"
//             >
//               File
//             </th>
//             <th
//               scope="col"
//               className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 lg:table-cell"
//             >
//               Uploaded
//             </th>
//             <th
//               scope="col"
//               className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 lg:table-cell"
//             ></th>
//           </tr>
//         </thead>
//         <tbody>
//           {documents.map((document, documentIdx) => (
//             <tr key={document.id}>
//               <td
//                 className={clsx(
//                   documentIdx === 0 ? '' : 'border-t border-transparent',
//                   'relative py-4 pl-4',
//                 )}
//               >
//                 <FiletypeIcon filename={document.key} />

//                 {documentIdx !== 0 ? (
//                   <div className="absolute -top-px left-6 right-0 h-px bg-gray-200" />
//                 ) : null}
//               </td>
//               <td
//                 className={clsx(
//                   documentIdx === 0 ? '' : 'border-t border-gray-200',
//                   'px-3 py-3.5 text-sm text-gray-500 lg:table-cell',
//                 )}
//               >
//                 <div className="font-medium text-gray-900">
//                   {currentDocumentId === document.id && (
//                     <div>
//                       <div className="inline-flex items-center rounded-full bg-green-50 -ml-2 mb-1 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
//                         Selected
//                       </div>
//                     </div>
//                   )}
//                   <Link href={`/document/${document.id}`}>{document.name}</Link>
//                   {document.queries && <Queries queries={document.queries} />}
//                 </div>
//               </td>
//               <td
//                 className={clsx(
//                   documentIdx === 0 ? '' : 'border-t border-gray-200',
//                   'px-3 py-3.5 text-sm text-gray-500 lg:table-cell',
//                 )}
//               >
//                 <Datetime
//                   className="py-0.5 text-xs text-gray-500"
//                   dateTime={document.createdAt}
//                 />
//               </td>

//               <td
//                 className={clsx(
//                   documentIdx === 0 ? '' : 'border-t border-transparent',
//                   'relative py-3.5 pr-4 sm:pr-6',
//                 )}
//               >
//                 <Settings
//                   documentId={document.id}
//                   auditId={auditId}
//                   field={field}
//                 />
//                 {documentIdx !== 0 ? (
//                   <div className="absolute -top-px left-0 right-6 h-px bg-gray-200" />
//                 ) : null}
//               </td>
//             </tr>
//           ))}
//         </tbody>
//       </table>
//     </div>
//   );
// }

// function Settings({
//   documentId,
//   auditId,
//   field,
// }: {
//   documentId: DocumentId;
//   auditId: AuditId;
//   field: string;
// }) {
//   return (
//     <div className="flex flex-none items-center gap-x-4 ">
//       <Menu as="div" className="relative flex-none">
//         <Menu.Button className="-m-2.5 block p-2.5 text-gray-500 hover:text-gray-900">
//           <span className="sr-only">Open options</span>
//           <EllipsisVerticalIcon className="h-5 w-5" aria-hidden="true" />
//         </Menu.Button>
//         <Transition
//           as={Fragment}
//           enter="transition ease-out duration-100"
//           enterFrom="transform opacity-0 scale-95"
//           enterTo="transform opacity-100 scale-100"
//           leave="transition ease-in duration-75"
//           leaveFrom="transform opacity-100 scale-100"
//           leaveTo="transform opacity-0 scale-95"
//         >
//           <Menu.Items className="absolute right-0 z-10 mt-2 w-40 origin-top-right rounded-md bg-white py-2 shadow-lg ring-1 ring-gray-900/5 focus:outline-none">
//             <Menu.Item>
//               {({ active }) => (
//                 <a
//                   href="#"
//                   onClick={async (e) => {
//                     processChartOfAccounts(documentId, auditId);
//                   }}
//                   className={clsx(
//                     active ? 'bg-gray-50' : '',
//                     'block px-3 py-1 text-sm leading-6 text-gray-900',
//                   )}
//                 >
//                   CoA Process
//                 </a>
//               )}
//             </Menu.Item>
//             <Menu.Item>
//               {({ active }) => (
//                 <a
//                   href="#"
//                   onClick={async (e) => {
//                     processDocument(documentId);
//                   }}
//                   className={clsx(
//                     active ? 'bg-gray-50' : '',
//                     'block px-3 py-1 text-sm leading-6 text-gray-900',
//                   )}
//                 >
//                   Re-process
//                 </a>
//               )}
//             </Menu.Item>
//             <Menu.Item>
//               {({ active }) => (
//                 <a
//                   href="#"
//                   onClick={async (e) => {
//                     await selectDocumentForRequest(documentId, field);
//                   }}
//                   className={clsx(
//                     active ? 'bg-gray-50' : '',
//                     'block px-3 py-1 text-sm leading-6 text-gray-900',
//                   )}
//                 >
//                   Select
//                 </a>
//               )}
//             </Menu.Item>
//             <Menu.Item>
//               {({ active }) => (
//                 <a
//                   href="#"
//                   className={clsx(
//                     active ? 'bg-gray-50' : '',
//                     'block px-3 py-1 text-sm leading-6 text-gray-900',
//                   )}
//                 >
//                   Download
//                 </a>
//               )}
//             </Menu.Item>
//             <Menu.Item>
//               {({ active }) => (
//                 <a
//                   href="#"
//                   onClick={async (e) => {
//                     await deleteDocument(documentId);
//                   }}
//                   className={clsx(
//                     active ? 'bg-gray-50' : '',
//                     'block px-3 py-1 text-sm leading-6 text-gray-900',
//                   )}
//                 >
//                   Delete
//                 </a>
//               )}
//             </Menu.Item>
//           </Menu.Items>
//         </Transition>
//       </Menu>
//     </div>
//   );
// }

// function Queries({ queries }: { queries: DocumentQuery[] }) {
//   return (
//     <div className="w-80 h-20 overflow-auto mt-1 flex-col text-slate-400 text-xs hidden sm:block">
//       {queries.map((query) => (
//         <div key={query.id}>
//           <span className="">{humanCase(query.identifier)}</span>:{' '}
//           {query.result}
//         </div>
//       ))}
//     </div>
//   );
// }

// function humanCase(input: string): string {
//   const words = input.toLowerCase().split('_');
//   return words
//     .map((word, index) =>
//       index === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word,
//     )
//     .join(' ');
// }
