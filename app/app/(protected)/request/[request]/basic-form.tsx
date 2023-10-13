'use client';

import { zodResolver } from '@hookform/resolvers/zod';
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
import { classNames, delay, isFieldVisible } from '@/lib/util';

import type {
  ClientSafeRequest,
  RequestData,
  RequestId,
  S3File,
} from '@/types';

//import type { UseFormRegister, FieldErrors } from 'react-hook-form';

export type Props = {
  request: ClientSafeRequest;
  saveData: (data: RequestData) => void;
  documents: { [key: string]: JSX.Element };
  createDocument: (file: S3File, requestId: RequestId) => Promise<any>;
};

export default function BasicForm({
  request,
  saveData,
  documents,
  createDocument,
}: Props) {
  const config = requestTypes[request.type];

  const [showSuccess, setShowSuccess] = useState(false);

  const {
    formState: { isDirty, isSubmitting, isSubmitSuccessful },
    register,
    setValue,
    getValues,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<z.infer<typeof config.schema>>({
    resolver: zodResolver(config.schema),
    defaultValues: request.data,
  });

  useEffect(() => {
    if (isSubmitSuccessful) {
      reset(undefined, { keepValues: true });
      setShowSuccess(true);
    }
  }, [isSubmitSuccessful, reset]);

  async function onSubmit(data: z.infer<typeof config.schema>) {
    await Promise.all([saveData(data), delay(700)]);
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
              // @ts-ignore
              const fieldConfig = config.form[field];
              const isVisibleA = setupWatchFields(
                field,
                getValues(),
                config.form,
                watch,
              );
              const isVisible = isFieldVisible(field, isVisibleA, config.form);

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
                        errors={errors}
                        config={fieldConfig}
                        request={request}
                        setValue={setValue}
                        getValues={getValues}
                        document={documents[field]}
                        createDocument={createDocument}
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
        {showSuccess && (
          <div className="flex-grow">
            <SaveNotice cb={() => setShowSuccess(false)} />
          </div>
        )}

        {isDirty && !isSubmitting ? (
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
          aria-disabled={!isDirty || isSubmitting}
          className={classNames(
            !isDirty || isSubmitting
              ? 'bg-gray-400'
              : 'bg-sky-700 hover:bg-sky-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700',
            'rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm transition',
          )}
        >
          {isSubmitting ? 'Saving' : 'Save'}
        </button>
      </div>
    </form>
  );
}

export function setupWatchFields(
  field: string,
  values: any,
  formConfig: any,
  watch: any,
): Array<boolean> {
  let watchFields = [];
  // Don't bother for static fields
  if (!formConfig[field].dependsOn) {
    return [true];
  }
  while (true) {
    let fieldConfig = formConfig[field];
    if (!fieldConfig) {
      throw new Error(
        `Field "${field}" not found in form config, available fields: ${Object.keys(
          formConfig,
        ).join(', ')}`,
      );
    }

    if (fieldConfig.dependsOn) {
      let dependsOnField;
      //let dependsOnState;
      if (typeof fieldConfig.dependsOn === 'object') {
        dependsOnField = fieldConfig.dependsOn.field;
      } else {
        dependsOnField = fieldConfig.dependsOn;
      }

      watchFields.push(dependsOnField);

      field = dependsOnField;
    } else {
      break;
    }
  }
  return watch(watchFields);
}
