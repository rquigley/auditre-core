import { notFound, redirect } from 'next/navigation';
import { getAllByAuditId } from '@/controllers/request';
import { getCurrentUser } from '@/controllers/user';
import { getByExternalId } from '@/controllers/audit';
import type { ClientSafeRequest } from '@/types';
import { Fragment } from 'react';
import {
  BriefcaseIcon,
  CalendarIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CurrencyDollarIcon,
  LinkIcon,
  MapPinIcon,
  PencilIcon,
} from '@heroicons/react/20/solid';
import { Menu, Transition } from '@headlessui/react';
import Header from '@/components/header';
import { clientSafe } from '@/lib/util';

import RequestRow from './request-row';

async function getUser() {
  try {
    const user = await getCurrentUser();
    return user;
  } catch (err) {
    redirect(`/login?next=/requests`);
  }
}

export default async function AuditPage({
  params: { audit: externalId },
}: {
  params: { audit: string };
}) {
  const user = await getUser();

  const audit = await getByExternalId(externalId);

  // TODO, how do we better enforce this across routes
  if (audit.orgId !== user.orgId) {
    return notFound();
  }

  const requests = await getAllByAuditId(audit.id);
  const clientSafeRequests = clientSafe(requests) as ClientSafeRequest[];

  const breadcrumbs = [
    { name: 'Audits', href: '/audits' },
    { name: 'Requests', href: '/audits' },
  ];
  return (
    <main className="sm:px-6 lg:px-8 bg-white rounded-sm py-3 px-3">
      <Header
        title={audit.name || ''}
        subtitle={audit.year ? String(audit.year) : undefined}
        breadcrumbs={breadcrumbs}
      />

      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <table className="min-w-full divide-y divide-gray-300">
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="relative py-3.5 pl-3 pr-4 sm:pr-0"
                  ></th>
                  <th
                    scope="col"
                    className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0"
                  >
                    Name
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                  >
                    Due Date
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                  >
                    Owners
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {clientSafeRequests.map((request) => (
                  <RequestRow request={request} key={request.id} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
