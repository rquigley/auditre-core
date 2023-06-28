import Navbar from '@/components/navbar';
import { auth } from '@/auth';

export default async function Nav() {
  const session = await auth();

  if (!session?.user) {
    //redirect(`/sign-in?next=/chat/${params.id}`)
  }
  return <Navbar user={session?.user} />;
}
