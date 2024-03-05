'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import clsx from 'clsx';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { BooleanField, Text } from '@/components/form-fields';
import { updateOrg } from '@/lib/actions';
import { zUrlOrEmptyString } from '@/lib/util';
import { OrgId } from '@/types';

const schema = z.object({
  name: z.string().min(1),
  canHaveChildOrgs: z.boolean(),
  url: zUrlOrEmptyString,
  // image: zUrlOrEmptyString,
  isDeleted: z.boolean(),
});

export type Props = {
  id: OrgId;
  data: {
    name: string;
    canHaveChildOrgs: boolean;
    url: string;
    // image: string;
    isDeleted: boolean;
  };
  userCanSetChildOrgs: boolean;
};

export default function OrgForm({ id, data, userCanSetChildOrgs }: Props) {
  const { register, setValue, getValues, handleSubmit, reset, formState } =
    useForm<z.infer<typeof schema>>({
      resolver: zodResolver(schema),
      defaultValues: data,
    });

  async function onSubmit(data: z.infer<typeof schema>) {
    const newData = await updateOrg(id, data);
    reset(newData);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="max-w-md pb-12">
        <div className="mb-3">
          <label
            htmlFor="name"
            className="block text-sm font-medium leading-6 text-gray-900"
          >
            Name
          </label>
          <div className="pt-2">
            <Text
              field="name"
              register={register}
              errors={formState.errors['name']}
            />
          </div>
        </div>

        {userCanSetChildOrgs ? (
          <div className="mb3">
            <label
              htmlFor="name"
              className="block text-sm font-medium leading-6 text-gray-900"
            >
              Allow this organization to have child organizations
            </label>
            <BooleanField
              field="canHaveChildOrgs"
              register={register}
              enabled={getValues('canHaveChildOrgs')}
              setEnabled={(enabled) =>
                setValue('canHaveChildOrgs', enabled, {
                  shouldDirty: true,
                  shouldTouch: true,
                })
              }
              errors={formState.errors['canHaveChildOrgs']}
              label="Can have child orgs"
            />
          </div>
        ) : (
          <input type="hidden" {...register('canHaveChildOrgs')} />
        )}

        <div className="mb-3">
          <label
            htmlFor="url"
            className="block text-sm font-medium leading-6 text-gray-900"
          >
            Company URL
          </label>
          <div className="pt-2">
            <Text
              field="url"
              register={register}
              errors={formState.errors['url']}
            />
          </div>
        </div>

        {/* <div className="mb-3">
          <label
            htmlFor="image"
            className="block text-sm font-medium leading-6 text-gray-900"
          >
            Image URL
          </label>
          <div className="pt-2">
            <Text
              field="image"
              register={register}
              errors={formState.errors['image']}
            />
          </div>
        </div> */}

        <div className="mt-6 flex items-center justify-end gap-x-6">
          <button
            type="submit"
            disabled={!formState.isDirty || formState.isSubmitting}
            className={clsx(
              !formState.isDirty || formState.isSubmitting
                ? 'bg-gray-400'
                : 'bg-sky-700 hover:bg-sky-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700',
              'rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm transition',
            )}
          >
            Update
          </button>
        </div>
      </div>
    </form>
  );
}
