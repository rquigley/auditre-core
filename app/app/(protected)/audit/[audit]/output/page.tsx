import clsx from 'clsx';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { getByIdForClient } from '@/controllers/audit';
import { getAuditData } from '@/controllers/audit-output';
import { getAllByAuditId } from '@/controllers/document';
import { getCurrent } from '@/controllers/session-user';
import { AuditHeader } from '../audit-header';
import DataModal from './data-modal';
import Row from './row';
import { ViewDataButton } from './view-data-button';

export default async function AuditPage({
  params: { audit: id },
}: {
  params: { audit: string };
}) {
  const user = await getCurrent();
  const audit = await getByIdForClient(id);
  if (audit.orgId !== user.orgId) {
    return notFound();
  }

  const documents = await getAllByAuditId(id);

  return (
    <>
      <AuditHeader audit={audit} />

      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <table className="min-w-full divide-y divide-gray-300">
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="py-3.5 pl-4 sm:pl-2 pr-3 text-left text-sm font-semibold text-gray-900"
                  >
                    Name
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                  >
                    Created
                  </th>
                  {/* <th
                    scope="col"
                    className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                  >
                    Last modified
                  </th> */}

                  <th
                    scope="col"
                    className="pr-4 sm:pr-2 py-3.5 text-right text-sm font-semibold text-gray-900"
                  >
                    Uploaded
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {documents.map((document) => (
                  <Row
                    auditId={audit.id}
                    document={document}
                    key={document.id}
                  />
                ))}
              </tbody>
            </table>

            <div className="mt-4 flex">
              <ViewDataButton />
              <a
                type="button"
                href={`/audit/${audit.id}/generate`}
                className="rounded-full bg-white px-3.5 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              >
                Generate Financial Statement
              </a>
            </div>
          </div>
        </div>
        <DataModal>
          <Suspense fallback={null}>
            <AuditData auditId={audit.id} />
          </Suspense>
        </DataModal>
      </div>
    </>
  );
}

async function AuditData({ auditId }: { auditId: string }) {
  const auditData = await getAuditData(auditId);
  return (
    <div className="w-full h-full">
      Data:
      <br />
      {/* {data ? JSON.stringify(data) : null} */}
      {auditData
        ? Object.keys(auditData).map((key) => {
            return <RequestType key={key} name={key} data={auditData[key]} />;
          })
        : null}
    </div>
  );
}

function RequestType({
  name,
  data,
}: {
  name: string;
  data: Record<string, any>;
}) {
  return (
    <div className="my-4">
      <div className="font-semibold text-sm">{name}</div>
      <ul>
        {Object.keys(data).map((requestId) => (
          <RowValOutput
            key={requestId}
            name={requestId}
            val={data[requestId]}
          />
        ))}
      </ul>
    </div>
  );
}

function RowValOutput({ name, val }: { name: string; val: unknown }) {
  let out = '';
  let isMissing = false;
  if (val === null) {
    out = 'null';
    isMissing = true;
  } else if (
    typeof val == 'object' &&
    // @ts-expect-error
    val?.isDocuments === true
  ) {
    // @ts-expect-error
    if (val.documentIds.length === 0) {
      isMissing = true;
    }
    // @ts-expect-error
    out = val.documentIds.join(',');
  } else if (val === '' || val === undefined) {
    isMissing = true;
  } else {
    out = val.toString();
  }

  return (
    <li className={clsx(isMissing ? 'text-red-600' : '')}>
      {name}: {isMissing ? 'MISSING' : out}
    </li>
  );
}
