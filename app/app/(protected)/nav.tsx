import Navbar from '@/components/navbar';
import type { ClientSafeUser, ClientSafeAudit } from '@/types';
import { clientSafe } from '@/lib/util';
import { getAllByOrgId } from '@/controllers/audit';
import type { User } from '@/types';

export default async function Nav({ user }: { user: User }) {
  const audits = await getAllByOrgId(user.orgId);
  return (
    <Navbar
      user={clientSafe(user) as ClientSafeUser}
      audits={clientSafe(audits) as ClientSafeAudit[]}
    />
  );
}
