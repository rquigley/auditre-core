'use client';
import { useState, Fragment } from 'react';
import { useForm } from 'react-hook-form';
import { Menu, Transition } from '@headlessui/react';
import { EllipsisVerticalIcon } from '@heroicons/react/20/solid';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { classNames } from '@/lib/util';
import {
  requestTypes,
  DateInputConfig,
  BooleanInputConfig,
  TextInputConfig,
  FileUploadInputConfig,
  InputConfig,
  YearInputConfig,
  CheckboxInputConfig,
  TextareaInputConfig,
} from '@/lib/request-types';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import type {
  RequestData,
  ClientSafeRequest,
  S3File,
  Document,
  DocumentQuery,
} from '@/types';
import Calendar from '@/components/calendar';
import Datetime from '@/components/datetime';
import { Switch } from '@headlessui/react';
import SaveNotice from '@/components/save-notice';
import { fetchWithProgress } from '@/lib/fetch-with-progress';
import FiletypeIcon from '@/components/FiletypeIcon';
import Link from 'next/link';
//import type { UseFormRegister, FieldErrors } from 'react-hook-form';

type Props = {
  request: ClientSafeRequest;
  data: RequestData;
  saveData: (data: RequestData) => void;
  createDocument: (file: S3File) => Promise<string>;
  getPresignedUploadUrl: (opts: {
    filename: string;
    contentType: string;
  }) => Promise<{
    documentId: string;
    url: string;
    key: string;
    bucket: string;
  }>;
  documents: Array<Document & { queries: DocumentQuery[] }>;
};

export default function BasicForm({
  request,
  data,
  saveData,
  createDocument,
  getPresignedUploadUrl,
  documents,
}: Props) {
  const router = useRouter();
  const config = requestTypes[request.type];

  const [uploading, setUploading] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);

  const {
    formState: { isDirty, dirtyFields },
    register,
    setValue,
    getValues,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.infer<typeof config.schema>>({
    resolver: zodResolver(config.schema),
    // @ts-ignore
    defaultValues: data,
    // @ts-ignore
    values: data,
  });

  async function onSubmit(data: z.infer<typeof config.schema>) {
    setHasSaved(false);
    //@ts-ignore
    await saveData(data);
    setHasSaved(true);
    // prevent documents from being created multiple times
    // UNDONE because it breaks inputs reflecting the current value
    //reset();

    // reload activity feed
    //router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-12">
        <div className="border-b border-gray-900/10 pb-12">
          {/* <h2 className="text-base font-semibold leading-7 text-gray-900">
            {request.type == 'USER_REQUESTED' ? request.name : config.name}
          </h2> */}
          {(request.description || config.description) && (
            <p className="mt-1 text-sm leading-6 text-gray-600 mb-10">
              {request.type == 'USER_REQUESTED'
                ? request.description
                : config.description}
            </p>
          )}
          <div className=" grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
            {Object.keys(config.form).map((field) => {
              //@ts-ignore
              const fieldConfig: InputConfig = config.form[field];

              return (
                <div className="sm:col-span-8" key={field}>
                  <label
                    htmlFor={field}
                    className="block text-sm font-medium leading-6 text-gray-900"
                  >
                    {fieldConfig.label}
                  </label>
                  {fieldConfig.description && (
                    <div className="text-xs text-gray-500">
                      {fieldConfig.description}
                    </div>
                  )}
                  <div className="mt-4">
                    {fieldConfig.input === 'fileupload' ? (
                      <FileUpload
                        field={field}
                        register={register}
                        errors={errors}
                        config={fieldConfig}
                        request={request}
                        //@ts-ignore
                        setValue={setValue}
                        getValues={getValues}
                        uploading={uploading}
                        setUploading={setUploading}
                        createDocument={createDocument}
                        getPresignedUploadUrl={getPresignedUploadUrl}
                        documents={documents}
                        isDirty={isDirty}
                      />
                    ) : fieldConfig.input === 'checkbox' ? (
                      <Checkbox
                        field={field}
                        register={register}
                        errors={errors}
                        config={fieldConfig}
                      />
                    ) : fieldConfig.input === 'boolean' ? (
                      <BooleanField
                        field={field}
                        //@ts-ignore
                        getValues={getValues}
                        //@ts-ignore
                        setValue={setValue}
                        errors={errors}
                        config={fieldConfig}
                      />
                    ) : fieldConfig.input === 'textarea' ? (
                      <Textarea
                        field={field}
                        register={register}
                        errors={errors}
                        config={fieldConfig}
                      />
                    ) : fieldConfig.input === 'date' ? (
                      <DateField
                        field={field}
                        //@ts-ignore
                        getValues={getValues}
                        //@ts-ignore
                        setValue={setValue}
                        register={register}
                        errors={errors}
                        config={fieldConfig}
                      />
                    ) : fieldConfig.input === 'year' ? (
                      <Year
                        field={field}
                        register={register}
                        errors={errors}
                        config={fieldConfig}
                      />
                    ) : fieldConfig.input === 'text' ? (
                      <Text
                        field={field}
                        register={register}
                        errors={errors}
                        config={fieldConfig}
                      />
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end gap-x-6">
        {!uploading && !isDirty && hasSaved && (
          <div className="flex-grow">
            <SaveNotice />
          </div>
        )}
        {isDirty && (
          <button
            type="button"
            className="text-sm font-semibold leading-6 text-gray-900"
            onClick={() => reset()}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={uploading || !isDirty}
          className={classNames(
            uploading || !isDirty
              ? 'bg-gray-400'
              : 'bg-sky-700 hover:bg-sky-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700',
            'rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm',
          )}
        >
          {uploading ? 'Uploading' : 'Save'}
        </button>
      </div>
    </form>
  );
}

type FormFieldProps = {
  field: string;
  register: any;
  errors: any;
};

function Text({
  field,
  register,
  errors,
  config,
}: FormFieldProps & { config: TextInputConfig }) {
  return (
    <>
      <input
        {...register(field)}
        autoComplete="off"
        className={classNames(
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

function Textarea({
  field,
  register,
  errors,
  config,
}: FormFieldProps & { config: TextareaInputConfig }) {
  return (
    <>
      <textarea
        rows={4}
        {...register(field)}
        className={classNames(
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

function DateField({
  field,
  register,
  getValues,
  setValue,
  errors,
  config,
}: FormFieldProps & {
  config: DateInputConfig;
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
        className={classNames(
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

function Year({
  field,
  register,
  errors,
  config,
}: FormFieldProps & { config: YearInputConfig }) {
  const nextYear = new Date().getFullYear() + 1;
  const years = Array.from({ length: 10 }, (_, i) => nextYear - i);
  return (
    <>
      <select
        {...register(field, {
          setValueAs: (v: string) => parseInt(v),
        })}
        className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
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

      <p className="mt-2 text-sm text-red-600" id="email-error">
        {errors[field]?.message}
      </p>
    </>
  );
}

function Checkbox({
  field,
  register,
  errors,
  config,
}: FormFieldProps & { config: CheckboxInputConfig }) {
  config.input;
  const items = Object.keys(config.items).map((key, idx) => {
    return { type: key, ...config.items[key] };
  });
  return (
    <>
      {items.map((model, idx) => (
        <div key={model.type} className="relative flex items-start">
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
            <label
              htmlFor={`checkbox-${model.type}`}
              className="font-medium text-gray-900"
            >
              {model.name}
            </label>
            <p id={`${model.type}-description`} className="text-gray-500">
              {model.description}
            </p>
          </div>
        </div>
      ))}

      <p className="mt-2 text-sm text-red-600" id="email-error">
        {errors[field]?.message}
      </p>
    </>
  );
}

function BooleanField({
  field,
  getValues,
  setValue,
  errors,
  config,
}: FormFieldProps & {
  config: BooleanInputConfig;
  getValues: (field: string) => any;
  setValue: (key: string, val: any, opts: any) => void;
}) {
  const [enabled, setEnabled] = useState(getValues(field));
  return (
    <>
      <Switch
        checked={enabled}
        onChange={(val) => {
          setValue(field, val, { shouldDirty: true, shouldTouch: true });
          setEnabled(val);
        }}
        className={classNames(
          enabled ? 'bg-sky-700' : 'bg-gray-200',
          'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-700 focus:ring-offset-2',
        )}
      >
        <span className="sr-only">{config.label}</span>
        <span
          aria-hidden="true"
          className={classNames(
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

function FileUpload({
  field,
  register,
  setValue,
  getValues,
  errors,
  config,
  request,
  uploading,
  setUploading,
  createDocument,
  getPresignedUploadUrl,
  documents,
  isDirty,
}: FormFieldProps & {
  config: FileUploadInputConfig;
  request: ClientSafeRequest;
  setValue: (key: string, val: any, opts: any) => void;
  getValues: () => any;
  uploading: boolean;
  setUploading: (val: boolean) => void;
  createDocument: Props['createDocument'];
  getPresignedUploadUrl: Props['getPresignedUploadUrl'];
  documents: Props['documents'];
  isDirty: boolean;
}) {
  const [hasUploaded, setHasUploaded] = useState(false);

  async function uploadDocument(
    e: React.ChangeEvent<HTMLInputElement>,
    request: ClientSafeRequest,
  ) {
    setUploading(true);
    setHasUploaded(false);

    //const el = e.target;

    const file = e.target.files?.[0]!;
    const filename = encodeURIComponent(file.name);
    //const fileType = encodeURIComponent(file.type);

    const signedUrl = await getPresignedUploadUrl({
      filename,
      contentType: file.type,
    });

    const resp = await fetchWithProgress(signedUrl.url, file, (ev) => {
      if (ev.lengthComputable) {
        const percentage = (ev.loaded / ev.total) * 100;
        console.log('YES', percentage);
        //uploadProgress.value = percentage;
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
      const docId = await createDocument(toSave);

      setValue(field, docId, { shouldDirty: true, shouldTouch: true });
      console.log('SUCCESS', resp.ok, toSave);
    } else {
      // TODO: handle
      console.log('ERROR', resp.ok);
    }

    // Clear out the file input
    //el.value = '';
    setUploading(false);
    setHasUploaded(true);
  }
  const value = getValues()[field];

  return (
    <>
      <div>
        <Documents documents={documents} currentDocumentId={value} />
        {/* {documents.map((doc) => (
          <div key={doc.id}>{doc.id}</div>
        ))} */}
      </div>

      <div className=" py-10">
        <label
          htmlFor={`${field}-file`}
          //className="cursor-pointer inline-flex items-center gap-x-1.5 rounded-md bg-slate-100 px-2.5 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
          className="cursor-pointer inline-flex items-cente rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-white"
        >
          {uploading && (
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
          )}
          {hasUploaded && isDirty ? (
            <>
              <CheckCircleIcon
                className="-ml-0.5 mr-1 h-5 w-5 text-green-700"
                aria-hidden="true"
              />
              Document uploaded
            </>
          ) : (
            <>Upload document</>
          )}
        </label>

        {/* <p className="text-xs leading-5 text-gray-600">
          {config.extensions.join(', ')} up to {config.maxFilesizeMB}MB
        </p> */}
        <p className="mt-2 text-sm text-red-600" id="email-error">
          {errors[field]?.message}
        </p>

        <input {...register(field, { required: true })} type="hidden" />
        <input
          id={`${field}-file`}
          name={`${field}-file`}
          type="file"
          className="sr-only"
          multiple={false}
          onChange={(e) => uploadDocument(e, request)}
          // accept="image/png, image/jpeg"
        />
        {/* {value && (
          <div className="mt-2">
            <p className="text-xs leading-5 text-gray-600">
              File has been uploaded but not saved
            </p>
          </div>
        )} */}
      </div>
    </>
  );
}

function Documents({
  documents,
  currentDocumentId,
}: {
  documents: Props['documents'];
  currentDocumentId: string;
}) {
  return (
    <div className="">
      <div className="-mx-4 mt-10 ring-1 ring-gray-300 sm:mx-0 sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead>
            <tr>
              <th
                scope="col"
                className="relative py-3.5 pl-3 pr-4 sm:pr-6"
              ></th>
              <th
                scope="col"
                className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-4"
              >
                File
              </th>
              <th
                scope="col"
                className="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-900 lg:table-cell"
              >
                Uploaded
              </th>
              <th
                scope="col"
                className="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-900 lg:table-cell"
              ></th>
            </tr>
          </thead>
          <tbody>
            {documents.map((document, documentIdx) => (
              <tr key={document.id}>
                <td
                  className={classNames(
                    documentIdx === 0 ? '' : 'border-t border-transparent',
                    'relative py-4 pl-4 pr-3 text-sm sm:pl-6',
                  )}
                >
                  <FiletypeIcon filename={document.key} />
                  {documentIdx !== 0 ? (
                    <div className="absolute -top-px left-6 right-0 h-px bg-gray-200" />
                  ) : null}
                </td>
                <td
                  className={classNames(
                    documentIdx === 0 ? '' : 'border-t border-gray-200',
                    'hidden px-3 py-3.5 text-sm text-gray-500 lg:table-cell',
                  )}
                >
                  <div className="font-medium text-gray-900">
                    {currentDocumentId === document.id && (
                      <div>
                        <div className="inline-flex items-center rounded-full bg-green-50 -ml-2 mb-1 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                          Selected
                        </div>
                      </div>
                    )}
                    <Link href={`/document/${document.id}`}>
                      {document.name}
                    </Link>
                    {document.queries && <Queries queries={document.queries} />}
                  </div>
                </td>
                <td
                  className={classNames(
                    documentIdx === 0 ? '' : 'border-t border-gray-200',
                    'hidden px-3 py-3.5 text-sm text-gray-500 lg:table-cell',
                  )}
                >
                  <Datetime
                    className="py-0.5 text-xs text-gray-500"
                    dateTime={document.createdAt}
                  />
                </td>

                <td
                  className={classNames(
                    documentIdx === 0 ? '' : 'border-t border-transparent',
                    'relative py-3.5 pl-3 pr-4 sm:pr-6',
                  )}
                >
                  <Settings />
                  {documentIdx !== 0 ? (
                    <div className="absolute -top-px left-0 right-6 h-px bg-gray-200" />
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Settings() {
  return (
    <div className="flex flex-none items-center gap-x-4">
      <Menu as="div" className="relative flex-none">
        <Menu.Button className="-m-2.5 block p-2.5 text-gray-500 hover:text-gray-900">
          <span className="sr-only">Open options</span>
          <EllipsisVerticalIcon className="h-5 w-5" aria-hidden="true" />
        </Menu.Button>
        <Transition
          as={Fragment}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <Menu.Items className="absolute right-0 z-10 mt-2 w-18 origin-top-right rounded-md bg-white py-2 shadow-lg ring-1 ring-gray-900/5 focus:outline-none">
            <Menu.Item>
              {({ active }) => (
                <a
                  href="#"
                  className={classNames(
                    active ? 'bg-gray-50' : '',
                    'block px-3 py-1 text-sm leading-6 text-gray-900',
                  )}
                >
                  Select
                </a>
              )}
            </Menu.Item>
            <Menu.Item>
              {({ active }) => (
                <a
                  href="#"
                  className={classNames(
                    active ? 'bg-gray-50' : '',
                    'block px-3 py-1 text-sm leading-6 text-gray-900',
                  )}
                >
                  Download
                </a>
              )}
            </Menu.Item>
            <Menu.Item>
              {({ active }) => (
                <a
                  href="#"
                  className={classNames(
                    active ? 'bg-gray-50' : '',
                    'block px-3 py-1 text-sm leading-6 text-gray-900',
                  )}
                >
                  Delete
                </a>
              )}
            </Menu.Item>
          </Menu.Items>
        </Transition>
      </Menu>
    </div>
  );
}

function Queries({ queries }: { queries: DocumentQuery[] }) {
  return (
    <div className="mt-1 flex flex-col text-slate-400 sm:block text-xs">
      {queries.map((query) => (
        <div key={query.id}>
          <span className="">{humanCase(query.identifier)}</span>:{' '}
          {query.result?.content}
        </div>
      ))}
    </div>
  );
}

function humanCase(input: string): string {
  const words = input.toLowerCase().split('_');
  return words
    .map((word, index) =>
      index === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word,
    )
    .join(' ');
}
