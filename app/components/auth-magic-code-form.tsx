'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import clsx from 'clsx';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import { checkValidationToken } from '@/lib/actions';

const magicCodeSchema = z.object({
  token: z
    .string()
    .trim()
    .min(6, 'This code is invalid')
    .max(7, 'This code is invalid')
    .transform((val) => {
      val = val.toUpperCase();
      if (val.length === 6 && val.includes('-') === false) {
        val = val.slice(0, 3) + '-' + val.slice(3);
      }
      return val;
    }),
});

export default function AuthMagicCodeForm({ email }: { email: string }) {
  const { register, handleSubmit, formState, setError } = useForm<
    z.infer<typeof magicCodeSchema>
  >({
    resolver: zodResolver(magicCodeSchema),
    defaultValues: {
      token: '',
    },
  });

  async function onSubmit(data: z.infer<typeof magicCodeSchema>) {
    const { status } = await checkValidationToken(email, data.token);
    if (status === 'valid') {
      location.assign(
        `/api/auth/callback/email?token=${encodeURIComponent(data.token)}&email=${encodeURIComponent(email)}`,
      );
    } else if (status === 'invalid') {
      setError('token', { type: 'custom', message: 'This code is invalid' });
    } else if (status === 'expired') {
      setError('token', { type: 'custom', message: 'This code has expired' });
    }
  }

  return (
    <div className="pb-4 text-sm text-slate-700">
      We&apos;ve sent a six-digit code to <b>{email}</b>. This code expires
      shortly so please enter it soon.
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="mx-auto mt-4 w-48">
          <input
            {...register('token')}
            autoComplete="off"
            data-1p-ignore
            className={clsx(
              formState.errors.token
                ? ' text-red-900 ring-red-300 placeholder:text-red-300  focus:ring-red-500'
                : 'text-gray-900 ring-gray-300 placeholder:text-gray-400 focus:ring-sky-700',
              'block w-full rounded-md border-0 px-2.5 py-1.5 text-xl font-bold uppercase leading-6 shadow-sm ring-1 ring-inset focus:ring-2 focus:ring-inset',
            )}
          />

          <p className="mt-2 text-sm text-red-600" id="email-error">
            {formState.errors.token?.message}
          </p>
        </div>

        <input type="hidden" name="email" value={email} />
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
            Complete sign in
          </button>
        </div>
      </form>
    </div>
  );
}
