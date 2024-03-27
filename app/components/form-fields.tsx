'use client';

import { Switch } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/16/solid';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import * as Sentry from '@sentry/nextjs';
import clsx from 'clsx';
import { useEffect, useReducer, useState } from 'react';

// import Calendar from '@/components/calendar';
import { Spinner } from '@/components/spinner';
import {
  createDocument,
  getPresignedUploadUrl,
  unlinkDocument,
} from '@/lib/actions';
import { fetchWithProgress } from '@/lib/fetch-with-progress';
import { FormFieldCheckbox, FormFieldFile } from '@/lib/request-types';
import { delay, pWithResolvers, ucFirst } from '@/lib/util';
import { DeleteModal2 } from './delete-modal';

import type { DocumentId, S3File } from '@/types';
import type {
  UseFormGetValues,
  UseFormRegister,
  UseFormSetValue,
} from 'react-hook-form';

type FormFieldProps = {
  field: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: UseFormRegister<any>;
  errors: { message?: string } | undefined;
};

export function Text({ field, register, errors }: FormFieldProps) {
  return (
    <>
      <input
        {...register(field)}
        autoComplete="off"
        className={clsx(
          errors
            ? ' text-red-900 ring-red-300 placeholder:text-red-300  focus:ring-red-500'
            : 'text-gray-900 ring-gray-300 placeholder:text-gray-400 focus:ring-sky-700',
          'block w-full rounded-md border-0 px-2.5 py-1.5 shadow-sm ring-1 ring-inset focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6',
        )}
      />

      <p className="mt-2 text-sm text-red-600" id="email-error">
        {errors?.message}
      </p>
    </>
  );
}

export function Textarea({ field, register, errors }: FormFieldProps) {
  return (
    <>
      <textarea
        rows={4}
        {...register(field)}
        className={clsx(
          errors
            ? ' text-red-900 ring-red-300 placeholder:text-red-300  focus:ring-red-500'
            : 'text-gray-900 ring-gray-300 placeholder:text-gray-400 focus:ring-sky-700',
          'block w-full rounded-md border-0 px-2.5 py-1.5 shadow-sm ring-1 ring-inset focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6',
        )}
      />

      <p className="mt-2 text-sm text-red-600" id="email-error">
        {errors?.message}
      </p>
    </>
  );
}

// export function DateField({
//   field,
//   register,
//   getValues,
//   setValue,
//   formState: { errors },
// }: FormFieldProps & {
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   getValues: UseFormGetValues<any>;
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   setValue: UseFormSetValue<any>;
// }) {
//   const [currentDate, setCurrentDate] = useState(getValues(field));
//   return (
//     <>
//       <Calendar
//         value={currentDate}
//         onChange={(val) => {
//           setCurrentDate(val);
//           setValue(field, val, { shouldDirty: true, shouldTouch: true });
//         }}
//       />
//       {/* <input
//         {...register(field)}
//         autoComplete="off"
//         className={clsx(
//           errors
//             ? ' text-red-900 ring-red-300 placeholder:text-red-300  focus:ring-red-500'
//             : 'text-gray-900 ring-gray-300 placeholder:text-gray-400 focus:ring-sky-700',
//           'block w-full rounded-md border-0 py-1.5 px-2.5  shadow-sm ring-1 ring-inset  focus:ring-2 focus:ring-inset  sm:text-sm sm:leading-6',
//         )}
//       /> */}
//       <p className="mt-2 text-sm text-red-600" id="email-error">
//         {errors?.message}
//       </p>
//     </>
//   );
// }

export function Year({
  field,
  register,
  errors,
  label,
}: FormFieldProps & { label: string }) {
  const nextYear = new Date().getFullYear() + 1;
  const years = Array.from({ length: 10 }, (_, i) => nextYear - i);
  return (
    <>
      <select
        {...register(field)}
        className="block rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500"
      >
        <option key={0} value="">
          -
        </option>
        {years.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
      <span className="sr-only">{label}</span>

      <p className="mt-2 text-sm text-red-600" id="email-error">
        {errors?.message}
      </p>
    </>
  );
}

export function Month({
  field,
  register,
  errors,
  config,
}: FormFieldProps & { config: { label: string } }) {
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  return (
    <>
      <select
        {...register(field)}
        className="block rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500"
      >
        <option key={0} value="">
          -
        </option>
        {months.map((month, idx) => (
          <option key={idx} value={idx + 1}>
            {month}
          </option>
        ))}
      </select>
      <span className="sr-only">{config.label}</span>

      <p className="mt-2 text-sm text-red-600" id="email-error">
        {errors?.message}
      </p>
    </>
  );
}
export function Checkbox({
  field,
  register,
  errors,
  config,
}: FormFieldProps & { config: FormFieldCheckbox }) {
  const items = Object.keys(config.items).map((key) => ({
    ...config.items[key],
    type: key,
  }));

  return (
    <>
      {items.map((model) => (
        <label
          htmlFor={`checkbox-${model.type}`}
          key={model.type}
          className="relative my-2 flex items-start"
        >
          <div className="flex h-6 items-center">
            <input
              {...register(field)}
              value={model.type}
              id={`checkbox-${model.type}`}
              aria-describedby={`${model.type}-description`}
              type="checkbox"
              className="size-4 rounded border-gray-300 text-sky-700 focus:ring-sky-700"
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
        {errors?.message}
      </p>
    </>
  );
}

export function BooleanField({
  field,
  enabled,
  setEnabled,
  errors,
  label,
}: FormFieldProps & {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  label: string;
}) {
  return (
    <>
      <Switch
        checked={enabled}
        name={field}
        onChange={setEnabled}
        className={clsx(
          enabled ? 'bg-sky-700' : 'bg-gray-200',
          'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-700 focus:ring-offset-2',
        )}
      >
        <span className="sr-only">{label}</span>
        <span
          aria-hidden="true"
          className={clsx(
            enabled ? 'translate-x-5' : 'translate-x-0',
            'pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
          )}
        />
      </Switch>

      <p className="mt-2 text-sm text-red-600" id="email-error">
        {errors?.message}
      </p>
    </>
  );
}

type FileState = {
  state: 'idle' | 'working';
  files: {
    id: number;
    state:
      | 'uploading'
      | 'uploaded'
      | 'processing'
      | 'readyToSave'
      | 'classifyTypeMismatch'
      | 'error';
    pct: number;
    documentId: string;
    name: string;
    key: string;
    classifiedType: string;
    message: string;
  }[];
};

type FileAction =
  | {
      type: 'init';
      id: number;
      name: string;
    }
  | {
      type: 'set-signed';
      id: number;
      key: string;
    }
  | {
      type: 'uploading';
      id: number;
      pct: number;
    }
  | {
      type: 'uploaded';
      id: number;
    }
  | {
      type: 'processing';
      id: number;
      documentId: string;
    }
  | {
      type: 'readyToSave';
      id: number;
    }
  | {
      type: 'classifyTypeMismatch';
      id: number;
      classifiedType: string;
    }
  | {
      type: 'error';
      id: number;
      message: string;
    }
  | {
      type: 'cancel';
      id: number;
    }
  | { type: 'clear' };

function fileReducer(state: FileState, action: FileAction): FileState {
  let newState: FileState;
  if (action.type === 'init') {
    newState = {
      state: 'working',
      files: [
        ...state.files,
        {
          state: 'uploading',
          id: action.id,
          pct: 0,
          documentId: '',
          name: action.name,
          key: '',
          classifiedType: '',
          message: '',
        },
      ],
    };
  } else if (action.type === 'set-signed') {
    newState = {
      state: 'working',
      files: state.files.map((file) =>
        action.id === file.id
          ? {
              ...file,
              state: 'uploading',
              key: action.key,
            }
          : file,
      ),
    };
  } else if (action.type === 'uploading' || action.type === 'uploaded') {
    newState = {
      state: 'working',
      files: state.files.map((file) =>
        action.id === file.id
          ? {
              ...file,
              state: action.type,
              pct: action.type === 'uploading' ? action.pct : 100,
            }
          : file,
      ),
    };
  } else if (action.type === 'processing') {
    newState = {
      state: 'working',
      files: state.files.map((file) =>
        action.id === file.id
          ? {
              ...file,
              state: action.type,
              documentId: action.documentId,
            }
          : file,
      ),
    };
  } else if (action.type === 'readyToSave') {
    newState = {
      state: 'working',
      files: state.files.map((file) =>
        action.id === file.id
          ? {
              ...file,
              state: action.type,
            }
          : file,
      ),
    };
  } else if (action.type === 'cancel') {
    newState = {
      state: 'working',
      files: state.files.filter((file) => action.id !== file.id),
    };
  } else if (action.type === 'classifyTypeMismatch') {
    newState = {
      state: 'working',
      files: state.files.map((file) =>
        action.id === file.id
          ? {
              ...file,
              state: action.type,
              classifiedType: action.classifiedType,
            }
          : file,
      ),
    };
  } else if (action.type === 'error') {
    newState = {
      state: 'working',
      files: state.files.map((file) =>
        action.id === file.id
          ? {
              ...file,
              state: action.type,
              message: action.message,
            }
          : file,
      ),
    };
  } else if (action.type === 'clear') {
    newState = {
      state: 'idle',
      files: [],
    };
  } else {
    throw new Error(`Invalid action: ${JSON.stringify(action)}`);
  }
  newState.state = newState.files.every((file) =>
    ['readyToSave', 'error', 'classifyTypeMismatch'].includes(file.state),
  )
    ? 'idle'
    : 'working';
  return newState;
}

async function uploadDocument({
  file,
  // fileIdx,
  dispatch,
  config,
  getValues,
  setValue,
}: {
  file: File;
  // fileIdx: number;
  dispatch: (action: FileAction) => void;
  config: FormFieldFile;
  getValues: () => string[];
  setValue: (documentIds: string[]) => void;
}) {
  const id = Date.now() + Math.random() * 1000;
  const filename = encodeURIComponent(file.name);
  //const fileType = encodeURIComponent(file.type);
  dispatch({ type: 'init', id, name: file.name });

  const signedUrl = await getPresignedUploadUrl({
    filename,
    contentType: file.type,
  });
  dispatch({ type: 'set-signed', id, key: file.name });

  // For visual effect, ensure uplading takes at least 2s. This also
  // reduces the perception of the processing time, which can currently go > 20s
  const { promise, resolve } = pWithResolvers();
  delay(2000).then(resolve);

  dispatch({ type: 'uploading', id, pct: 1 });

  // setFileState({ state: 'uploading', pct: 0 });
  // setNumFilesUplading((val: number) => val + 1);
  const resp = await fetchWithProgress(signedUrl.url, file, async (ev) => {
    if (ev.lengthComputable) {
      if (ev.loaded === ev.total) {
        dispatch({ type: 'uploaded', id });
      } else {
        dispatch({
          type: 'uploading',
          id,
          pct: Math.round((ev.loaded / ev.total) * 100),
        });
      }
    }
  });

  if (!resp.ok) {
    dispatch({ type: 'error', id, message: 'Error uploading file' });
    Sentry.captureException('Error uploading file');
  }

  const toSave: S3File = {
    documentId: signedUrl.documentId,
    key: signedUrl.key,
    bucket: signedUrl.bucket,
    name: file.name,
    size: file.size,
    lastModified: file.lastModified,
    type: file.type,
  };

  const { id: documentId, name, key } = await createDocument(toSave);

  await promise;

  dispatch({
    type: 'processing',
    id,
    documentId,
  });

  const { classifiedType } = await getClassificationStatus(documentId);

  // setNumFilesUplading((val: number) => val - 1);

  if (classifiedType === 'UNKNOWN') {
    dispatch({
      type: 'error',
      id,
      message: 'Could not determine the type of document',
    });
    return;
  } else if (classifiedType !== config.aiClassificationType) {
    dispatch({
      type: 'classifyTypeMismatch',
      id,
      classifiedType,
    });
    console.log(
      `Mismatch on classified type, expected ${config.aiClassificationType} got ${classifiedType}`,
    );
    return;
  } else {
    dispatch({
      type: 'readyToSave',
      id,
    });
  }

  const documentIds = getValues();
  let newDocumentIds;
  if (config.allowMultiple) {
    newDocumentIds = [...documentIds, documentId];
  } else {
    newDocumentIds = [documentId];
  }
  setValue(newDocumentIds);
}

type FileUplaodAddlProps = {
  auditId: string;
  requestType: string;
  config: FormFieldFile;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setValue: UseFormSetValue<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getValues: UseFormGetValues<any>;
  isSubmitSuccessful: boolean;
  documents: { id: DocumentId; doc: JSX.Element; data: JSX.Element }[];
  resetField: (field: string) => void;
  setNumFilesUplading: (val: number) => void;
};

export function FileUpload({
  auditId,
  requestType,
  field,
  register,
  setValue,
  getValues,
  isSubmitSuccessful,
  config,
  documents,
  resetField,
  setNumFilesUplading,
}: FormFieldProps & FileUplaodAddlProps) {
  const [fileState, dispatch] = useReducer(fileReducer, {
    state: 'idle',
    files: [],
  });
  const [documentIdToDelete, setDocumentIdToDelete] = useState('');

  useEffect(() => {
    setNumFilesUplading(fileState.state === 'working' ? 1 : 0);
  }, [fileState.state, setNumFilesUplading]);

  useEffect(() => {
    if (isSubmitSuccessful) {
      dispatch({ type: 'clear' });
    }
  }, [isSubmitSuccessful]);

  function uploadDocuments(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) {
      return;
    }
    if (!config.allowMultiple && files.length > 1) {
      // dispatch({
      //   type: 'error',
      //   fileIdx: 0,
      //   message: 'Only one file can be uploaded',
      // });
      return;
    }

    for (let i = 0; i < files.length; i++) {
      uploadDocument({
        file: files[i],
        dispatch,
        config,
        getValues: () => getValues(field) || [],
        setValue: (documentIds: string[]) => {
          setValue(field, documentIds, {
            shouldDirty: true,
            shouldTouch: true,
          });
        },
      });
    }
  }

  const currentDocumentIds = getValues(field) || [];

  const showNewFileButton =
    config.allowMultiple ||
    (currentDocumentIds.length === 0 && fileState.files.length === 0);
  return (
    <>
      {documents.length > 0 && (
        <div className="mb-8">
          {documents.map((d, idx) => (
            <div
              key={idx}
              className={clsx(idx !== documents.length - 1 ? 'mb-10' : '')}
            >
              <div className="-ml-2 flex">
                {d.doc}
                <button
                  type="button"
                  onClick={() => setDocumentIdToDelete(d.id)}
                  className="-mt-0.5 ml-2 p-1 text-xs text-slate-400 hover:text-red-700"
                  title="Unlink document from audit"
                >
                  <XMarkIcon className="size-4" />
                </button>
              </div>
              {d.data}
            </div>
          ))}
        </div>
      )}

      {fileState.files.map((file) => (
        <div key={file.id} className="mb-2 flex ">
          <button
            type="button"
            onClick={() => {
              const documentId = file.documentId;
              dispatch({ type: 'cancel', id: file.id });
              const documentIds = getValues(field) || [];
              setValue(
                field,
                documentIds.filter((id: string) => id !== documentId),
              );
            }}
            className="-ml-2 -mt-0.5 mr-1 p-1 text-xs text-slate-400 hover:text-red-700"
            title="Cancel upload"
          >
            <XMarkIcon className="size-4" />
          </button>
          <div className="flext-col">
            <div className="flex items-center bg-white text-sm text-gray-900">
              {file.state === 'uploading' ||
              file.state === 'uploaded' ||
              file.state === 'processing' ? (
                <>
                  <Spinner />
                  {file.name} -{' '}
                  <b className="ml-1">
                    {ucFirst(file.state)}
                    {file.state === 'uploading' || file.state === 'uploaded'
                      ? ` ${file.pct}%`
                      : ''}
                  </b>
                </>
              ) : file.state === 'readyToSave' ? (
                <>
                  <CheckCircleIcon
                    className="-ml-0.5 mr-2 size-5 text-green-700"
                    aria-hidden="true"
                  />
                  {file.name} {/*- Ready to save*/}
                </>
              ) : (
                <>
                  <ExclamationTriangleIcon
                    className="-ml-0.5 mr-2 size-5 text-red-700"
                    aria-hidden="true"
                  />
                  {file.name}
                  {file.state !== 'classifyTypeMismatch' && (
                    <>
                      {' '}
                      - <b className="ml-1">{file.state}</b>
                    </>
                  )}
                </>
              )}
            </div>
            {file.state === 'classifyTypeMismatch' ? (
              <div className="my-1 ml-7 text-xs text-red-900">
                This file was classified as a {file.classifiedType}. Please try
                a different file.
              </div>
            ) : null}
          </div>
        </div>
      ))}
      {showNewFileButton ? (
        <div className="flex">
          <label
            htmlFor={`${field}-file`}
            className="mb-2 inline-flex cursor-pointer items-center rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            <input
              id={`${field}-file`}
              name={`${field}-file`}
              type="file"
              className="sr-only"
              multiple={config.allowMultiple}
              onChange={uploadDocuments}
              // accept="image/png, image/jpeg"
            />
            Add document
          </label>

          <input {...register(field, { required: true })} type="hidden" />
        </div>
      ) : null}
      <DeleteModal2
        label="Remove document from audit"
        description="Are you sure you want to remove this document? It will still be available in the Documents section"
        show={documentIdToDelete !== ''}
        setShow={() => setDocumentIdToDelete('')}
        action={async () => {
          const documentIds = getValues(field) || [];
          setValue(
            field,
            documentIds.filter((id: string) => id !== documentIdToDelete),
          );
          await unlinkDocument({
            documentId: documentIdToDelete,
            auditId,
            requestType,
            requestId: field,
          });
        }}
      />
    </>
  );
}

type StatusRes = {
  isProcessed: boolean;
  classifiedType: string;
};
async function getClassificationStatus(documentId: DocumentId) {
  // The extract lambda can take up to 60 seconds to run for especially large excel docs
  for (let i = 0; i < 60; i++) {
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
