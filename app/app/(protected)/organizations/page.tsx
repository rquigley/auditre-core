import ChildOrgs from '@/components/child-orgs';
import { Content } from '@/components/content';
import { Header } from '@/components/header';
import { getOrgsWithMeta } from '@/controllers/org';
import { getCurrent } from '@/controllers/session-user';
import { getOrgsForUserIdCached } from '@/controllers/user';

export default async function OrgSelect() {
  const { user, authRedirect } = await getCurrent();
  if (!user) {
    return authRedirect();
  }
  const orgs = await getOrgsForUserIdCached(user.id);
  const orgsWithMeta = await getOrgsWithMeta(orgs.map((org) => org.id));

  return (
    <>
      <Header title="Manage organizations" />
      <Content pad={true}>
        <div className="mb-4">
          <h2 className="mb-2 text-sm text-slate-700">
            Organizations you can access
          </h2>
          <ChildOrgs orgs={orgsWithMeta} />
        </div>
      </Content>
    </>
  );
}
