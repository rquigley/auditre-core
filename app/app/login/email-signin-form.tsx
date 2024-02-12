'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import clsx from 'clsx';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Text } from '@/components/form-fields';

const schema = z.object({
  email: z.string().email(),
});

export default function EmailSigninForm() {
  const { formState, register, handleSubmit } = useForm<z.infer<typeof schema>>(
    {
      resolver: zodResolver(schema),

      defaultValues: {
        email: '',
      },
    },
  );
  const router = useRouter();

  async function onSubmit(data: z.infer<typeof schema>) {
    await signIn('email', {
      email: data.email,
      callbackUrl: `/`,
      redirect: false,
    });

    router.replace('/login?s=code-sent');
  }

  return (
    <div className="">
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="mt-3">
          <div className="block">
            <label
              htmlFor="name"
              className="block text-sm font-medium leading-6 text-gray-900 text-left"
            >
              Email
            </label>
            <Text
              field="email"
              register={register}
              formState={formState}
              config={{
                input: 'text',
                label: 'Name',
                defaultValue: '',
              }}
            />
          </div>
        </div>
        <div className="mt-2 mb-2 grid grid-flow-row-dense grid-cols-2 gap-3">
          <button
            type="submit"
            disabled={!formState.isDirty || formState.isSubmitting}
            className={clsx(
              !formState.isDirty || formState.isSubmitting
                ? 'bg-gray-400'
                : 'bg-sky-700 hover:bg-sky-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700',
              'inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm sm:col-start-2',
            )}
          >
            {formState.isSubmitting ? 'Sending' : 'Send link'}
          </button>
          <Link
            className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0"
            href="/login"
          >
            Back
          </Link>
        </div>
      </form>
    </div>
  );
}
