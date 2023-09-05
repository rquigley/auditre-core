'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { PhotoIcon } from '@heroicons/react/24/solid';

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
import { DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import type { RequestData, ClientSafeRequest, S3File } from '@/types';
import Calendar from '@/components/calendar';
import { Switch } from '@headlessui/react';
import { SaveNotice } from '@/components/save-notice';

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
};

export default function BasicForm({
  request,
  data,
  saveData,
  createDocument,
  getPresignedUploadUrl,
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
                    htmlFor="username"
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
                        setUploading={setUploading}
                        createDocument={createDocument}
                        getPresignedUploadUrl={getPresignedUploadUrl}
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
  setUploading,
  createDocument,
  getPresignedUploadUrl,
}: FormFieldProps & {
  config: FileUploadInputConfig;
  request: ClientSafeRequest;
  setValue: (key: string, val: any, opts: any) => void;
  getValues: () => any;
  setUploading: (val: boolean) => void;
  createDocument: (file: S3File) => Promise<string>;
  //getPresignedUploadUrl: Pick<Props, 'getPresignedUploadUrl'>;
  getPresignedUploadUrl: (opts: {
    filename: string;
    contentType: string;
  }) => Promise<{
    documentId: string;
    url: string;
    key: string;
    bucket: string;
  }>;
}) {
  async function uploadDocument(
    e: React.ChangeEvent<HTMLInputElement>,
    request: ClientSafeRequest,
  ) {
    setUploading(true);
    //const el = e.target;

    const file = e.target.files?.[0]!;
    const filename = encodeURIComponent(file.name);
    //const fileType = encodeURIComponent(file.type);

    const signedUrl = await getPresignedUploadUrl({
      filename,
      contentType: file.type,
    });

    const resp = await fetch(signedUrl.url, {
      method: 'PUT',
      body: file,
    });
    const toSave: S3File = {
      documentId: signedUrl.documentId,
      key: signedUrl.key,
      bucket: signedUrl.bucket,
      name: file.name,
      size: file.size,
      lastModified: file.lastModified,
      type: file.type,
    };
    if (resp.ok) {
      // TODO: show progress
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
  }
  const value = getValues()[field];

  return (
    <div className="mt-2 flex justify-center rounded-lg border border-dashed border-gray-900/25 px-6 py-10">
      <div className="text-center">
        <PhotoIcon
          className="mx-auto h-12 w-12 text-gray-300"
          aria-hidden="true"
        />
        <div className="mt-4 flex text-sm leading-6 text-gray-600">
          <label
            htmlFor={`${field}-file`}
            className="relative cursor-pointer rounded-md bg-white font-semibold text-sky-700 focus-within:outline-none focus-within:ring-2 focus-within:ring-sky-700 focus-within:ring-offset-2 hover:text-sky-700"
          >
            <span>Upload a document</span>
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
          </label>
          <p className="pl-1">or drag and drop</p>
        </div>
        <p className="text-xs leading-5 text-gray-600">
          {config.extensions.join(', ')} up to {config.maxFilesizeMB}MB
        </p>
        <p className="mt-2 text-sm text-red-600" id="email-error">
          {errors[field]?.message}
        </p>
        {value && value.key && (
          <div className="mt-2">
            <p className="text-xs leading-5 text-gray-600">
              File has been uploaded but not saved
            </p>
          </div>
        )}
        {value && (
          <div className="mt-2">
            <p className="text-xs leading-5 text-gray-600">
              <a
                href={`/document/${value.documentExternalId}/download`}
                className="flex items-center gap-x-1"
              >
                <DocumentArrowDownIcon
                  className="h-4 w-4 text-green-700"
                  aria-hidden="true"
                />
                Download
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
