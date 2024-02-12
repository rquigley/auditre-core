import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getCurrent } from '@/controllers/session-user';
import EmailLoginButton from './email-login-button';
import EmailSigninForm from './email-signin-form';
import LoginButton from './login-button';
import Redirector from './redirector';

export default async function Login({
  searchParams = {},
}: {
  searchParams: Record<string, string> | null;
}) {
  const { user } = await getCurrent();
  if (user) {
    redirect('/');
  }

  let urlState = 'initial';
  if (searchParams?.s === 'code-sent') {
    urlState = 'code-sent';
  } else if (searchParams?.s === 'email-login') {
    urlState = 'email-login';
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
          {urlState === 'email-login' ? (
            <p className="text-sm text-gray-500">
              We&apos;ll send you a one-time login link to your email.
            </p>
          ) : urlState === 'code-sent' ? (
            <p className="text-sm text-gray-500">
              We&apos;ve emailed you a one-time link to log in.{' '}
              <Link href="/login">Click here</Link> if you haven&apos;t received
              it and want to try again.
            </p>
          ) : null}
        </div>
        {urlState === 'email-login' ? (
          <div className="px-2">
            <EmailSigninForm />
          </div>
        ) : urlState === 'initial' ? (
          <div className="px-2">
            {/* <LoginButton service="github" /> */}
            <LoginButton service="google" />
            <EmailLoginButton />
          </div>
        ) : null}
      </div>
      <Redirector hasUser={!!user} />
    </div>
  );
}
