import clsx from 'clsx';
import Link from 'next/link';

import { Content } from '@/components/content';
import { Header } from '@/components/header';
import { getCurrent } from '@/controllers/session-user';
import { getOrgsForUserId } from '@/controllers/user';
import { groupOrgs } from '@/lib/org';
import NewOrgForm from './new-org-form';

type Org = Awaited<ReturnType<typeof getOrgsForUserId>>[number];
type OrgWithChildren = Org & { children: OrgWithChildren[] };

export default async function OrgSelect() {
  const { user, authRedirect } = await getCurrent();
  if (!user) {
    return authRedirect();
  }
  let orgs = await getOrgsForUserId(user.id);
  const groupedOrgs = groupOrgs(orgs);

  return (
    <>
      <Header title="Switch workspaces" />
      <Content pad={true}>
        <div className="mb-4">
          <div className="font-lg border-b pb-1 mb-3">Organizations</div>
          <div>
            <Orgs orgs={groupedOrgs} />
          </div>

          <div className="mt-4">
            <NewOrgForm />
          </div>
        </div>
      </Content>
    </>
  );
}

function Orgs({
  orgs,
  className,
}: {
  orgs: OrgWithChildren[];
  className?: string;
}) {
  return (
    <div className={clsx(className, 'text-sm')}>
      {orgs.map((org) => (
        <div key={org.id}>
          <Link href={`/organization/${org.id}`}>{org.name}</Link>
          {org.children && <Orgs orgs={org.children} className="ml-4" />}
        </div>
      ))}
    </div>
  );
}
