import clsx from 'clsx';
import { stripIndent } from 'common-tags';
import { notFound } from 'next/navigation';

import { getByIdForClientCached } from '@/controllers/audit';
import { getAuditData } from '@/controllers/audit-output';
import {
  getOrganizationSections,
  getPolicySections,
} from '@/controllers/financial-statement/template';
import { getCurrent } from '@/controllers/session-user';
import DataModal from './data-modal';
import { ViewDataButton } from './view-data-button';

import type { AuditData } from '@/controllers/audit-output';
import type { Section } from '@/controllers/financial-statement/template';

export default async function AuditPage({
  params: { audit: auditId },
}: {
  params: { audit: string };
}) {
  const user = await getCurrent();
  const audit = await getByIdForClientCached(auditId);
  if (audit.orgId !== user.orgId) {
    return notFound();
  }

  const orgSettings = getOrganizationSections();
  const policySettings = getPolicySections();

  const auditData = await getAuditData(auditId);

  return (
    <>
      <div className="mb-4">
        <ViewDataButton />
      </div>

      <div className="mb-4">
        <div className="font-lg">Organization</div>
        {orgSettings.map((section, idx) => (
          <div key={idx} className="my-4 text-sm">
            <div className="font-semibold">{section.header}</div>
            <div className="text-gray-700">
              {formatBodyText(section, auditData)}
            </div>
          </div>
        ))}
      </div>

      <div className="mb-4">
        <div className="font-lg">
          Summary of Significant Accounting Policies
        </div>
        {policySettings.map((section, idx) => (
          <div key={idx} className="my-4 text-sm">
            <div className="font-bold text-black">{section.header}</div>
            <div className="text-gray-700">
              {formatBodyText(section, auditData)}
            </div>
          </div>
        ))}
      </div>

      <DataModal>
        <div className="w-full h-full">
          Data:
          <br />
          {auditData
            ? Object.keys(auditData).map((key) => {
                return (
                  <RequestType key={key} name={key} data={auditData[key]} />
                );
              })
            : null}
        </div>
      </DataModal>
    </>
  );
}

function formatBodyText(section: Section, data: AuditData): React.ReactNode {
  if (!section.isShowing(data)) {
    return <span className="text-red-500">Not showing</span>;
  }

  const input = stripIndent(section.body(data));
  const output: (string | JSX.Element)[] = [];
  let lastIndex = 0;
  const regex = /\[(.*?)\]|\n/g;

  let match;
  while ((match = regex.exec(input)) !== null) {
    // Append the text before the bracket
    if (lastIndex < match.index) {
      output.push(input.slice(lastIndex, match.index));
    }

    // Check if the match is a newline character
    if (match[0] === '\n') {
      output.push(<br key={match.index} />);
    } else {
      // Append JSX span element
      output.push(
        <span key={match.index} className="text-yellow-500">
          {match[1]}
        </span>,
      );
    }

    lastIndex = regex.lastIndex;
  }

  // Append remaining text after the last match
  if (lastIndex < input.length) {
    output.push(input.slice(lastIndex));
  }

  return output;
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
