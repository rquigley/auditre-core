'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import clsx from 'clsx';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Text } from '@/components/form-fields';
import { createOrg } from '@/lib/actions';

import type { OrgId } from '@/types';

const schema = z.object({
  name: z.string().min(1).max(100),
});

export default function NewOrgForm({ parentOrgId }: { parentOrgId: OrgId }) {
  const { register, handleSubmit, reset, formState } = useForm<
    z.infer<typeof schema>
  >({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
    },
  });

  async function onSubmit(data: z.infer<typeof schema>) {
    await createOrg(parentOrgId, data);
    reset();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="mt-4">
        <label
          htmlFor="email"
          className="block text-xs leading-6 text-gray-900"
        >
          Create new workspace
        </label>

        <div className="mt-2 w-72">
          <Text
            field="name"
            register={register}
            errors={formState.errors['name']}
          />
        </div>
      </div>

      <div className="mt-6">
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
          Create organization
        </button>
      </div>
    </form>
  );
}
