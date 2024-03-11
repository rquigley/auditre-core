'use client';

import { signIn } from 'next-auth/react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import LoadingDots from '@/components/icons/loading-dots';
import { acceptAllInvites } from '@/lib/actions';
import { ucFirst } from '@/lib/util';

const icon = {
  google: (
    <svg
      x="0px"
      y="0px"
      width="24px"
      height="24px"
      viewBox="0 0 48 48"
      // enableBackground="new 0 0 48 48"
    >
      <path
        fill="#FFC107"
        d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12
	c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24
	c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
      />
      <path
        fill="#FF3D00"
        d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657
	C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36
	c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
      />
      <path
        fill="#1976D2"
        d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571
	c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
      />
    </svg>
  ),
  outlook: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="size-6"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
      />
    </svg>
  ),
  email: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="size-6"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
      />
    </svg>
  ),
};
export default function AuthServiceButton({
  service,
  type,
  email,
}: {
  service: 'google' | 'email';
  type: 'create' | 'login';
  email?: string;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Get error message added by next/auth in URL.
  const searchParams = useSearchParams();
  const error = searchParams?.get('error');

  useEffect(() => {
    const errorMessage = Array.isArray(error) ? error.pop() : error;
    // @ts-expect-error
    errorMessage && toast.error(errorMessage);
  }, [error]);

  if (type === 'create' && !email) {
    return null;
  }

  let label;
  if (type === 'create' && service === 'email') {
    label = `Sign up using one-time email`;
  } else if (type === 'create') {
    label = `Sign up using ${ucFirst(service)}`;
  } else {
    label = `Login with ${ucFirst(service)}`;
  }
  return (
    <>
      <button
        disabled={loading}
        onClick={async () => {
          setLoading(true);

          if (type === 'create') {
            if (email) {
              const { success, error } = await acceptAllInvites(email);
              if (!success) {
                setLoading(false);
                router.push(
                  pathname +
                    `?${searchParams}&error=${encodeURIComponent(String(error))}`,
                );
                return;
              }
            }

            if (service === 'email') {
              await signIn('email', {
                email,
                callbackUrl: `/`,
                redirect: false,
              });

              router.replace(`${pathname}?${searchParams}&verification=sent`);

              return;
            }
          }

          signIn(service);
        }}
        className={`${
          loading
            ? 'cursor-not-allowed bg-stone-50'
            : 'bg-white hover:bg-stone-50 active:bg-stone-100'
        } group my-2 flex h-10 w-full items-center justify-center space-x-2 rounded-md border border-stone-200 transition-colors duration-75 focus:outline-none`}
      >
        {loading ? (
          <LoadingDots color="#A8A29E" />
        ) : (
          <>
            {icon[service]}

            <p className="text-sm font-medium text-slate-600">{label}</p>
          </>
        )}
      </button>
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </>
  );
}
