import Navbar from '@/components/navbar';
//import { auth } from '@/auth';
import { redirect } from 'next/navigation';

import { getServerSession } from 'next-auth/next';
import { getCurrentUser } from '@/controllers/user';
import { clientSafe } from '@/lib/util';

async function getUser() {
  try {
    const user = await getCurrentUser();
    return clientSafe(user);
  } catch (err) {
    redirect(`/login?next=/`);
  }
}

export default async function Nav() {
  //const session = await auth();
  //const session = await getServerSession();
  const user = await getUser();
  //console.log(session?.user, '______ nav.tsx');

  // if (!session?.user) {
  //   //redirect(`/sign-in?next=/chat/${params.id}`)
  // }
  //const user = session?.user || {};
  return <Navbar user={user} />;
}
