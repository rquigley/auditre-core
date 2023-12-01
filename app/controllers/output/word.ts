import { AuditData, getAuditData } from '@/controllers/audit';
import { ppCurrency } from '@/lib/util';
import {
  buildBalanceSheet,
  buildStatementOfOperations,
  BuildTableRowArgs,
  tableMap,
} from '../financial-statement/table';
import {
  getOrganizationSections,
  getPolicySections,
  sectionsToBody,
} from '../financial-statement/template';

import type { Template } from '../financial-statement/template';
import type { AuditId } from '@/types';

const {
  AlignmentType,
  BorderStyle,
  convertInchesToTwip,
  Document,
  Footer,
  HeadingLevel,
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
  HeightRule,
} = require('docx');

export async function generate(auditId: AuditId) {
  //const audit = await getAuditById(auditId);
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
      consolidatedFinancialStatements(data),
      consolidatedStatementOfOperations(data),
      await notes(data),
    ],
  });
  return {
    document,
    documentName: `Financial Statement - ${data.basicInfo.businessName} - ${data.auditInfo.year}.docx`,
  };
}

function titlePage(data: AuditData) {
  return {
    ...getPageProperties(),
    children: [
      new Paragraph({
        text: data.basicInfo.businessName,
        heading: HeadingLevel.HEADING_1,
      }),
      new Paragraph({
        text: 'Conslidated Financial Statements',
        //heading: HeadingLevel.HEADING_1,
      }),
      new Paragraph({
        text: `Year Ended ${data.fiscalYearEnd}`,
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
        text: "Independent Auditor's Report",
        heading: HeadingLevel.HEADING_1,
      }),
      new Paragraph({ children: [t1] }),
      new Paragraph({ children: [t1], pageBreakBefore: true }),
    ],
  };
}

function consolidatedFinancialStatements(data: AuditData) {
  return {
    ...getPageProperties(),

    children: [
      new Paragraph({
        text: 'Consolidated Balance Sheet',
        heading: HeadingLevel.HEADING_1,
        pageBreakBefore: true,
      }),
      buildTable(buildBalanceSheet(data)),
    ],
  };
}

function consolidatedStatementOfOperations(data: AuditData) {
  return {
    ...getPageProperties(),

    children: [
      new Paragraph({
        text: 'Consolidated Statement of Operations',
        heading: HeadingLevel.HEADING_1,
        pageBreakBefore: true,
      }),
      buildTable(buildStatementOfOperations(data)),
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
        text: '2. Summary of Significant Accounting Policies',
        heading: HeadingLevel.HEADING_1,
      }),

      ...(await sectionsToBody(getPolicySections(), data, templateToParagraph)),
    ],
  };
}

function buildTable(arr: BuildTableRowArgs[]) {
  const table = new Table({
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
    },
    columnWidths: [7505, 1505],
    rows: arr
      .map((row: BuildTableRowArgs, idx: number) => {
        return buildTableRow({
          ...row,
          key: idx,
        });
      })
      .filter((x) => x !== null),
  });

  return table;
}

function buildTableRow({
  name,
  value,
  bold,
  indent,
  borderBottom,
  padTop,
}: BuildTableRowArgs) {
  const borders = {
    top: {
      style: BorderStyle.NONE,
      size: 1,
      color: '000000',
    },
    bottom: {
      style: borderBottom ? BorderStyle.SINGLE : BorderStyle.NONE,
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

  const rowHeight = padTop
    ? { value: convertInchesToTwip(0.3), type: HeightRule.EXACT }
    : undefined;
  return new TableRow({
    children: [
      new TableCell({
        width: {
          size: 7505,
          type: WidthType.DXA,
        },
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: `${indent ? '   ' : ''}${name}`,
                bold,
              }),
            ],
          }),
        ],
        verticalAlign: VerticalAlign.BOTTOM,
        borders,
      }),
      new TableCell({
        width: {
          size: 1505,
          type: WidthType.DXA,
        },
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text:
                  value && typeof value === 'number'
                    ? ppCurrency(value)
                    : value,
                bold,
              }),
            ],
            alignment: AlignmentType.RIGHT,
          }),
        ],
        verticalAlign: VerticalAlign.BOTTOM,
        borders,
      }),
    ],
    height: rowHeight,
  });
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

function formatBodyText(text: string): (typeof TextRun)[] {
  const textRuns: (typeof TextRun)[] = [];
  let buffer = '';
  let insideBracket = false;

  for (const char of text) {
    if (char === '[') {
      if (buffer.length > 0) {
        textRuns.push(new TextRun(buffer));
      }
      buffer = char;
      insideBracket = true;
    } else if (char === ']') {
      buffer += char;
      textRuns.push(new TextRun({ text: buffer, highlight: 'yellow' }));
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

  // Add any remaining text outside the brackets
  if (buffer.length > 0) {
    textRuns.push(new TextRun(buffer));
  }

  return textRuns;
}

async function templateToParagraph(
  template: Template & { pageBreakBefore?: boolean; data: AuditData },
): Promise<Array<unknown>> {
  const ret = [
    new Paragraph({
      text: template.header,
      heading: HeadingLevel.HEADING_2,
      pageBreakBefore: template.pageBreakBefore,
    }),
  ];
  template.body.split('\n').forEach(async (p) => {
    if (p.startsWith('[TABLE:')) {
      const mapKey = p.match(/\[TABLE:(.*)\]/)?.[1];
      if (!mapKey || mapKey in tableMap === false) {
        throw new Error(`Unknown table: ${mapKey}`);
      }
      const tableBuildFn = tableMap[mapKey as keyof typeof tableMap];
      ret.push(buildTable(await tableBuildFn(template.data)));
    } else {
      ret.push(new Paragraph({ children: formatBodyText(p) }));
    }
  });

  return ret;
}
