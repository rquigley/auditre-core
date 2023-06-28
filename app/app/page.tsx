import Image from 'next/image';
import Nav from './nav';
import { Suspense } from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    redirect(`/login?next=/requests`);
  }
  return (
    <Suspense fallback="...">
      <Nav />
    </Suspense>
  );
}
