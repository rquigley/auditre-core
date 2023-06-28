import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function RequestsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect(`/login?next=/requests`);
  }
  return (
    <div className="flex h-[calc(100vh-theme(spacing.16))] items-center justify-center py-10">
      These are the requests!
    </div>
  );
}
