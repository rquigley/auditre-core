'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';

import {
  BooleanField,
  Checkbox,
  DateField,
  FileUpload,
  Month,
  Text,
  Textarea,
  Year,
} from '@/components/form-fields';
import SaveNotice from '@/components/save-notice';
import { getFieldDependencies, getSchemaForId } from '@/lib/request-types';
import { classNames, delay, isFieldVisible } from '@/lib/util';

import type { Request } from '@/controllers/request';
//import type { UseFormRegister, FieldErrors } from 'react-hook-form';
//import type { RequestTypeWithData } from '@/controllers/request';
// import type { RequestType } from '@/lib/request-types';
import type { DocumentId, RequestData } from '@/types';

export type Props = {
  request: Request;
  requestData: Record<string, unknown>;
  dataMatchesConfig: boolean;
  saveData: (data: RequestData) => void;
  documents: {
    [key: string]: { id: DocumentId; doc: JSX.Element; data: JSX.Element };
  };
};

export default function BasicForm({
  request,
  requestData,
  dataMatchesConfig,
  saveData,
  documents,
}: Props) {
  const router = useRouter();
  const [showSuccess, setShowSuccess] = useState(false);
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
  useEffect(() => {
    if (formState.isSubmitSuccessful) {
      reset(undefined, { keepValues: true });
      // setShowSuccess(true);
    }
  }, [formState.isSubmitSuccessful, reset]);

  async function onSubmit(data: z.infer<typeof schema>) {
    const p = Promise.all([saveData(data), delay(700)]);

    toast.promise(p, {
      loading: 'Saving...',
      success: async (data) => {
        await delay(1000);
        router.push(`/audit/${request.auditId}`);
        return `Data saved`;
      },
      error: 'Error',
    });
  }

  let enableSubmit;
  if (formState.isSubmitting) {
    enableSubmit = false;
  } else if (formState.isDirty) {
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
            <p className="mt-1 text-sm leading-6 text-gray-600 mb-10">
              {request.description}
            </p>
          )}
          <div className=" grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
            {Object.keys(request.form).map((field) => {
              const fieldConfig = request.form[field];
              const deps = getFieldDependencies(field, request.form);
              const isVisibleA = deps.length ? watch(deps) : [true];
              const isVisible = isFieldVisible(field, isVisibleA, request.form);

              // if (!isVisible) {
              //   return <input type="hidden" key={field} {...register(field)} />;
              // }

              return (
                <div
                  className={classNames(
                    isVisible ? '' : 'hidden',
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
                        formState={formState}
                        config={fieldConfig}
                        setValue={setValue}
                        getValues={getValues}
                        resetField={resetField}
                        document={documents[field]}
                      />
                    ) : fieldConfig.input === 'checkbox' ? (
                      <Checkbox
                        field={field}
                        register={register}
                        formState={formState}
                        config={fieldConfig}
                      />
                    ) : fieldConfig.input === 'boolean' ? (
                      <BooleanField
                        field={field}
                        register={register}
                        getValues={getValues}
                        setValue={setValue}
                        formState={formState}
                        config={fieldConfig}
                      />
                    ) : fieldConfig.input === 'textarea' ? (
                      <Textarea
                        field={field}
                        register={register}
                        formState={formState}
                        config={fieldConfig}
                      />
                    ) : fieldConfig.input === 'date' ? (
                      <DateField
                        field={field}
                        getValues={getValues}
                        setValue={setValue}
                        register={register}
                        formState={formState}
                        config={fieldConfig}
                      />
                    ) : fieldConfig.input === 'year' ? (
                      <Year
                        field={field}
                        register={register}
                        formState={formState}
                        config={fieldConfig}
                      />
                    ) : fieldConfig.input === 'month' ? (
                      <Month
                        field={field}
                        register={register}
                        formState={formState}
                        config={fieldConfig}
                      />
                    ) : fieldConfig.input === 'text' ? (
                      <Text
                        field={field}
                        register={register}
                        formState={formState}
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
        {showSuccess && (
          <div className="flex-grow">
            <SaveNotice cb={() => setShowSuccess(false)} />
          </div>
        )}

        {enableSubmit && formState.isDirty ? (
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
          className={classNames(
            enableSubmit === false
              ? 'bg-gray-400'
              : 'bg-sky-700 hover:bg-sky-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700',
            'rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm transition',
          )}
        >
          {formState.isSubmitting ? 'Saving' : 'Save'}
        </button>
      </div>
    </form>
  );
}
