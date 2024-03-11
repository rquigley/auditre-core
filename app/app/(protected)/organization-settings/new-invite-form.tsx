'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import clsx from 'clsx';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Text } from '@/components/form-fields';
import { createInvite } from '@/lib/actions';

const schema = z.object({
  email: z.string().email(),
});

export default function NewInviteForm() {
  const { register, handleSubmit, reset, formState, setError } = useForm<
    z.infer<typeof schema>
  >({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
    },
  });

  async function onSubmit(data: z.infer<typeof schema>) {
    const res = await createInvite(data);
    if (!res.success) {
      setError('email', {
        type: 'manual',
        message: res.message,
      });
      return;
    }
    console.log(res);
    reset();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="sm:col-span-4">
        <label
          htmlFor="email"
          className="block text-sm font-medium leading-6 text-gray-900"
        >
          New invite email
        </label>
        <div className="mt-2 w-72">
          <Text
            field="email"
            register={register}
            errors={formState.errors['email']}
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={!formState.isDirty || formState.isSubmitting}
        className={clsx(
          !formState.isDirty || formState.isSubmitting
            ? 'bg-gray-400'
            : 'bg-sky-700 hover:bg-sky-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700',
          'mt-2 rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm transition',
        )}
      >
        Send Invite
      </button>
    </form>
  );
}
