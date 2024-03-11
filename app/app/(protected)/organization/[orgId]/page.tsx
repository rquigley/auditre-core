import { notFound } from 'next/navigation';

import ChildOrgs from '@/components/child-orgs';
import { Content } from '@/components/content';
import { Header } from '@/components/header';
import { getChildOrgsWithMeta, getOrgById } from '@/controllers/org';
import { getCurrent } from '@/controllers/session-user';
import NewOrgForm from './new-org-form';
import OrgForm from './org-form';

import type { OrgId } from '@/types';

export default async function OrgPage({
  params: { orgId },
}: {
  params: { orgId: OrgId };
}) {
  const { user, authRedirect } = await getCurrent();
  if (!user) {
    return authRedirect();
  }

  const org = await getOrgById(orgId);
  const childOrgs = await getChildOrgsWithMeta(orgId);

  if (!user.canAccessOrg(org.id)) {
    return notFound();
  }
  return (
    <>
      <Header
        title={org.name}
        breadcrumbs={[{ name: 'Manage organizations', href: '/organizations' }]}
        // settings={<AuditSettings auditId={auditId} />}
      />
      <Content pad={true}>
        <OrgForm
          id={org.id}
          data={{
            name: org.name,
            canHaveChildOrgs: org.canHaveChildOrgs,
            isDeleted: org.isDeleted,
            url: org.url,
            // image: org.image,
          }}
          userCanSetChildOrgs={user.hasPermForOrg(
            'org:can-set-have-child-orgs',
            org.id,
          )}
        />

        {org.canHaveChildOrgs && (
          <>
            <h2 className="mb-2 text-sm text-slate-700">Child organizations</h2>
            <ChildOrgs orgs={childOrgs} />
            <NewOrgForm parentOrgId={orgId} />
          </>
        )}
      </Content>
    </>
  );
}
