import { notFound } from 'next/navigation';
import { Fragment } from 'react';

import { getById } from '@/controllers/audit';
import { getAllByAuditId } from '@/controllers/request';
import { getCurrent } from '@/controllers/session-user';
import { AuditHeader } from '../audit-header';

export default async function AuditPage({
  params: { audit: id },
}: {
  params: { audit: string };
}) {
  const user = await getCurrent();
  const audit = await getById(id);

  if (audit.orgId !== user.orgId) {
    return notFound();
  }

  return (
    <>
      <AuditHeader audit={audit} />

      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            Name: {audit.name}
            <br />
            Year: {audit.year}
            <br />
            Delete
            <br />
          </div>
        </div>
      </div>
    </>
  );
}
