'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import {
  BooleanField,
  Checkbox,
  DateField,
  FileUpload,
  Text,
  Textarea,
  Year,
} from '@/components/form-fields';
import SaveNotice from '@/components/save-notice';
import { requestTypes } from '@/lib/request-types';
import { classNames, delay } from '@/lib/util';

import type {
  ClientSafeRequest,
  Document,
  DocumentQuery,
  RequestData,
  S3File,
} from '@/types';

//import type { UseFormRegister, FieldErrors } from 'react-hook-form';

export type Props = {
  request: ClientSafeRequest;
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

export type FormState =
  | { type: 'idle' }
  | { type: 'dirty' }
  | {
      type: 'uploading';
    }
  | {
      type: 'uploaded';
    }
  | { type: 'saving' }
  | { type: 'saved' };
export default function BasicForm({
  request,
  saveData,
  createDocument,
  getPresignedUploadUrl,
  documents,
}: Props) {
  const config = requestTypes[request.type];

  const [state, setState] = useState<FormState>({ type: 'idle' });
  useEffect(() => {
    if (state.type === 'saved') {
      const timeout = setTimeout(() => {
        setState({ type: 'idle' });
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [state.type]);

  const {
    formState: { isDirty },
    register,
    setValue,
    getValues,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.infer<typeof config.schema>>({
    resolver: zodResolver(config.schema),
    defaultValues: request.data,
  });

  useEffect(() => {
    if (isDirty && state.type === 'idle') {
      setState({ type: 'dirty' });
    } else if (!isDirty && state.type === 'dirty') {
      setState({ type: 'idle' });
    }
  }, [isDirty, state.type]);

  async function onSubmit(data: z.infer<typeof config.schema>) {
    setState({ type: 'saving' });

    await Promise.all([saveData(data), delay(1500)]);
    setState({ type: 'saved' });
    // await delay(5000);
    // setState({ type: 'idle' });
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
              const fieldConfig = config.form[field];

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
                        setValue={setValue}
                        getValues={getValues}
                        formState={state}
                        setFormState={setState}
                        createDocument={createDocument}
                        getPresignedUploadUrl={getPresignedUploadUrl}
                        documents={documents}
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
                        register={register}
                        getValues={getValues}
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
                        getValues={getValues}
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
        {!isDirty && state.type === 'saved' && (
          <div className="flex-grow">
            <SaveNotice />
          </div>
        )}
        {isDirty && state.type !== 'uploading' && state.type !== 'saving' ? (
          <button
            type="button"
            className="text-sm font-semibold leading-6 text-gray-900"
            onClick={() => reset()}
          >
            Cancel
          </button>
        ) : null}
        <button
          type="submit"
          aria-disabled={
            !isDirty || state.type === 'uploading' || state.type === 'saving'
          }
          className={classNames(
            !isDirty || state.type === 'uploading' || state.type === 'saving'
              ? 'bg-gray-400'
              : 'bg-sky-700 hover:bg-sky-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700',
            'rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm transition',
          )}
        >
          {state.type === 'uploading'
            ? 'Uploading'
            : state.type === 'saving'
            ? 'Saving'
            : 'Save'}
        </button>
      </div>
    </form>
  );
}
