import clsx from 'clsx';
import dedent from 'dedent';
import { notFound } from 'next/navigation';

import { getAuditData, getByIdForClientCached } from '@/controllers/audit';
import {
  buildBalanceSheet,
  buildStatementOfOperations,
  BuildTableRowArgs,
  tableMap,
} from '@/controllers/financial-statement/table';
import {
  getOrganizationSections,
  getPolicySections,
} from '@/controllers/financial-statement/template';
import { getCurrent } from '@/controllers/session-user';
import { humanToKebab, ppCurrency } from '@/lib/util';
import DataModal from './data-modal';
import { ShowChangesToggle } from './show-changes-toggle';
import { ViewDataButton } from './view-data-button';

import type { AuditData } from '@/controllers/audit';
import type { Section } from '@/controllers/financial-statement/template';

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

  const orgSettings = getOrganizationSections();
  const policySettings = getPolicySections();

  const data = await getAuditData(auditId);
  const highlightData = searchParams['show-changes'] === '1';

  return (
    <div className="m-5">
      <div className="mb-4 flex space-x-7">
        <ViewDataButton />
        <ShowChangesToggle />
      </div>

      <div className="max-w-3xl mb-4 border rounded-md p-4 font-serif">
        <h1 className="text-lg font-bold">{data.basicInfo.businessName}</h1>
        <div>Conslidated Financial Statements</div>
        <div>Year Ended {data.fiscalYearEnd}</div>
      </div>

      <div className="max-w-3xl mb-4 border rounded-md p-4 font-serif">
        <h2 className="text-lg font-bold">Contents</h2>

        <TableOfContents
          orgSettings={orgSettings}
          policySettings={policySettings}
          data={data}
          highlightData={highlightData}
        />
      </div>

      <div
        id="section-balance-sheet"
        className="max-w-3xl mb-4 border rounded-md p-4 font-serif"
      >
        <h2 className="text-lg font-bold">1. Consolidated Balance Sheet</h2>

        {buildTable(buildBalanceSheet(data))}
      </div>

      <div
        id="section-statement-of-operations"
        className="max-w-3xl mb-4 border rounded-md p-4 font-serif"
      >
        <h2 className="text-lg font-bold">
          2. Consolidated Statement of Operations
        </h2>

        {buildTable(buildStatementOfOperations(data))}
      </div>

      <div
        id="section-balance-sheet"
        className="max-w-3xl mb-4 border rounded-md p-4 font-serif"
      >
        <h2 className="text-lg font-bold">
          3. Conslidated Statement of Stockholders&apos; Equity (Deficit)
        </h2>

        {/* <table className="w-full mt-2">
          <tbody>TODO</tbody>
        </table> */}
      </div>

      <div
        id="section-balance-sheet"
        className="max-w-3xl mb-4 border rounded-md p-4 font-serif"
      >
        <h2 className="text-lg font-bold">
          4. Conslidated Statement of Cash Flows
        </h2>

        {/* <table className="w-full mt-2">
          <tbody>TODO</tbody>
        </table> */}
      </div>

      <div
        id="section-org"
        className="max-w-3xl mb-4 border rounded-md p-4 font-serif"
      >
        <h2 className="text-lg font-bold">5. Organization</h2>
        {orgSettings.map((section, idx) => (
          <DataSection
            section={section}
            data={data}
            highlightData={highlightData}
            key={idx}
          />
        ))}
      </div>

      <div
        id="section-policy"
        className="max-w-3xl mb-4 border rounded-md p-4 font-serif"
      >
        <h2 className="text-lg font-bold">
          6. Summary of Significant Accounting Policies
        </h2>
        {policySettings.map((section, idx) => (
          <DataSection
            section={section}
            data={data}
            highlightData={highlightData}
            key={idx}
          />
        ))}
      </div>

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

async function DataSection({
  section,
  data,
  highlightData,
}: {
  section: Section;
  data: AuditData;
  highlightData: boolean;
}) {
  if (!section.isShowing(data)) {
    if (highlightData) {
      return (
        <div
          id={humanToKebab(section.header)}
          className="my-4 font-bold text-green-600"
        >
          {section.header} (Not showing)
        </div>
      );
    } else {
      return null;
    }
  }

  const input = dedent(await section.body(data));
  const output: React.ReactNode[] = [];
  let lastIndex = 0;
  const regex = /\[(.*?)\]|\n/g;

  let match;
  while ((match = regex.exec(input)) !== null) {
    if (lastIndex < match.index) {
      output.push(input.slice(lastIndex, match.index));
    }

    if (match[0] === '\n') {
      output.push(<br key={match.index} />);
    } else if (match[1].startsWith('TABLE:')) {
      const mapKey = match[1].slice(6);
      if (mapKey in tableMap) {
        const tableBuildFn = tableMap[mapKey as keyof typeof tableMap];
        output.push(
          <span key={mapKey}> {buildTable(await tableBuildFn(data))}</span>,
        );
      } else {
        throw new Error(`Unknown table: ${mapKey}`);
      }
    } else {
      output.push(
        <span
          key={match.index}
          className={highlightData ? 'text-green-600' : ''}
        >
          {match[1]}
        </span>,
      );
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < input.length) {
    output.push(input.slice(lastIndex));
  }

  return (
    <div className="my-4">
      <div id={humanToKebab(section.header)} className="font-bold text-black">
        {section.header}
      </div>
      <div className="text-gray-700">{output}</div>
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

function buildTable(arr: BuildTableRowArgs[]): React.ReactNode {
  return (
    <table className="w-full mt-2" key="12345">
      <tbody>
        {arr
          .map((row: BuildTableRowArgs, idx: number) => {
            return buildTableRow({
              ...row,
              key: idx,
            });
          })
          .filter((x) => x !== null)}
      </tbody>
    </table>
  );
}

function buildTableRow({
  name,
  value,
  bold,
  indent,
  borderBottom,
  padTop,
  key,
  hideIfZero,
}: BuildTableRowArgs): React.ReactNode {
  if (hideIfZero && typeof value === 'number' && value === 0) {
    return null;
  }

  return (
    <tr
      key={key}
      className={clsx(
        padTop ? 'pt-4' : '',
        borderBottom ? 'border-b' : '',
        bold ? 'font-bold' : '',
      )}
    >
      <td className={clsx(indent ? 'pl-4' : '')}>{name}</td>
      <td className="text-right">
        {value && typeof value === 'number' ? ppCurrency(value) : value}
      </td>
    </tr>
  );
}

function TableOfContents({
  data,
  orgSettings,
  policySettings,
  highlightData,
}: {
  data: AuditData;
  orgSettings: Section[];
  policySettings: Section[];
  highlightData: boolean;
}) {
  return (
    <div className="flex-col">
      <a
        href="#section-balance-sheet"
        className="block text-slate-700 underline hover:no-underline"
      >
        1. Consolidated Balance Sheet
      </a>
      <a
        href="#section-statement-of-operations"
        className="block text-slate-700 underline hover:no-underline"
      >
        2. Consolidated Statement of Operations
      </a>
      <a
        href="#section-statement-of-operations"
        className="block text-slate-700 underline hover:no-underline"
      >
        3. Conslidated Statement of Stockholders&apos; Equity (Deficit)
      </a>
      <a
        href="#section-statement-of-operations"
        className="block text-slate-700 underline hover:no-underline"
      >
        4. Conslidated Statement of Cash Flows
      </a>
      <a
        href="#section-org"
        className="block text-slate-700 underline hover:no-underline"
      >
        5. Organization
      </a>
      {orgSettings.map((section, idx) => (
        <ToCLink
          key={idx}
          section={section}
          data={data}
          highlightData={highlightData}
        />
      ))}
      <a
        href="#2. section-policy"
        className="block text-slate-700 underline hover:no-underline"
      >
        6. Summary of Significant Accounting Policies
      </a>
      {policySettings.map((section, idx) => (
        <ToCLink
          key={idx}
          section={section}
          data={data}
          highlightData={highlightData}
        />
      ))}
    </div>
  );
}

function ToCLink({
  section,
  data,
  highlightData,
}: {
  section: Section;
  data: AuditData;
  highlightData: boolean;
}) {
  if (!section.isShowing(data)) {
    if (highlightData) {
      return (
        <a
          href={`#${humanToKebab(section.header)}`}
          className="ml-4 block  text-green-600 underline hover:no-underline"
        >
          {section.header} (Not showing)
        </a>
      );
    } else {
      return null;
    }
  }
  return (
    <a
      href={`#${humanToKebab(section.header)}`}
      className="ml-4 block text-slate-700 underline hover:no-underline"
    >
      {section.header}
    </a>
  );
}
