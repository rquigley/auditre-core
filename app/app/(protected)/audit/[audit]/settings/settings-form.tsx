'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import clsx from 'clsx';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Text } from '@/components/form-fields';
import { updateAudit } from '@/lib/actions';

const auditSchema = z.object({
  name: z.string().min(3).max(72),
});

export function SettingsForm({
  audit,
}: {
  audit: { id: string; name: string };
}) {
  const { formState, register, handleSubmit, reset } = useForm<
    z.infer<typeof auditSchema>
  >({
    resolver: zodResolver(auditSchema),

    defaultValues: {
      name: audit.name,
    },
  });
  async function onSubmit(data: z.infer<typeof auditSchema>) {
    const p = updateAudit(audit.id, {
      name: data.name,
      // year: data.year,
    });

    toast.promise(p, {
      loading: 'Saving...',
      success: async () => {
        reset(undefined, { keepValues: true });
        return `Data saved`;
      },
      error: 'Error',
    });
  }
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-80">
      <div>
        <div className="mt-3 text-center sm:mt-5">
          <div className="mt-2">
            <div>
              <label
                htmlFor={'name'}
                className="block text-sm font-medium leading-6 text-gray-900 text-left"
              >
                Name
              </label>
              <Text
                field="name"
                register={register}
                errors={formState.errors['name']}
              />
            </div>
          </div>
        </div>
      </div>
      <div className="mt-6 flex items-center justify-end gap-x-6">
        {formState.isDirty && !formState.isSubmitting ? (
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
    </form>
  );
}
