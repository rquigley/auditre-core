'use client';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
//import { businessDescriptionSchema as formSchema } from '@/lib/form-schema';
import { classNames } from '@/lib/util';
import { requestTypes, RequestTypeConfig } from '@/lib/request-types';
import type { RequestData, ClientSafeRequest } from '@/types';

type Props = {
  request: ClientSafeRequest;
  data: RequestData;
  saveData: (data: RequestData) => void;
};

export default function BasicForm({ request, data, saveData }: Props) {
  const router = useRouter();
  const config = requestTypes[request.type];

  async function onSubmit(data: z.infer<typeof config.schema>) {
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
                Description
              </label>
              <div className="mt-4">
                {config.form.value.input === 'checkbox' ? (
                  <Checkbox
                    register={register}
                    errors={errors}
                    config={config.form.value}
                  />
                ) : config.form.value.input === 'textarea' ? (
                  <TextArea
                    register={register}
                    errors={errors}
                    config={config.form.value}
                  />
                ) : (
                  <Text
                    register={register}
                    errors={errors}
                    config={config.form.value}
                  />
                )}
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

function Text({ register, errors, config }) {
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

function TextArea({ register, errors, config }) {
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

function Checkbox({ register, errors, config }) {
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
