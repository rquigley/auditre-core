import {
  AlignmentType,
  BorderStyle,
  convertInchesToTwip,
  Document,
  Footer,
  HeadingLevel,
  HeightRule,
  PageBreak,
  PageNumber,
  Paragraph,
  StyleLevel,
  Table,
  TableCell,
  TableOfContents,
  TableRow,
  TextRun,
  UnderlineType,
  VerticalAlign,
  WidthType,
} from 'docx';

import { AuditData, getAuditData } from '@/controllers/audit';
import { fOut } from '@/lib/finance';
import { getParser } from '@/lib/parser';
import { ppCurrency, ppNumber } from '@/lib/util';
import {
  buildBalanceSheet,
  buildIncomeStatement,
  tableMap,
} from '../financial-statement/table';
import {
  getOrganizationSections,
  getPolicySections,
  sectionsToBody,
} from '../financial-statement/template';

import type { Template } from '../financial-statement/template';
import type { Parser } from '@/lib/formula-parser/index';
import type { Row as ARRow, Table as ARTable } from '@/lib/table';
import type { AuditId } from '@/types';

export async function generate(auditId: AuditId) {
  const data = await getAuditData(auditId);

  const document = new Document({
    title: 'My Document',
    creator: 'AuditRe',
    features: {
      updateFields: true,
    },
    styles: {
      default: {
        heading1: {
          run: {
            size: 28,
            bold: true,
            //italics: true,
            color: '111111',
          },
          paragraph: {
            spacing: {
              after: 120,
            },
          },
        },
        heading2: {
          run: {
            size: 24,
            bold: true,
            // underline: {
            //   type: UnderlineType.DOUBLE,
            //   color: '111111',
            // },
          },
          paragraph: {
            spacing: {
              before: 240,
              after: 120,
            },
          },
        },
        listParagraph: {
          run: {
            color: '#FF0000',
          },
        },
        document: {
          run: {
            size: '11pt',
            font: 'Time',
          },
          paragraph: {
            alignment: AlignmentType.LEFT,
          },
        },
      },
      paragraphStyles: [
        {
          id: 'aside',
          name: 'Aside',
          basedOn: 'Normal',
          next: 'Normal',
          run: {
            color: '999999',
            italics: true,
          },
          paragraph: {
            indent: {
              left: convertInchesToTwip(0.5),
            },
            spacing: {
              line: 276,
            },
          },
        },
        {
          id: 'wellSpaced',
          name: 'Well Spaced',
          basedOn: 'Normal',
          quickFormat: true,
          paragraph: {
            spacing: {
              line: 276,
              before: 20 * 72 * 0.1,
              after: 20 * 72 * 0.05,
            },
          },
        },
        {
          id: 'strikeUnderline',
          name: 'Strike Underline',
          basedOn: 'Normal',
          quickFormat: true,
          run: {
            strike: true,
            underline: {
              type: UnderlineType.SINGLE,
            },
          },
        },
      ],
      characterStyles: [
        {
          id: 'strikeUnderlineCharacter',
          name: 'Strike Underline',
          basedOn: 'Normal',
          quickFormat: true,
          run: {
            strike: true,
            underline: {
              type: UnderlineType.SINGLE,
            },
          },
        },
      ],
    },

    sections: [
      titlePage(data),
      tableOfContents(),
      independentAuditorsReport(data),
      await balanceSheet(data),
      await incomeStatement(data),
      await notes(data),
    ],
  });
  return {
    document,
    documentName: `Financial Statement - ${data.rt.basicInfo.businessName} - ${data.year}.docx`,
  };
}

function titlePage(data: AuditData) {
  return {
    ...getPageProperties(),
    children: [
      new Paragraph({
        text: data.rt.basicInfo.businessName,
        heading: HeadingLevel.HEADING_1,
      }),
      new Paragraph({
        text: 'Conslidated financial statements',
        //heading: HeadingLevel.HEADING_1,
      }),
      new Paragraph({
        text: `Year ended ${data.fiscalYearEnd}`,
        //heading: HeadingLevel.HEADING_1,
      }),
      new Paragraph({
        children: [new PageBreak()],
      }),
    ],
  };
}

function tableOfContents() {
  return {
    ...getPageProperties(),

    children: [
      new TableOfContents('Summary', {
        hyperlink: true,
        headingStyleRange: '1-5',
        stylesWithLevels: [new StyleLevel('MySpectacularStyle', 1)],
      }),
    ],
  };
}

function independentAuditorsReport(data: AuditData) {
  const t1 = new TextRun({
    text: '[Auditor to add opinion]',
    highlight: 'yellow',
  });
  return {
    ...getPageProperties(),

    children: [
      new Paragraph({
        text: "Independent auditor's report",
        heading: HeadingLevel.HEADING_1,
      }),
      new Paragraph({ children: [t1] }),
      new Paragraph({ children: [t1], pageBreakBefore: true }),
    ],
  };
}

async function balanceSheet(data: AuditData) {
  return {
    ...getPageProperties(),

    children: [
      new Paragraph({
        text: 'Consolidated balance sheet',
        heading: HeadingLevel.HEADING_1,
        pageBreakBefore: true,
      }),
      buildTable(buildBalanceSheet(data), data),
    ],
  };
}

async function incomeStatement(data: AuditData) {
  return {
    ...getPageProperties(),

    children: [
      new Paragraph({
        text: 'Consolidated statement of operations',
        heading: HeadingLevel.HEADING_1,
        pageBreakBefore: true,
      }),
      buildTable(buildIncomeStatement(data), data),
    ],
  };
}

async function notes(data: AuditData) {
  return {
    ...getPageProperties(),

    children: [
      new Paragraph({
        text: '1. Organization',
        heading: HeadingLevel.HEADING_1,
        pageBreakBefore: true,
      }),

      ...(await sectionsToBody(
        getOrganizationSections(),
        data,
        templateToParagraph,
      )),

      new Paragraph({
        text: '',
      }),
      new Paragraph({
        text: '2. Summary of significant accounting policies',
        heading: HeadingLevel.HEADING_1,
      }),

      ...(await sectionsToBody(getPolicySections(), data, templateToParagraph)),
    ],
  };
}

function buildTable(table: ARTable, data: AuditData) {
  const parser = getParser(table, data);

  const t = new Table({
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
    },
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
    rows: table.rows.map((row) => buildTableRow(row, parser)).filter(Boolean),
  });

  return t;
}

function buildTableRow(row: ARRow, parser: Parser) {
  let hideRow = row.hasTag('hide-if-zero');

  const ret = new TableRow({
    children: row.cells.map((cell, idx) => {
      const borders = {
        top: {
          style:
            cell.style.borderTop === 'thin'
              ? BorderStyle.SINGLE
              : cell.style.borderTop === 'double'
                ? BorderStyle.DOUBLE
                : BorderStyle.NONE,
          size: 1,
          color: '000000',
        },
        bottom: {
          style:
            cell.style.borderBottom === 'thin'
              ? BorderStyle.SINGLE
              : cell.style.borderBottom === 'double'
                ? BorderStyle.DOUBLE
                : BorderStyle.NONE,
          size: 1,
          color: '000000',
        },
        left: {
          style: BorderStyle.NONE,
          size: 1,
          color: '000000',
        },
        right: {
          style: BorderStyle.NONE,
          size: 1,
          color: '#000000',
        },
      };
      let value;

      if (typeof cell.value === 'string' && cell.value.startsWith('=')) {
        const parsed = parser.parse(cell.value.substring(1), cell.address);
        if (parsed.error) {
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

      if (typeof value === 'number' && cell.style.numFmt) {
        const numConfig = cell.style.numFmt;
        const numFmt =
          typeof numConfig === 'object' ? numConfig.type : numConfig;
        const showCents =
          typeof numConfig === 'object' ? numConfig.cents ?? false : false;

        if (numFmt === 'accounting' || numFmt === 'currency') {
          value = ppCurrency(fOut(value), {
            cents: showCents,
            hideCurrency: cell.style.hideCurrency,
          });
        } else if (numFmt === 'number') {
          value = ppNumber(value);
        } else {
          value = `${numFmt} NOT IMPLEMENTED`;
        }
      } else if (typeof value !== 'string') {
        throw new Error(`Invalid value type: ${value}, type: ${typeof value}`);
      }

      return new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: `${cell.style.indent && idx === 0 ? '   '.repeat(cell.style.indent) : ''}${value}`,
                bold: cell.style.bold,
              }),
            ],
            alignment:
              cell.style.align === 'right'
                ? AlignmentType.RIGHT
                : AlignmentType.LEFT,
          }),
        ],

        verticalAlign: VerticalAlign.BOTTOM,
        borders,
      });
    }),

    height: row.style.padTop
      ? { value: convertInchesToTwip(0.3), rule: HeightRule.EXACT }
      : undefined,
  });

  return hideRow ? null : ret;
}

function getPageProperties() {
  return {
    properties: {
      // page: {
      //   pageNumbers: {
      //     start: 1,
      //     formatType: NumberFormat.DECIMAL,
      //   },
      // },
    },
    footers: {
      default: new Footer({
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                children: ['Page ', PageNumber.CURRENT],
              }),
            ],
          }),
        ],
      }),
    },
  };
}

function formatBodyText(text: string, highlightChanges = false) {
  const textRuns = [];
  let buffer = '';
  let insideBracket = false;

  for (const char of text) {
    if (char === '[') {
      if (buffer.length > 0) {
        textRuns.push(new TextRun(buffer));
      }
      buffer = highlightChanges ? char : '';
      insideBracket = true;
    } else if (char === ']') {
      if (highlightChanges) {
        buffer += char;
        textRuns.push(new TextRun({ text: buffer, highlight: 'yellow' }));
      } else {
        textRuns.push(new TextRun({ text: buffer }));
      }
      buffer = '';
      insideBracket = false;
    } else {
      buffer += char;
      if (insideBracket === false && char === ' ') {
        textRuns.push(new TextRun(buffer));
        buffer = '';
      }
    }
  }

  if (buffer.length > 0) {
    textRuns.push(new TextRun(buffer));
  }

  return textRuns;
}

async function templateToParagraph(
  template: Template & { pageBreakBefore?: boolean; data: AuditData },
) {
  const ret: Array<Paragraph | Table> = [
    new Paragraph({
      text: template.header,
      heading: HeadingLevel.HEADING_2,
      pageBreakBefore: template.pageBreakBefore,
    }),
  ];
  const paragraphs = template.body.split('\n');

  for (const p of paragraphs) {
    if (p.startsWith('[TABLE:')) {
      const mapKey = p.match(/\[TABLE:(.*)\]/)?.[1];
      if (!mapKey || mapKey in tableMap === false) {
        throw new Error(`Unknown table: ${mapKey}`);
      }
      const tableBuildFn = tableMap[mapKey as keyof typeof tableMap];
      ret.push(buildTable(await tableBuildFn(template.data), template.data));
    } else {
      ret.push(new Paragraph({ children: formatBodyText(p) }));
    }
  }

  return ret;
}
