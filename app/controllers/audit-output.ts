import * as fs from 'fs';
import {
  File,
  convertInchesToTwip,
  Document,
  HeadingLevel,
  Packer,
  PageBreak,
  Paragraph,
  StyleLevel,
  TableOfContents,
  UnderlineType,
  LevelFormat,
  AlignmentType,
  TextRun,
  Table,
  TableRow,
  TableCell,
  TextDirection,
  VerticalAlign,
  Header,
  Footer,
  NumberFormat,
  WidthType,
  PageNumber,
  Border,
  BorderStyle,
} from 'docx';
import { getById as getAuditById } from '@/controllers/audit';
import { getAllByAuditId } from '@/controllers/request';
import type { AuditId, Request } from '@/types';
import type { RequestType } from '@/lib/request-types';
import dayjs from 'dayjs';

export async function generate(auditId: AuditId) {
  const audit = await getAuditById(auditId);
  let requests = {};
  (await getAllByAuditId(auditId)).forEach((request: Request) => {
    requests[request.type] = request.data;
  });

  const data = {
    requests,
  };

  console.log(audit, requests);
  const title = `Financial Statement - ${requests.BASIC_INFO.businessName} - ${audit.year}`;
  console.log(title);

  const doc = new Document({
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
            font: 'Calibri',
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
    ],
  });

  Packer.toBuffer(doc).then((buffer) => {
    fs.writeFileSync(`${title}.docx`, buffer);
  });
}

function titlePage(data) {
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

function independentAuditorsReport(data) {
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

function consolidatedFinancialStatements(data) {
  // const t1 = new TextRun({
  //   text: '[Auditor to add opinion]',
  //   highlight: 'yellow',
  // });
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
      new TableRow({
        children: [
          new TableCell({
            width: {
              size: 7505,
              type: WidthType.DXA,
            },
            children: [new Paragraph('As of December 31,')],
            //verticalAlign: VerticalAlign.,
            borders: {
              // top: { style: BorderStyle.NONE },
              // bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE, size: 0 },
              right: { style: BorderStyle.NONE, size: 0 },
            },
          }),
          new TableCell({
            width: {
              size: 1505,
              type: WidthType.DXA,
            },
            children: [new Paragraph('2022')],
            borders: {
              top: {
                style: BorderStyle.NONE,
                size: 3,
                color: 'FF0000',
              },
              bottom: {
                style: BorderStyle.NONE,
                size: 3,
                color: '0000FF',
              },
              left: {
                style: BorderStyle.NONE,
                size: 3,
                color: '00FF00',
              },
              right: {
                style: BorderStyle.NONE,
                size: 3,
                color: '#ff8000',
              },
            },

            //verticalAlign: VerticalAlign.CENTER,
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                text: 'Assets',
                //heading: HeadingLevel.HEADING_1,
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                text: '',
              }),
            ],
            // verticalAlign: VerticalAlign.CENTER,
          }),
        ],
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
