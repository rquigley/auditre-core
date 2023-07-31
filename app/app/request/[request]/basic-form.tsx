'use client';
import { useForm, UseFormRegister } from 'react-hook-form';
import { PhotoIcon } from '@heroicons/react/24/solid';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { classNames } from '@/lib/util';
import { getPresignedUploadUrl } from '@/lib/actions';
import {
  requestTypes,
  DateInputConfig,
  TextInputConfig,
  FileUploadInputConfig,
  InputConfig,
  CheckboxInputConfig,
  TextareaInputConfig,
} from '@/lib/request-types';
import type { RequestData, ClientSafeRequest } from '@/types';
import { Input } from 'postcss';

type Props = {
  request: ClientSafeRequest;
  data: RequestData;
  saveData: (data: RequestData) => void;
};

export default function BasicForm({ request, data, saveData }: Props) {
  const router = useRouter();
  const config = requestTypes[request.type];

  async function onSubmit(data: z.infer<typeof config.schema>) {
    // const signedUrl = await getPresignedUploadUrl('hahaha');
    // const file = data.value[0];
    // console.log(file, signedUrl);
    // await fetch(signedUrl, {
    //   method: 'PUT',
    //   body: file,
    // });
    // return;
    await saveData(data);
    router.refresh();
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof config.schema>>({
    resolver: zodResolver(config.schema),
    defaultValues: {
      // todo: use config
      value: data.value,
    },
  });

  const fieldConfig = config.form.value as InputConfig;
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-12">
        <div className="border-b border-gray-900/10 pb-12">
          {/* <h2 className="text-base font-semibold leading-7 text-gray-900">
            {request.type == 'USER_REQUESTED' ? request.name : config.name}
          </h2> */}
          <p className="mt-1 text-sm leading-6 text-gray-600">
            {request.type == 'USER_REQUESTED'
              ? request.description
              : config.description}
          </p>

          <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
            <div className="sm:col-span-8">
              <label
                htmlFor="username"
                className="block text-sm font-medium leading-6 text-gray-900"
              >
                {/* Description */}
              </label>
              <div className="mt-4">
                {fieldConfig.input === 'fileupload' ? (
                  <FileUpload
                    register={register}
                    errors={errors}
                    config={fieldConfig}
                  />
                ) : fieldConfig.input === 'checkbox' ? (
                  <Checkbox
                    register={register}
                    errors={errors}
                    config={fieldConfig}
                  />
                ) : fieldConfig.input === 'textarea' ? (
                  <Textarea
                    register={register}
                    errors={errors}
                    config={fieldConfig}
                  />
                ) : fieldConfig.input === 'date' ? (
                  <Date
                    register={register}
                    errors={errors}
                    config={fieldConfig}
                  />
                ) : fieldConfig.input === 'text' ? (
                  <Text
                    register={register}
                    errors={errors}
                    config={fieldConfig}
                  />
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end gap-x-6">
        <button
          type="button"
          className="text-sm font-semibold leading-6 text-gray-900"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          Save
        </button>
      </div>
    </form>
  );
}

type FormFieldProps = {
  register: any;
  errors: any;
};

function Text({
  register,
  errors,
  config,
}: FormFieldProps & { config: TextInputConfig }) {
  return (
    <>
      <input
        {...register('value')}
        autoComplete="off"
        className={classNames(
          errors.value
            ? ' text-red-900 ring-red-300 placeholder:text-red-300  focus:ring-red-500'
            : 'text-gray-900 ring-gray-300 placeholder:text-gray-400 focus:ring-indigo-600',
          'block w-full rounded-md border-0 py-1.5 px-2.5  shadow-sm ring-1 ring-inset  focus:ring-2 focus:ring-inset  sm:text-sm sm:leading-6',
        )}
      />

      <p className="mt-2 text-sm text-red-600" id="email-error">
        {errors.value?.message}
      </p>
    </>
  );
}

function Textarea({
  register,
  errors,
  config,
}: FormFieldProps & { config: TextareaInputConfig }) {
  return (
    <>
      <textarea
        rows={4}
        {...register('value')}
        className={classNames(
          errors.value
            ? ' text-red-900 ring-red-300 placeholder:text-red-300  focus:ring-red-500'
            : 'text-gray-900 ring-gray-300 placeholder:text-gray-400 focus:ring-indigo-600',
          'block w-full rounded-md border-0 py-1.5 px-2.5  shadow-sm ring-1 ring-inset  focus:ring-2 focus:ring-inset  sm:text-sm sm:leading-6',
        )}
      />

      <p className="mt-2 text-sm text-red-600" id="email-error">
        {errors.value?.message}
      </p>
    </>
  );
}

function Date({
  register,
  errors,
  config,
}: FormFieldProps & { config: DateInputConfig }) {
  return (
    <>
      <input
        {...register('value')}
        autoComplete="off"
        className={classNames(
          errors.value
            ? ' text-red-900 ring-red-300 placeholder:text-red-300  focus:ring-red-500'
            : 'text-gray-900 ring-gray-300 placeholder:text-gray-400 focus:ring-indigo-600',
          'block w-full rounded-md border-0 py-1.5 px-2.5  shadow-sm ring-1 ring-inset  focus:ring-2 focus:ring-inset  sm:text-sm sm:leading-6',
        )}
      />

      <p className="mt-2 text-sm text-red-600" id="email-error">
        {errors.value?.message}
      </p>
    </>
  );
}

function Checkbox({
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
              {...register(`value`)}
              value={model.type}
              aria-describedby={`${model.type}-description`}
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
            />
          </div>
          <div className="ml-3 text-sm leading-6">
            <label htmlFor={model.type} className="font-medium text-gray-900">
              {model.name}
            </label>
            <p id={`${model.type}-description`} className="text-gray-500">
              {model.description}
            </p>
          </div>
        </div>
      ))}

      <p className="mt-2 text-sm text-red-600" id="email-error">
        {errors.value?.message}
      </p>
    </>
  );
}
function FileUpload({
  register,
  errors,
  config,
}: FormFieldProps & { config: FileUploadInputConfig }) {
  return (
    <div className="mt-2 flex justify-center rounded-lg border border-dashed border-gray-900/25 px-6 py-10">
      <div className="text-center">
        <PhotoIcon
          className="mx-auto h-12 w-12 text-gray-300"
          aria-hidden="true"
        />
        <div className="mt-4 flex text-sm leading-6 text-gray-600">
          <label
            htmlFor="value"
            className="relative cursor-pointer rounded-md bg-white font-semibold text-indigo-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-600 focus-within:ring-offset-2 hover:text-indigo-500"
          >
            <span>Upload a file</span>
            <input
              {...register(`value`, { required: true })}
              id="value"
              name="value"
              type="file"
              className="sr-only"
            />
          </label>
          <p className="pl-1">or drag and drop</p>
        </div>
        <p className="text-xs leading-5 text-gray-600">
          {config.extensions.join(', ')} up to {config.maxFilesizeMB}MB
        </p>
        <p className="mt-2 text-sm text-red-600" id="email-error">
          {errors.value?.message}
        </p>
      </div>
    </div>
  );
}
