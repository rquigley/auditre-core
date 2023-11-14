import { Suspense } from 'react';

import { Await } from '@/components/await';
import { Content } from '@/components/content';
import { Header } from '@/components/header';
import NewAuditButton from '@/components/new-audit-button';
import NewAuditModal from '@/components/new-audit-modal';
import { PageSpinner } from '@/components/spinner';
import { getAllByOrgId } from '@/controllers/audit';
import { getFirstRequestId } from '@/controllers/request';
import { getCurrent } from '@/controllers/session-user';
import Row from './row';

export default async function AuditsPage() {
  const { user, authRedirect } = await getCurrent();
  if (!user) {
    return authRedirect();
  }
  const audits = getAllByOrgId(user.orgId);

  return (
    <>
      <Header title="Audits" />
      <Content>
        <div className="my-5 ml-5">
          <NewAuditButton />
        </div>

        <ul className="min-w-full border-t border-gray-200 ">
          <Suspense
            fallback={
              <li>
                <PageSpinner />
              </li>
            }
          >
            <Await promise={audits}>
              {(rows) => (
                <>
                  {rows.map((audit) => {
                    const a = {
                      ...audit,
                      firstRequestSlug: getFirstRequestId(audit.id),
                    };
                    return <Row audit={a} key={audit.id} />;
                  })}
                </>
              )}
            </Await>
          </Suspense>
        </ul>
      </Content>

      <NewAuditModal />
    </>
  );
}
