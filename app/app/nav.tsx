import Navbar from '@/components/navbar';
import type { ClientSafeUser, ClientSafeAudit } from '@/types';
import { getCurrent } from '@/controllers/session-user';
import { clientSafe, omit } from '@/lib/util';
import { getAllByOrgId } from '@/controllers/audit';

export default async function Nav() {
  const user = await getCurrent();
  if (!user) {
    return null;
  }
  const audits = await getAllByOrgId(user.orgId);
  return (
    <Navbar
      user={clientSafe(user) as ClientSafeUser}
      audits={clientSafe(audits) as ClientSafeAudit[]}
    />
  );
}
