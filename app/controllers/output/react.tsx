import clsx from 'clsx';
import dedent from 'dedent';

import {
  buildBalanceSheet,
  buildStatementOfOperations,
  BuildTableRowArgs,
  tableMap,
} from '@/controllers/financial-statement/table';
import { humanToKebab, ppCurrency } from '@/lib/util';
import { AuditId } from '@/types';
import { getAuditData } from '../audit';
import {
  getOrganizationSections,
  getPolicySections,
} from '../financial-statement/template';

import type { AuditData } from '@/controllers/audit';
import type { Section } from '@/controllers/financial-statement/template';
import type { Row, Table } from '@/lib/table';

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
    <div className="font-serif">
      <div className="max-w-3xl mb-4 border rounded-md p-4">
        <h1 className="text-lg font-bold">{data.basicInfo.businessName}</h1>
        <div>Conslidated Financial Statements</div>
        <div>Year Ended {data.fiscalYearEnd}</div>
      </div>

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
        <h2 className="text-lg font-bold">1. Consolidated Balance Sheet</h2>

        {buildTable2(await buildBalanceSheet(data))}
      </div>

      <div
        id="section-statement-of-operations"
        className="max-w-3xl mb-4 border rounded-md p-4"
      >
        <h2 className="text-lg font-bold">
          2. Consolidated Statement of Operations
        </h2>

        {buildTable(await buildStatementOfOperations(data))}
      </div>

      <div
        id="section-balance-sheet"
        className="max-w-3xl mb-4 border rounded-md p-4"
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
        className="max-w-3xl mb-4 border rounded-md p-4"
      >
        <h2 className="text-lg font-bold">
          4. Conslidated Statement of Cash Flows
        </h2>

        {/* <table className="w-full mt-2">
          <tbody>TODO</tbody>
        </table> */}
      </div>

      <div id="section-org" className="max-w-3xl mb-4 border rounded-md p-4">
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

      <div id="section-policy" className="max-w-3xl mb-4 border rounded-md p-4">
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
function buildTable2(table: Table): React.ReactNode {
  return (
    <table className="w-full mt-2" key="12345">
      <tbody>{table.rows.map((row: Row) => buildTableRow2(row))}</tbody>
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

function buildTableRow2(row: Row): React.ReactNode {
  return (
    <tr key={row.number} className={row.number % 2 === 0 ? 'bg-slate-100' : ''}>
      {row.cells.map((cell, idx) => {
        const styles = clsx({
          'font-bold': cell.style.bold,
          // Bug in Tailwind: specific borders don't map
          'border-b border-b-slate-800': cell.style.borderBottom === 'single',
          'border-b border-double border-b-2 border-b-slate-800':
            cell.style.borderBottom === 'double',
          'border-t border-t-slate-800': cell.style.borderTop === 'single',
          'border-t border-double border-t-slate-800':
            cell.style.borderTop === 'double',
          'pl-4': cell.style.indent,
          'pt-2': cell.style.padTop,
          'text-right': cell.style.align === 'right',
        });
        console.log(styles);
        let value;

        if (typeof cell.value === 'number' && cell.style.numFmt) {
          if (cell.style.numFmt === 'accounting') {
            value = (
              <div className="flex justify-between">
                <div>
                  {cell.value !== 0 && !cell.style.hideCurrency ? '$' : ''}
                </div>
                <div>{ppCurrency(cell.value, false, false)}</div>
              </div>
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
