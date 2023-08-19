import Nav from './nav';
import { Suspense } from 'react';
import { getCurrent } from '@/controllers/session-user';
import { redirect } from 'next/navigation';

export default async function Home() {
  const user = await getCurrent();
  if (!user) {
    redirect(`/login?next=/`);
  }
  return (
    <Suspense fallback="...">
      <Nav />
    </Suspense>
  );
}
