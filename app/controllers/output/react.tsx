import { XCircleIcon } from '@heroicons/react/20/solid';
import clsx from 'clsx';
import dedent from 'dedent';
import { Inconsolata } from 'next/font/google';

import {
  buildBalanceSheet,
  buildStatementOfOperations,
  tableMap,
} from '@/controllers/financial-statement/table';
import { ppCurrency, ppNumber } from '@/lib/util';
import { AuditId } from '@/types';
import { getAuditData } from '../audit';
import {
  getOrganizationSections,
  getPolicySections,
} from '../financial-statement/template';

import type { AuditData } from '@/controllers/audit';
import type { Section } from '@/controllers/financial-statement/template';
import type { Row, Table } from '@/lib/table';

export const financeFont = Inconsolata({
  subsets: ['latin'],
  display: 'swap',
});

export async function AuditPreview({
  auditId,
  highlightData,
}: {
  auditId: AuditId;
  highlightData: boolean;
}) {
  const orgSettings = getOrganizationSections();
  const policySettings = getPolicySections();

  const data = await getAuditData(auditId);
  return (
    <div className="text-sm text-slate-800 max-w-3xl">
      <div className=" mb-4 border rounded-md p-4">
        <h1 className="text-lg font-bold">{data.basicInfo.businessName}</h1>
        <div>Conslidated Financial Statements</div>
        <div>Year Ended {data.fiscalYearEnd}</div>
      </div>

      <Warning
        messages={[
          <span key="1">
            <a
              href="#section-balance-sheet"
              className="underline hover:no-underline"
            >
              Consolidated Balance Sheet
            </a>
            : Total assets don&apos;t equal total liabilities and
            stockholders&apos; deficit
          </span>,
        ]}
      />

      <div className="max-w-3xl mb-4 border rounded-md p-4">
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
        className="max-w-3xl mb-4 border rounded-md p-4"
      >
        <h2 className="text-lg font-bold">
          <a href="#section-balance-sheet" className="group relative">
            1. Consolidated Balance Sheet
            <Paperclip />
          </a>
        </h2>

        {buildTable(await buildBalanceSheet(data))}
      </div>

      <div
        id="section-statement-of-operations"
        className="max-w-3xl mb-4 border rounded-md p-4"
      >
        <h2 className="text-lg font-bold">
          <a href="#section-statement-of-operations" className="group relative">
            2. Consolidated Statement of Operations
            <Paperclip />
          </a>
        </h2>

        {buildTable(await buildStatementOfOperations(data))}
      </div>

      <div id="section-sose" className="max-w-3xl mb-4 border rounded-md p-4">
        <h2 className="text-lg font-bold">
          <a href="#section-sose" className="group relative">
            3. Conslidated Statement of Stockholders&apos; Equity (Deficit)
            <Paperclip />
          </a>
        </h2>

        {/* <table className="w-full mt-2">
          <tbody>TODO</tbody>
        </table> */}
      </div>

      <div id="section-socf" className="max-w-3xl mb-4 border rounded-md p-4">
        <h2 className="text-lg font-bold">
          <a href="#section-socf" className="group relative">
            4. Conslidated Statement of Cash Flows
            <Paperclip />
          </a>
        </h2>

        {/* <table className="w-full mt-2">
          <tbody>TODO</tbody>
        </table> */}
      </div>

      <div id="section-org" className="max-w-3xl mb-4 border rounded-md p-4">
        <h2 className="text-lg font-bold">
          <a href="#section-org" className="group relative">
            5. Organization
            <Paperclip />
          </a>
        </h2>
        {orgSettings.map((section, idx) => (
          <DataSection
            section={section}
            data={data}
            highlightData={highlightData}
            key={idx}
            idx={idx}
          />
        ))}
      </div>

      <div id="section-policy" className="max-w-3xl mb-4 border rounded-md p-4">
        <h2 className="text-lg font-bold">
          <a href="#section-policy" className="group relative">
            6. Summary of Significant Accounting Policies
            <Paperclip />
          </a>
        </h2>
        {policySettings.map((section, idx) => (
          <DataSection
            section={section}
            data={data}
            highlightData={highlightData}
            key={idx}
            idx={idx}
          />
        ))}
      </div>
    </div>
  );
}

async function DataSection({
  section,
  data,
  highlightData,
  idx,
}: {
  section: Section;
  data: AuditData;
  highlightData: boolean;
  idx: number;
}) {
  if (!section.isShowing(data)) {
    if (highlightData) {
      return (
        <div
          id={`${idx}-${section.slug}`}
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
      <a
        id={`${idx}-${section.slug}`}
        href={`#${idx}-${section.slug}`}
        className="block font-bold text-gray-900 group relative"
      >
        {section.header}
        <Paperclip />
      </a>

      <div className="text-gray-700">{output}</div>
    </div>
  );
}

// Parent should have "group" and "relative" classes
function Paperclip() {
  return (
    <span className="absolute -left-6 hidden group-hover:inline text-slate-600 font-normal">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-4 h-4 inline"
      >
        <path d="M12.232 4.232a2.5 2.5 0 013.536 3.536l-1.225 1.224a.75.75 0 001.061 1.06l1.224-1.224a4 4 0 00-5.656-5.656l-3 3a4 4 0 00.225 5.865.75.75 0 00.977-1.138 2.5 2.5 0 01-.142-3.667l3-3z" />
        <path d="M11.603 7.963a.75.75 0 00-.977 1.138 2.5 2.5 0 01.142 3.667l-3 3a2.5 2.5 0 01-3.536-3.536l1.225-1.224a.75.75 0 00-1.061-1.06l-1.224 1.224a4 4 0 105.656 5.656l3-3a4 4 0 00-.225-5.865z" />
      </svg>
    </span>
  );
}

function buildTable(table: Table): React.ReactNode {
  return (
    <table className="w-full mt-2" key="12345">
      <tbody>{table.rows.map((row: Row) => buildTableRow(row))}</tbody>
    </table>
  );
}

function buildTableRow(row: Row): React.ReactNode {
  if (row.hasTag('hide-if-zero')) {
    const hasNonZeroValues = row.cells.some(
      (cell) => typeof cell.value === 'number' && cell.value !== 0,
    );
    if (!hasNonZeroValues) {
      return null;
    }
  }
  return (
    <tr key={row.number} className={row.number % 2 === 0 ? 'bg-slate-100' : ''}>
      {row.cells.map((cell, idx) => {
        const styles = clsx({
          'font-bold': cell.style.bold,
          'border-b border-b-slate-600': cell.style.borderBottom === 'thin',
          'border-b border-double border-b-2 border-b-slate-600':
            cell.style.borderBottom === 'double',
          'border-t border-t-slate-600': cell.style.borderTop === 'thin',
          'border-t border-double border-t-slate-600':
            cell.style.borderTop === 'double',
          'pl-4': cell.style.indent,
          'pt-2': cell.style.padTop,
          'text-right': cell.style.align === 'right',
        });

        let value;
        if (typeof cell.value === 'number' && cell.style.numFmt) {
          if (cell.style.numFmt === 'accounting') {
            value = (
              <div className={`flex justify-between ${financeFont.className}`}>
                <div className="pl-5">
                  {cell.value !== 0 && !cell.style.hideCurrency ? '$' : ''}
                </div>
                <div>
                  {ppCurrency(cell.value, { cents: false, hideCurrency: true })}
                </div>
              </div>
            );
          } else if (cell.style.numFmt === 'currency') {
            value = (
              <div className={financeFont.className}>
                {ppCurrency(cell.value, {
                  cents: false,
                  hideCurrency: cell.style.hideCurrency,
                })}
              </div>
            );
          } else if (cell.style.numFmt === 'number') {
            value = (
              <span className={`${financeFont.className}`}>
                {ppNumber(cell.value)}
              </span>
            );
          } else {
            value = `${cell.style.numFmt} NOT IMPLEMENTED`;
          }
        } else {
          value = cell.value;
        }
        return (
          <td className={styles} key={idx}>
            {value}
          </td>
        );
      })}
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
          idx={idx}
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
          idx={idx}
          section={section}
          data={data}
          highlightData={highlightData}
        />
      ))}
    </div>
  );
}

function ToCLink({
  idx,
  section,
  data,
  highlightData,
}: {
  idx: number;
  section: Section;
  data: AuditData;
  highlightData: boolean;
}) {
  if (!section.isShowing(data)) {
    if (highlightData) {
      return (
        <a
          href={`#${idx}-${section.slug}`}
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
      href={`#${idx}-${section.slug}`}
      className="ml-4 block text-slate-700 underline hover:no-underline"
    >
      {section.header}
    </a>
  );
}

function Warning({ messages }: { messages: React.ReactNode[] }) {
  return (
    <div className="rounded-md bg-red-50 p-4 my-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <XCircleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">
            There are errors:
          </h3>
          <div className="mt-2 text-sm text-red-700">
            <ul role="list" className="list-disc space-y-1 pl-5">
              {messages.map((msg, idx) => (
                <li key={idx}>{msg}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
