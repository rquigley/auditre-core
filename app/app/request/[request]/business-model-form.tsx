'use client';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  businessModelSchema as formSchema,
  businessModels,
} from '@/lib/form-schema';
import type { RequestData } from '@/types';

type Props = {
  data: RequestData;
  saveData: (data: z.infer<typeof formSchema>) => void;
};
export default function BusinessModelForm({ data, saveData }: Props) {
  const router = useRouter();

  async function onSubmit(data: z.infer<typeof formSchema>) {
    await saveData(data);
    router.refresh();
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      value: data.value,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-12">
        <div className="border-b border-gray-900/10 pb-12">
          {/* <h2 className="text-base font-semibold leading-7 text-gray-900">
            Business Model
          </h2> */}
          <p className="mt-1 text-sm leading-6 text-gray-600">
            Model description. This will affect other parts of the audit,
            creating tasks depending on which model is selected.
          </p>

          <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
            <div className="sm:col-span-4 lg:col-span-8">
              <fieldset>
                <legend className="sr-only">Business Models</legend>
                <div className="space-y-5">
                  {businessModels.map((model, idx) => (
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
                        <label
                          htmlFor={model.type}
                          className="font-medium text-gray-900"
                        >
                          {model.name}
                        </label>
                        <p
                          id={`${model.type}-description`}
                          className="text-gray-500"
                        >
                          {model.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </fieldset>
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
