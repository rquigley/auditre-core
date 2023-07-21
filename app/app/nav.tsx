import Navbar from '@/components/navbar';
//import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { ClientSafeUser } from '@/types';
import { getServerSession } from 'next-auth/next';
import { getCurrentUser } from '@/controllers/user';
import { clientSafe, omit } from '@/lib/util';
import { getAllByOrgId } from '@/controllers/audit';
import type { User } from '@/types';

async function getUser() {
  try {
    return await getCurrentUser();
  } catch (err) {
    redirect(`/login?next=/`);
  }
}

export default async function Nav() {
  const user = await getUser();
  const audits = await getAllByOrgId(user.orgId);
  const a2 = clientSafe(audits);
  return (
    <Navbar
      user={clientSafe(user) as ClientSafeUser}
      audits={clientSafe(audits)}
    />
  );
}
