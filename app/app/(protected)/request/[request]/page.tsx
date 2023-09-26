import Activity from './activity';
import FormContainer from './form-container';
import Header from '@/components/header';
import { getById as getAuditById } from '@/controllers/audit';
import { getById as getRequestById } from '@/controllers/request';
import { getCurrent } from '@/controllers/session-user';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

export default async function RequestPage({
  params: { request: id },
}: {
  params: { request: string };
}) {
  const user = await getCurrent();
  const request = await getRequestById(id);
  const audit = await getAuditById(request.auditId);
  if (audit.orgId !== user.orgId) {
    return notFound();
  }

  const breadcrumbs = [
    { name: 'Audits', href: '/audits' },
    {
      name: `${audit.name} (${audit.year})`,
      href: `/audit/${audit.id}`,
    },
  ];
  return (
    <>
      <Header
        title={request.name || ''}
        subtitle={audit.year ? String(audit.year) : undefined}
        breadcrumbs={breadcrumbs}
      />

      <div className=" max-w-7xl px-4 py-16 sm:px-1 lg:px-1">
        <div className=" grid max-w-2xl grid-cols-1 grid-rows-1 items-start gap-x-8 gap-y-8 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          <div className="-mx-4 px-4 py-8 shadow-sm ring-1 ring-gray-900/5 sm:mx-0 sm:rounded-lg sm:px-8 sm:pb-14 lg:col-span-2 lg:row-span-2 lg:row-end-2 xl:px-16 xl:pb-20 xl:pt-16">
            <Suspense fallback={<div></div>}>
              <FormContainer request={request} user={user} audit={audit} />
            </Suspense>
          </div>
          <div className="lg:col-start-3">
            <h2 className="text-sm font-semibold leading-6 text-gray-900">
              Activity
            </h2>
            <Suspense fallback={<div></div>}>
              <Activity request={request} user={user} />
            </Suspense>
          </div>
        </div>
      </div>
    </>
  );
}
