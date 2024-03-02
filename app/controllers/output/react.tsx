import { XCircleIcon } from '@heroicons/react/20/solid';
import clsx from 'clsx';
import dedent from 'dedent';
import { Inconsolata } from 'next/font/google';

import {
  buildBalanceSheet,
  buildCashFlows,
  buildIncomeStatement,
  buildStockholderEquity,
  tableMap,
} from '@/controllers/financial-statement/table';
import { fOut } from '@/lib/finance';
import { getParser } from '@/lib/parser';
import { ppCurrency, ppNumber } from '@/lib/util';
import { AuditId } from '@/types';
import { getAuditData, getWarningsForAudit } from '../audit';
import {
  getOrganizationSections,
  getPolicySections,
} from '../financial-statement/template';

import type { AuditData } from '@/controllers/audit';
import type { Section } from '@/controllers/financial-statement/template';
import type { Parser } from '@/lib/formula-parser/index';
import type { Row, Table } from '@/lib/table';

const financeFont = Inconsolata({
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
  const warnings = getWarningsForAudit(data);

  return (
    <div className="text-sm text-slate-800 max-w-5xl">
      {warnings.length > 0 && <Warning warnings={warnings} />}

      <div className="rounded-md p-4">
        <h1 className="text-lg font-bold">{data.rt.basicInfo.businessName}</h1>
        <div>Conslidated financial statements</div>
        <div>Year ended {data.fiscalYearEnd}</div>
      </div>

      <div className="max-w-5xl mb-4  rounded-md p-4">
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
        className="max-w-5xl mb-4 border rounded-md p-4"
      >
        <h2 className="text-lg font-bold">
          <a href="#section-balance-sheet" className="group relative">
            1. Consolidated balance sheet
            <Paperclip />
          </a>
        </h2>

        {buildTable(buildBalanceSheet(data), data)}
      </div>

      <div
        id="section-income-statement"
        className="max-w-5xl mb-4 border rounded-md p-4"
      >
        <h2 className="text-lg font-bold">
          <a href="#section-income-statement" className="group relative">
            2. Consolidated statement of operations
            <Paperclip />
          </a>
        </h2>

        {buildTable(buildIncomeStatement(data), data)}
      </div>

      <div id="section-sose" className="max-w-5xl mb-4 border rounded-md p-4">
        <h2 className="text-lg font-bold">
          <a href="#section-sose" className="group relative">
            3. Conslidated statement of stockholders&apos; equity (deficit)
            <Paperclip />
          </a>
        </h2>

        {buildTable(buildStockholderEquity(data), data)}
      </div>

      <div id="section-socf" className="max-w-5xl mb-4 border rounded-md p-4">
        <h2 className="text-lg font-bold">
          <a href="#section-socf" className="group relative">
            4. Conslidated statement of cash flows
            <Paperclip />
          </a>
        </h2>

        {buildTable(buildCashFlows(data), data)}
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
            6. Summary of significant accounting policies
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
          <span key={mapKey}>
            {' '}
            {buildTable(await tableBuildFn(data), data)}
          </span>,
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
        className="size-4 inline"
      >
        <path d="M12.232 4.232a2.5 2.5 0 013.536 3.536l-1.225 1.224a.75.75 0 001.061 1.06l1.224-1.224a4 4 0 00-5.656-5.656l-3 3a4 4 0 00.225 5.865.75.75 0 00.977-1.138 2.5 2.5 0 01-.142-3.667l3-3z" />
        <path d="M11.603 7.963a.75.75 0 00-.977 1.138 2.5 2.5 0 01.142 3.667l-3 3a2.5 2.5 0 01-3.536-3.536l1.225-1.224a.75.75 0 00-1.061-1.06l-1.224 1.224a4 4 0 105.656 5.656l3-3a4 4 0 00-.225-5.865z" />
      </svg>
    </span>
  );
}

function buildTable(table: Table, data: AuditData): React.ReactNode {
  const parser = getParser(table, data);

  return (
    <table className="w-full mt-2" key="12345">
      <tbody>
        {table.rows.map((row: Row) => buildTableRow(row, data, parser))}
      </tbody>
    </table>
  );
}

function buildTableRow(
  row: Row,
  data: AuditData,
  parser: Parser,
): React.ReactNode {
  // If tagged for hiding, allow any non-zero cell (including formulae) to show the row.
  let hideRow = row.hasTag('hide-if-zero');

  const ret = (
    <tr key={row.rowNum} className={row.rowNum % 2 === 0 ? 'bg-slate-100' : ''}>
      {row.cells.map((cell, idx) => {
        let value;
        if (typeof cell.value === 'string' && cell.value.startsWith('=')) {
          const parsed = parser.parse(cell.value.substring(1), cell.address);
          if (parsed.error) {
            console.log('Error parsing cell', {
              table: cell.table.name,
              address: cell.address,
              value: cell.value,
              error: parsed.error,
            });
            value = `Error: ${parsed.error}`;
            hideRow = false;
          } else {
            value = parsed.result;
            if (value !== 0) {
              hideRow = false;
            }
          }
        } else {
          value = cell.value;
        }

        // At this point, all formulae have been evaluated
        if (typeof value === 'number' && cell.style.numFmt) {
          const numConfig = cell.style.numFmt;
          const numFmt =
            typeof numConfig === 'object' ? numConfig.type : numConfig;
          const showCents =
            typeof numConfig === 'object' ? numConfig.cents ?? false : false;

          if (numFmt === 'accounting') {
            value = (
              <span className={`flex justify-between ${financeFont.className}`}>
                <span className="pl-5">
                  {value !== 0 && !cell.style.hideCurrency ? '$' : ''}
                </span>
                <span>
                  {ppCurrency(fOut(value), {
                    cents: showCents,
                    hideCurrency: true,
                  })}
                </span>
              </span>
            );
          } else if (numFmt === 'currency') {
            value = (
              <span className={financeFont.className}>
                {ppCurrency(fOut(value), {
                  cents: showCents,
                  hideCurrency: cell.style.hideCurrency,
                })}
              </span>
            );
          } else if (numFmt === 'number') {
            value = (
              <span className={`${financeFont.className}`}>
                {ppNumber(value)}
              </span>
            );
          } else {
            value = `${numFmt} NOT IMPLEMENTED`;
          }
        } else if (typeof value !== 'string') {
          throw new Error(
            `Invalid value type: ${value}, type: ${typeof value}`,
          );
        }

        // Indentation only applies to the first cell in a row
        const indentStyles =
          idx === 0
            ? {
                'pl-4': cell.style.indent === 1,
                'pl-8': cell.style.indent === 2,
                'pl-12': cell.style.indent === 3,
                'pl-16': cell.style.indent === 4,
              }
            : {};
        const styles = clsx({
          'font-bold': cell.style.bold,
          'border-b border-b-slate-600': cell.style.borderBottom === 'thin',
          'border-b border-double border-b-2 border-b-slate-600':
            cell.style.borderBottom === 'double',
          'border-t border-t-slate-600': cell.style.borderTop === 'thin',
          'border-t border-double border-t-slate-600':
            cell.style.borderTop === 'double',
          ...indentStyles,
          'pt-2': cell.style.padTop,
          'text-right': cell.style.align === 'right',
          'text-xs': cell.style.textSize === 'xs',
          'p-0.5': true,
        });

        return (
          <td className={styles} key={idx}>
            {value}
          </td>
        );
      })}
    </tr>
  );

  return hideRow ? null : ret;
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
        1. Consolidated balance sheet
      </a>
      <a
        href="#section-income-statement"
        className="block text-slate-700 underline hover:no-underline"
      >
        2. Consolidated statement of operations
      </a>
      <a
        href="#section-income-statement"
        className="block text-slate-700 underline hover:no-underline"
      >
        3. Conslidated statement of stockholders&apos; equity (deficit)
      </a>
      <a
        href="#section-income-statement"
        className="block text-slate-700 underline hover:no-underline"
      >
        4. Conslidated statement of cash flows
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
        6. Summary of significant accounting policies
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

function Warning({
  warnings,
}: {
  warnings: {
    previewSection: string;
    previewUrl: string;
    message: string;
  }[];
}) {
  return (
    <div className="rounded-md bg-red-50 p-4 my-4 max-w-3xl">
      <div className="flex">
        <div className="flex-shrink-0">
          <XCircleIcon className="size-5 text-red-400" aria-hidden="true" />
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">
            There are errors:
          </h3>
          <div className="mt-2 text-sm text-red-700">
            <ul role="list" className="list-disc space-y-4 pl-5">
              {warnings.map((warning, idx) => (
                <li key={idx}>
                  <span>
                    <a
                      href={warning.previewUrl}
                      className="underline hover:no-underline"
                    >
                      {warning.previewSection}
                    </a>
                    <br />
                    {warning.message}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
