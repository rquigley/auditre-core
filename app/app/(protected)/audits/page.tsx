import { getById as getRequestById } from '@/controllers/request';
import { getAllByOrgId } from '@/controllers/audit';
import type { Document, ClientSafeDocument } from '@/types';
import { clientSafe } from '@/lib/util';
import Row from './row';
import { getCurrent } from '@/controllers/session-user';
import Header from '@/components/header';

export default async function AuditsPage() {
  const user = await getCurrent();
  const audits = await getAllByOrgId(user.orgId);

  for (const audit of audits) {
    // if (document.requestId) {
    //   const request = await getRequestById(document.requestId);
    //   const audit = await getAuditById(request.auditId);
    //   // @ts-ignore
    //   document.auditName = audit.name;
    //   // @ts-ignore
    //   document.requestName = request.name;
    // }
    // TODO: look into FF and dayjs date handling.
    // @ts-ignore
    audit.createdAt = audit.createdAt.toString();
  }
  // const clientSafeDocuments = clientSafe(documents) as ClientSafeDocument[] &
  //   {
  //     auditName?: string;
  //     requestName?: string;
  //   }[];

  return (
    <>
      <Header title="Audits" />
      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <table className="min-w-full divide-y divide-gray-300">
              <thead>
                <tr>
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
                    Year
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                  >
                    Created
                  </th>

                  <th
                    scope="col"
                    className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                  >
                    Progress
                  </th>
                  <th
                    scope="col"
                    className=" py-3.5 text-right text-sm font-semibold text-gray-900"
                  >
                    Settings
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {audits.map((audit) => (
                  <Row audit={audit} key={audit.id} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
