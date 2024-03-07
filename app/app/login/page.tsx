import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import AuthMagicCodeForm from '@/components/auth-magic-code-form';
import { getCurrent } from '@/controllers/session-user';
import AuthEmailButton from '../../components/auth-email-button';
import AuthServiceButton from '../../components/auth-service-button';
import EmailSigninForm from './email-signin-form';
import Redirector from './redirector';

const searchParamsSchema = z.object({
  s: z.enum(['code-sent', 'email-login']).optional(),
  email: z.string().email().optional(),
});

export default async function Login({
  searchParams = {},
}: {
  searchParams: Record<string, string> | null;
}) {
  const { user } = await getCurrent();
  if (user) {
    redirect('/');
  }

  const parsed = searchParamsSchema.safeParse(searchParams);

  if (!parsed.success) {
    return redirect('/login');
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
          ) : null}
        </div>
        {urlState === 'initial' ? (
          <div className="px-2">
            <AuthServiceButton service="google" type="login" />
            {/* <AuthServiceButton service="outlook" type="login" /> */}
            <AuthEmailButton />
          </div>
        ) : urlState === 'email-login' ? (
          <div className="px-2">
            <EmailSigninForm />
          </div>
        ) : urlState === 'code-sent' && parsed.data.email ? (
          <div className="mt-4 flex w-full flex-col items-center justify-center px-2 text-center">
            <AuthMagicCodeForm email={parsed.data.email} />
          </div>
        ) : null}
      </div>
      <Redirector hasUser={!!user} />
    </div>
  );
}
