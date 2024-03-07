import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import * as z from 'zod';

import AuthMagicCodeForm from '@/components/auth-magic-code-form';
import AuthServiceButton from '@/components/auth-service-button';
import { getInvitationById } from '@/controllers/invitation';
import { getOrgById } from '@/controllers/org';
import { getCurrent } from '@/controllers/session-user';

const searchParamsSchema = z.object({
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
  const parsed = searchParamsSchema.safeParse(searchParams);
  if (!parsed.success) {
    return redirect('/login');
  }

  const verificationSent = searchParams?.verification === 'sent';
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
          {verificationSent ? (
            <AuthMagicCodeForm email={parsed.data.email} />
          ) : (
            <InnerInvite id={parsed.data.id} email={parsed.data.email} />
          )}
        </div>
      </div>
    </div>
  );
}

async function InnerInvite({ id, email }: { id: string; email: string }) {
  const invite = await getInvitationById(id);
  if (!invite || invite.email !== email) {
    return redirect('/login');
  }
  const org = await getOrgById(invite.orgId);

  return (
    <>
      <h3 className="text-xl font-semibold text-slate-800">
        You&apos;ve been invited to join
        <br />
        {org.name}
      </h3>

      <div className="pb-4 text-sm text-slate-700">
        Please choose a sign-in method to complete your account setup. The email
        address you were invited with is {invite.email}.
      </div>

      <AuthServiceButton service="google" type="create" email={invite.email} />
      {/* <AuthServiceButton
            service="outlook"
            type="create"
            email={invite.email}
          /> */}
      <AuthServiceButton service="email" type="create" email={invite.email} />
    </>
  );
}
