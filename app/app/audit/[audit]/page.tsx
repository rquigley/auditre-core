//import { auth } from '@/auth';
// import { Suspense } from 'react';
// import { redirect } from 'next/navigation';
import { redirect } from 'next/navigation';
import { notFound } from 'next/navigation';
import { getAllByAuditId } from '@/controllers/request';
import { getCurrentUser } from '@/controllers/user';
import { getByExternalId } from '@/controllers/audit';
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
import Header from './header';
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

export default async function RequestsPage({ params: { audit: externalId } }) {
  const user = await getUser();

  const audit = await getByExternalId(externalId);
  console.log(externalId, audit, user);

  // TODO, how do we better enforce this across routes
  if (audit.orgId !== user.orgId) {
    notFound();
  }

  const requests = await getAllByAuditId(audit.id);
  console.log(audit.id, clientSafe(audit));

  return (
    <div className="sm:px-6 lg:px-8 bg-white rounded-sm py-3 px-3">
      <Header audit={clientSafe(audit)} />

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
                {requests.map((request) => (
                  <RequestRow request={request} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
