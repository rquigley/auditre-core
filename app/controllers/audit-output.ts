import * as fs from 'fs';
import dayjs from 'dayjs';

import { getById as getAuditById } from '@/controllers/audit';
import { getAllByAuditId } from '@/controllers/request';
import { requestTypes } from '@/lib/request-types';
import * as t from './financial-statement/template';

import type { RequestTypeKey } from '@/lib/request-types';
import type { AuditId, RequestData } from '@/types';

const {
  // import {
  AlignmentType,
  Border,
  BorderStyle,
  convertInchesToTwip,
  Document,
  File,
  Footer,
  Header,
  HeadingLevel,
  LevelFormat,
  NumberFormat,
  Packer,
  PageBreak,
  PageNumber,
  Paragraph,
  StyleLevel,
  Table,
  TableCell,
  TableOfContents,
  TableRow,
  TextDirection,
  TextRun,
  UnderlineType,
  VerticalAlign,
  WidthType,
  HeightRule,
  // } from 'docx';
} = require('docx');

// } = require('docx');

async function getRequestData(auditId: AuditId) {
  const auditRequests = await getAllByAuditId(auditId);
  let requests = auditRequests.reduce((acc: any, req) => {
    acc[req.type] = req.data;
    return acc;
  }, {}) as unknown as Record<RequestTypeKey, RequestData>;
  return requests;
}

export async function generate(auditId: AuditId) {
  const audit = await getAuditById(auditId);
  const requests = await getRequestData(auditId);

  const data = {
    requests,
  };

  console.log(audit, requests);

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
        // {
        //   id: 'HighlightForHuman',
        //   name: 'Highlight For Human',
        //   basedOn: 'Normal',
        //   quickFormat: true,
        //   run: {
        //     strike: true,
        //     color: 'FF0000',
        //     highlight: 'yellow',
        //   },
        // },
      ],
    },
    // numbering: {
    //   config: [
    //     {
    //       reference: 'doc-numbering',
    //       levels: [
    //         {
    //           level: 0,
    //           //format: LevelFormat.UPPER_ROMAN,
    //           //text: '%1',
    //           //format: LevelFormat.LOWER_LETTER,
    //           //text: '%1)',
    //           alignment: AlignmentType.LEFT,
    //         },
    //       ],
    //     },
    //   ],
    // },
    sections: [
      consolidatedFinancialStatements(data),
      titlePage(data),
      //tableOfContents(),
      independentAuditorsReport(data),
      notes(data),
    ],
  });
  return {
    document,
    // @ts-ignore
    documentName: `Financial Statement - ${requests.BASIC_INFO.businessName} - ${audit.year}.docx`,
  };
}

function titlePage(data: any) {
  const yearEnd = dayjs(data.requests.AUDIT_INFO.fiscalYearEnd).format(
    'MMMM D, YYYY',
  );
  return {
    ...getPageProperties(),
    children: [
      new Paragraph({
        text: data.requests.BASIC_INFO.businessName,
        heading: HeadingLevel.HEADING_1,
      }),
      new Paragraph({
        text: 'Conslidated Financial Statements',
        //heading: HeadingLevel.HEADING_1,
      }),
      new Paragraph({
        text: `Year Ended ${yearEnd}`,
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

function independentAuditorsReport(data: any) {
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
        //pageBreakBefore: true,
      }),
      new Paragraph({ children: [t1] }),
      new Paragraph({ children: [t1], pageBreakBefore: true }),

      // new Paragraph({
      //   text: 'Header #2',
      //   heading: HeadingLevel.HEADING_1,
      //   pageBreakBefore: true,
      // }),
      // new Paragraph("I'm a other text very nicely written.'"),
      // new Paragraph({
      //   text: 'Header #2.1',
      //   heading: HeadingLevel.HEADING_2,
      // }),
      // new Paragraph("I'm a another text very nicely written.'"),
      // new Paragraph({
      //   text: 'My Spectacular Style #1',
      //   style: 'MySpectacularStyle',
      //   pageBreakBefore: true,
      // }),
    ],
  };
}

function getBalanceSheetData(data: any) {
  return {
    assets: {
      currentAssets: {
        cash: pp(25979389),
        other: pp(873839),
      },
      totalCurrentAssets: pp(26853228),
      property: pp(11164032),
      intangible: pp(346801),
      operatingLeaseRightOfUse: pp(3800326),
      other: pp(162656),
      total: pp(42327043),
    },
    liabilities: {
      current: {
        accountsPayable: pp(25979389),
        accrued: pp(873839),
        operatingLease: pp(873839),
      },
      totalCurrent: pp(26853228),
      accruedInterest: pp(11164032),
      converableNotes: pp(346801),
      operatingLease: pp(3800326),
      total: pp(42327043),
    },
  };
}

function pp(num: number) {
  return num.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });
}

function consolidatedFinancialStatements(data: any) {
  // const t1 = new TextRun({
  //   text: '[Auditor to add opinion]',
  //   highlight: 'yellow',
  // });
  const vals = getBalanceSheetData(data);
  const table = new Table({
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
    },
    // width: {
    //   size: '6in',
    //   //type: WidthType.DXA,
    // },
    // width: {
    //   size: 100,
    //   type: WidthType.PERCENTAGE,
    // },
    columnWidths: [7505, 1505],
    rows: [
      getRow({
        name: 'As of December 31,',
        value: '2022',
        bold: true,
        borderBottom: true,
      }),
      getRow({
        name: 'Assets',
        bold: true,
        padTop: true,
      }),
      getRow({
        name: 'Current assets:',
        padTop: true,
      }),
      getRow({
        name: 'Cash',
        value: vals.assets.currentAssets.cash,
        indent: true,
      }),
      getRow({
        name: 'Prepaid expenses and other current assets',
        value: vals.assets.currentAssets.other,
        indent: true,
        borderBottom: true,
      }),
      getRow({
        name: 'Total current assets',
        value: vals.assets.totalCurrentAssets,
        borderBottom: true,
        padTop: true,
      }),
      getRow({
        name: 'Property and equipment, net',
        value: vals.assets.property,
      }),
      getRow({
        name: 'Intangible assets, net',
        value: vals.assets.intangible,
      }),
      getRow({
        name: 'Operating lease right-of-use assets',
        value: vals.assets.operatingLeaseRightOfUse,
      }),
      getRow({
        name: 'Other assets',
        value: vals.assets.other,
        borderBottom: true,
      }),
      getRow({
        name: 'Total assets',
        value: vals.assets.total,
        bold: true,
        borderBottom: true,
        padTop: true,
      }),

      getRow({
        name: 'Liabilities and Stockholders’ Deficit',
        bold: true,
        padTop: true,
      }),
      getRow({
        name: 'Current liabilities:',
        padTop: true,
      }),
      getRow({
        name: 'Accounts payable',
        value: vals.liabilities.current.accountsPayable,
        indent: true,
      }),
      getRow({
        name: 'Accrued liabilities',
        value: vals.liabilities.current.accrued,
        indent: true,
      }),
      getRow({
        name: 'Operating lease liabilities, current',
        value: vals.liabilities.current.operatingLease,
        indent: true,
        borderBottom: true,
      }),
      getRow({
        name: 'Total current liabilities',
        value: vals.liabilities.totalCurrent,
        borderBottom: true,
        padTop: true,
      }),
      getRow({
        name: 'Accrued interest',
        value: vals.liabilities.accruedInterest,
        indent: true,
      }),
      getRow({
        name: 'Convertible notes payable',
        value: vals.liabilities.converableNotes,
        indent: true,
      }),
      getRow({
        name: 'Operating lease liabilities, net of current portion',
        value: vals.liabilities.operatingLease,
        indent: true,
      }),
      getRow({
        name: 'Total liabilities',
        value: vals.liabilities.total,
        bold: true,
        borderBottom: true,
        padTop: true,
      }),
    ],
  });

  return {
    ...getPageProperties(),

    children: [
      // new Paragraph({
      //   text: 'Consolidated Financial Statements',
      //   heading: HeadingLevel.HEADING_1,
      //   //pageBreakBefore: true,
      // }),
      new Paragraph({
        text: 'Consolidated Financial Statements',
        heading: HeadingLevel.HEADING_2,
        pageBreakBefore: true,
      }),
      table,
    ],
  };
}

function getRow({
  name,
  value,
  bold,
  indent,
  borderBottom,
  padTop,
}: {
  name: string;
  value?: string;
  bold?: boolean;
  indent?: boolean;
  borderBottom?: boolean;
  padTop?: boolean;
}) {
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
                text: value || '',
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
    // headers: {
    //   default: new Header({
    //     children: [
    //       new Paragraph({
    //         children: [
    //           new TextRun('Foo Bar corp. '),
    //           new TextRun({
    //             children: ['Page Number ', PageNumber.CURRENT],
    //           }),
    //           new TextRun({
    //             children: [' to ', PageNumber.TOTAL_PAGES],
    //           }),
    //         ],
    //       }),
    //     ],
    //   }),
    // },
    footers: {
      default: new Footer({
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              //new TextRun('Foo Bar corp. '),
              new TextRun({
                children: ['Page ', PageNumber.CURRENT],
              }),
              // new TextRun({
              //   children: [' to ', PageNumber.TOTAL_PAGES],
              // }),
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
function templateToParagraph(template: t.Template) {
  if (!template) {
    return [];
  }
  const paragraphs = template.body.split('\n').map((p) => {
    return new Paragraph({ children: formatBodyText(p) });
  });
  return [
    new Paragraph({
      text: template.header,
      heading: HeadingLevel.HEADING_2,
    }),
    ...paragraphs,
  ];
}

function notes(data: any) {
  return {
    ...getPageProperties(),

    children: [
      new Paragraph({
        text: '1. Organization',
        heading: HeadingLevel.HEADING_1,
        pageBreakBefore: true,
      }),

      ...templateToParagraph(t.organization1(data)),
      ...templateToParagraph(t.organization2(data)),

      new Paragraph({
        text: '2. Summary of Significant Accounting Policies',
        heading: HeadingLevel.HEADING_1,
      }),
      ...templateToParagraph(t.summarySigAccountPractices1(data)),
      ...templateToParagraph(t.summarySigAccountPractices2(data)),
      ...templateToParagraph(t.summarySigAccountPractices3(data)),
      ...templateToParagraph(t.summarySigAccountPractices4(data)),
      ...templateToParagraph(t.summarySigAccountPractices5(data)),
      ...templateToParagraph(t.summarySigAccountPractices6(data)),
      ...templateToParagraph(t.summarySigAccountPractices7(data)),
      ...templateToParagraph(t.summarySigAccountPractices8(data)),
      ...templateToParagraph(t.summarySigAccountPractices9(data)),
      ...templateToParagraph(t.summarySigAccountPractices10(data)),
      ...templateToParagraph(t.summarySigAccountPractices11(data)),
      ...templateToParagraph(t.summarySigAccountPractices12(data)),
      ...templateToParagraph(t.summarySigAccountPractices13(data)),
      ...templateToParagraph(t.summarySigAccountPractices14(data)),
      ...templateToParagraph(t.summarySigAccountPractices15(data)),
      ...templateToParagraph(t.summarySigAccountPractices16(data)),
    ],
  };
}
