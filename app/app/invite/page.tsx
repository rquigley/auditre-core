import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import * as z from 'zod';

import { getInvitationById } from '@/controllers/invitation';
import { getCurrent } from '@/controllers/session-user';
import VerifyEmailButton from './verify-email-button';

const schema = z.object({
  id: z.string().length(36),
  email: z.string().email(),
});

export default async function InvitePage({
  searchParams,
}: {
  searchParams: Record<string, string> | null;
}) {
  const { user } = await getCurrent();
  if (user) {
    redirect('/');
  }
  let verificationSent = false;
  const parsed = schema.safeParse(searchParams);
  if (searchParams?.verification === 'sent') {
    verificationSent = true;
  } else {
    verificationSent = false;
    if (!parsed.success) {
      return redirect('/login');
    }
    const invite = await getInvitationById(parsed.data.id);
    if (!invite || invite.email !== parsed.data.email) {
      return redirect('/login');
    }
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
          <h3 className="text-xl font-semibold text-slate-800">
            Email verification
          </h3>

          {verificationSent ? (
            <div className="pb-4 text-sm text-slate-700">
              Please check your inbox. We&apos;ve sent you a verification link
              to complete your account setup.
            </div>
          ) : (
            <>
              <div className="pb-4 text-sm text-slate-700">
                We need to verify your email address in order to complete your
                account setup.
              </div>
              {parsed.success && (
                <VerifyEmailButton email={parsed.data.email} />
              )}
            </>
          )}

          {/* <p className="text-sm text-gray-500">
            Use your email and password to sign in
          </p> */}
        </div>
      </div>
    </div>
  );
}
