import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { getCurrent } from '@/controllers/session-user';
import { getPostAuthUrl } from '@/lib/actions';
import LoginButton from './login-button';
import Redirector from './redirector';

export default async function Login() {
  const { user } = await getCurrent();
  if (user) {
    redirect('/');
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
      <div className="z-10 w-full max-w-md overflow-hidden rounded-2xl border border-gray-100 shadow-xl">
        <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 bg-white px-4 py-6 pt-8 text-center sm:px-16">
          <Link href="/">
            <Image
              width="134"
              height="50"
              src="/img/auditre.svg"
              className="h-10 w-auto"
              alt="AuditRe"
            />
          </Link>
          <h3 className="text-xl font-semibold">Sign In</h3>
          <p className="text-sm text-gray-500">
            Use your email and password to sign in
          </p>
        </div>
        {/* <LoginForm /> */}
        <Suspense
          fallback={
            <div className="my-2 h-10 w-full rounded-md border border-stone-200 bg-stone-100 dark:border-stone-700 dark:bg-stone-800" />
          }
        >
          {/* <LoginButton service="github" /> */}
          <LoginButton service="google" />
          <Redirector hasUser={!!user} />
        </Suspense>
      </div>
    </div>
  );
}
