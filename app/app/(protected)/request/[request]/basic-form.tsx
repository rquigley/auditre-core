'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
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
import { InputConfig, requestTypes } from '@/lib/request-types';
import { classNames } from '@/lib/util';

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
