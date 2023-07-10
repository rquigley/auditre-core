import Navbar from '@/components/navbar';
//import { auth } from '@/auth';
import { unstable_getServerSession } from 'next-auth/next';

export default async function Nav() {
  //const session = await auth();
  const session = await unstable_getServerSession();
  console.log(session);

  if (!session?.user) {
    //redirect(`/sign-in?next=/chat/${params.id}`)
  }
  return <Navbar user={session?.user} />;
}
