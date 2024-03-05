'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import clsx from 'clsx';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useSWRConfig } from 'swr';
import * as z from 'zod';

import {
  BooleanField,
  Checkbox,
  FileUpload,
  Month,
  Text,
  Textarea,
  Year,
} from '@/components/form-fields';
import {
  FormField,
  getFieldDependencies,
  getSchemaForId,
} from '@/lib/request-types';
import { isFieldVisible } from '@/lib/util';

import type { Request } from '@/controllers/request';
import type { AuditId, DocumentId } from '@/types';

export type Props = {
  auditId: AuditId;
  request: Request;
  requestData: Record<string, FormField['defaultValue']>;
  dataMatchesConfig: boolean;
  saveData: (data: Record<string, FormField['defaultValue']>) => Promise<{
    data: Record<string, FormField['defaultValue']>;
    postSaveAction: string | undefined;
  }>;
  documents: {
    [key: string]: Array<{
      id: DocumentId;
      doc: JSX.Element;
      data: JSX.Element;
    }>;
  };
};

export function BasicForm({
  auditId,
  request,
  requestData,
  dataMatchesConfig,
  saveData,
  documents,
}: Props) {
  const { mutate } = useSWRConfig();
  const [numFilesUploading, setNumFilesUplading] = useState(0);
  const schema = getSchemaForId(request.id);

  const {
    register,
    setValue,
    getValues,
    handleSubmit,
    reset,
    resetField,
    watch,
    formState,
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: requestData,
  });

  async function onSubmit(data: z.infer<typeof schema>) {
    const { data: newData, postSaveAction } = await saveData(data);
    reset(newData);

    if (postSaveAction === 'trial-balance') {
      toast.success('Trial balance saved. Extracting balances...');

      mutate(`/audit/${auditId}/account-balance`);
    } else if (postSaveAction) {
      throw new Error(`Unknown postSaveAction: ${postSaveAction}`);
    } else {
      toast.success('Request saved');
    }
  }

  const { isDirty } = formState; // -- uses Proxy.
  let enableSubmit;
  if (numFilesUploading > 0) {
    enableSubmit = false;
  } else if (formState.isSubmitting) {
    enableSubmit = false;
  } else if (isDirty) {
    enableSubmit = true;
  } else if (!dataMatchesConfig) {
    enableSubmit = true;
  } else {
    enableSubmit = false;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-12">
        <div className="border-b border-gray-900/10 pb-12">
          {/* <h2 className="text-base font-semibold leading-7 text-gray-900">
            {request.type == 'USER_REQUESTED' ? request.name : config.name}
          </h2> */}
          {request.description && (
            <p className="mb-10 mt-1 text-sm leading-6 text-gray-600">
              {request.description}
            </p>
          )}
          <div className=" grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
            {Object.keys(request.form).map((field) => {
              const fieldConfig = request.form[field];
              const deps = getFieldDependencies(field, request.form);
              const isVisibleA = deps.length ? watch(deps) : [true];
              const isVisible = isFieldVisible(field, isVisibleA, request.form);

              return (
                <div
                  className={clsx(
                    isVisible ? '' : 'hidden',
                    fieldConfig.input === 'fileupload'
                      ? 'rounded-md border p-4'
                      : '',
                    'sm:col-span-8',
                  )}
                  key={field}
                >
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
                  <div className="pt-2">
                    {fieldConfig.input === 'fileupload' ? (
                      <FileUpload
                        field={field}
                        register={register}
                        errors={formState.errors[field]}
                        isSubmitSuccessful={formState.isSubmitSuccessful}
                        config={fieldConfig}
                        setValue={setValue}
                        getValues={getValues}
                        resetField={resetField}
                        documents={documents[field]}
                        setNumFilesUplading={setNumFilesUplading}
                      />
                    ) : fieldConfig.input === 'checkbox' ? (
                      <Checkbox
                        field={field}
                        register={register}
                        errors={formState.errors[field]}
                        config={fieldConfig}
                      />
                    ) : fieldConfig.input === 'boolean' ? (
                      <BooleanField
                        field={field}
                        register={register}
                        enabled={getValues(field)}
                        setEnabled={(enabled) =>
                          setValue(field, enabled, {
                            shouldDirty: true,
                            shouldTouch: true,
                          })
                        }
                        errors={formState.errors[field]}
                        label={fieldConfig.label || ''}
                      />
                    ) : fieldConfig.input === 'textarea' ? (
                      <Textarea
                        field={field}
                        register={register}
                        errors={formState.errors[field]}
                      />
                    ) : fieldConfig.input === 'year' ? (
                      <Year
                        field={field}
                        register={register}
                        errors={formState.errors[field]}
                        label={fieldConfig.label}
                      />
                    ) : fieldConfig.input === 'month' ? (
                      <Month
                        field={field}
                        register={register}
                        errors={formState.errors[field]}
                        config={fieldConfig}
                      />
                    ) : fieldConfig.input === 'text' ? (
                      <Text
                        field={field}
                        register={register}
                        errors={formState.errors[field]}
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
        {/* {showSuccess && (
          <div className="flex-grow">
            <SaveNotice cb={() => setShowSuccess(false)} />
          </div>
        )} */}

        {enableSubmit && isDirty ? (
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
          disabled={enableSubmit === false}
          className={clsx(
            enableSubmit === false
              ? 'bg-gray-400'
              : 'bg-sky-700 hover:bg-sky-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700',
            'rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm transition',
          )}
        >
          Save
        </button>
      </div>
    </form>
  );
}
