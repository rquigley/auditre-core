import clsx from 'clsx';
import { notFound } from 'next/navigation';

import { getAuditData, getByIdForClientCached } from '@/controllers/audit';
import { AuditPreview } from '@/controllers/output/react';
import { getCurrent } from '@/controllers/session-user';
import DataModal from './data-modal';
import { ShowChangesToggle } from './show-changes-toggle';
import { ViewDataButton } from './view-data-button';

export default async function AuditPage({
  params: { audit: auditId },
  searchParams,
}: {
  params: { audit: string };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const { user, authRedirect } = await getCurrent();
  if (!user) {
    return authRedirect();
  }
  const audit = await getByIdForClientCached(auditId);
  if (!audit || audit.orgId !== user.orgId) {
    return notFound();
  }

  const data = await getAuditData(auditId);
  const highlightData = searchParams['show-changes'] === '1';

  return (
    <div className="m-5">
      <div className="mb-4 flex space-x-7">
        <ViewDataButton />
        <ShowChangesToggle />
      </div>

      <AuditPreview auditId={auditId} highlightData={highlightData} />

      <DataModal>
        <div className="w-full h-full">
          Data:
          <br />
          {data
            ? Object.keys(data).map((key) => {
                return <RequestType key={key} name={key} data={data[key]} />;
              })
            : null}
        </div>
      </DataModal>
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
      {/* shortcuts added by us */}
      {typeof data === 'string' ? (
        <div>{data}</div>
      ) : (
        <ul>
          {Object.keys(data).map((requestId) => (
            <RowValOutput
              key={requestId}
              name={requestId}
              val={data[requestId]}
            />
          ))}
        </ul>
      )}
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
