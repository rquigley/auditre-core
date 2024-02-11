import dayjs from 'dayjs';
import ExcelJS from 'exceljs';
import { Parser } from 'hot-formula-parser';

import {
  buildBalanceSheet,
  buildCashFlows,
  buildIncomeStatement,
} from '@/controllers/financial-statement/table';
import {
  AccountType,
  AccountTypeGroup,
  accountTypeGroupToLabel,
  accountTypes,
  fOut,
  groupAccountTypes,
  isAccountType,
} from '@/lib/finance';
import { AuditId } from '@/types';
import { getAllAccountBalancesByAuditIdAndYear } from '../account-mapping';
import { getAuditData } from '../audit';

import type { AuditData } from '@/controllers/audit';
import type { Table, Cell as TableCell, Row as TableRow } from '@/lib/table';

const numFmt = '_($* #,##0_);_($* (#,##0);_($* "-"??_);_(@_)';
const numFmtWithCents = '_($* #,##0.00_);_($* (#,##0.00);_($* "-"??_);_(@_)';

export async function generate(auditId: AuditId) {
  const data = await getAuditData(auditId);

  const workbook = new ExcelJS.Workbook();

  const bsWorksheet = workbook.addWorksheet('Balance Sheet');
  const isWorksheet = workbook.addWorksheet('IS');
  const cfWorksheet = workbook.addWorksheet('CF');
  workbook.addWorksheet('Support---->');

  const tbNames = new Set();
  let tbWorksheet1: ExcelJS.Worksheet | undefined;
  let tbWorksheet2: ExcelJS.Worksheet | undefined;
  let accountTypeToCellMap: Map<AccountType, string> | undefined;
  for (const identifier of [
    'year1DocumentId',
    'year2DocumentId',
    'year3DocumentId',
  ]) {
    const dateStr = data.rt.trialBalance[identifier].trialBalanceDate;
    if (!dateStr) {
      continue;
    }
    const date = dayjs(dateStr);
    const year = date.format('YYYY');
    let wsName = `Trial Balance - ${year}`;
    if (tbNames.has(wsName)) {
      // prevent worksheet name conflicts which throw
      wsName = `${wsName} (${identifier.substring(4, 1)})`;
    } else {
      tbNames.add(wsName);
    }

    const tbWorksheet = workbook.addWorksheet(wsName);

    const atMap = await addTrialBalance(tbWorksheet, data, date);
    if (identifier === 'year1DocumentId') {
      tbWorksheet1 = tbWorksheet;
      accountTypeToCellMap = atMap;
    } else if (identifier === 'year2DocumentId') {
      tbWorksheet2 = tbWorksheet;
    }
  }

  if (tbWorksheet1 && accountTypeToCellMap) {
    await addBalanceSheet({
      ws: bsWorksheet,
      data,
      accountTypeToCellMap,
      tbWorksheet: tbWorksheet1,
      tbWorksheet2,
    });

    await addIncomeStatement({
      ws: isWorksheet,
      data,
      accountTypeToCellMap,
      tbWorksheet: tbWorksheet1,
      tbWorksheet2,
    });
    await addCashFlow({
      ws: cfWorksheet,
      data,
      accountTypeToCellMap,
      tbWorksheet: tbWorksheet1,
      tbWorksheet2,
    });
  }

  return {
    document: workbook,
    documentName: `Financial Statement - ${data.rt.basicInfo.businessName} - ${data.rt.auditInfo.year}.xlsx`,
  };
}

async function addBalanceSheet({
  ws,
  data,
  accountTypeToCellMap,
  tbWorksheet,
  tbWorksheet2,
}: {
  ws: ExcelJS.Worksheet;
  data: AuditData;
  accountTypeToCellMap: Map<AccountType, string>;
  tbWorksheet: ExcelJS.Worksheet;
  tbWorksheet2: ExcelJS.Worksheet | undefined;
}) {
  const t = await buildBalanceSheet(data);

  const parser = getParser(t, data);

  ws.addRow([data.rt.basicInfo.businessName]);
  ws.addRow(['Consolidated balances sheet']);
  ws.addRow([]);
  ws.addRow([]);

  t.UNSAFE_outputRowOffset = 4;

  const widths: number[] = [];
  t.rows.forEach((row) => {
    const { widths: rowWidths } = addTableRow({
      ws,
      row,
      tbWorksheet,
      tbWorksheet2,
      accountTypeToCellMap,
      parser,
    });
    rowWidths.forEach((w, i) => {
      widths[i] = Math.max(widths[i] || 0, w);
    });
  });

  // TODO: I think this is setting the widths based on the char length of the formula,
  // not the numbers themselves. Fake it for now.
  // widths.forEach((w, i) => {
  //   ws.getColumn(i + 1).width = widths[0];
  // });
  ws.getColumn(1).width = widths[0];
  ws.getColumn(2).width = 17;
  ws.getColumn(3).width = 17;
}

async function addIncomeStatement({
  ws,
  data,
  accountTypeToCellMap,
  tbWorksheet,
  tbWorksheet2,
}: {
  ws: ExcelJS.Worksheet;
  data: AuditData;
  accountTypeToCellMap: Map<AccountType, string>;
  tbWorksheet: ExcelJS.Worksheet;
  tbWorksheet2: ExcelJS.Worksheet | undefined;
}) {
  const t = buildIncomeStatement(data);
  const parser = getParser(t, data);

  ws.addRow([data.rt.basicInfo.businessName]);
  ws.addRow(['Consolidated statement of operations']);
  ws.addRow([]);
  ws.addRow([]);

  t.UNSAFE_outputRowOffset = 4;

  const widths: number[] = [];
  t.rows.forEach((row) => {
    const { widths: rowWidths } = addTableRow({
      ws,
      row,
      tbWorksheet,
      tbWorksheet2,
      accountTypeToCellMap,
      parser,
      debug: true,
    });
    rowWidths.forEach((w, i) => {
      widths[i] = Math.max(widths[i] || 0, w);
    });
  });

  // TODO: I think this is setting the widths based on the char length of the formula,
  // not the numbers themselves. Fake it for now.
  // widths.forEach((w, i) => {
  //   ws.getColumn(i + 1).width = widths[0];
  // });
  ws.getColumn(1).width = widths[0];
  ws.getColumn(2).width = 17;
  ws.getColumn(3).width = 17;
}

async function addCashFlow({
  ws,
  data,
  accountTypeToCellMap,
  tbWorksheet,
  tbWorksheet2,
}: {
  ws: ExcelJS.Worksheet;
  data: AuditData;
  accountTypeToCellMap: Map<AccountType, string>;
  tbWorksheet: ExcelJS.Worksheet;
  tbWorksheet2: ExcelJS.Worksheet | undefined;
}) {
  const t = await buildCashFlows(data);
  const parser = getParser(t, data);

  ws.addRow([data.rt.basicInfo.businessName]);
  ws.addRow(['Consolidated statement of cash flows']);
  ws.addRow([]);
  ws.addRow([]);

  const widths: number[] = [];

  t.rows.forEach((row) => {
    const { widths: rowWidths } = addTableRow({
      ws,
      row,
      tbWorksheet,
      tbWorksheet2,
      accountTypeToCellMap,
      parser,
    });
    rowWidths.forEach((w, i) => {
      widths[i] = Math.max(widths[i] || 0, w);
    });
  });

  // TODO: I think this is setting the widths based on the char length of the formula,
  // not the numbers themselves. Fake it for now.
  // widths.forEach((w, i) => {
  //   ws.getColumn(i + 1).width = widths[0];
  // });
  ws.getColumn(1).width = widths[0];
  ws.getColumn(2).width = 17;
  ws.getColumn(3).width = 17;
}

function addTableRow({
  ws,
  row,
  tbWorksheet,
  tbWorksheet2,
  accountTypeToCellMap,
  parser,
  debug = false,
}: {
  ws: ExcelJS.Worksheet;
  row: TableRow;
  tbWorksheet: ExcelJS.Worksheet;
  tbWorksheet2: ExcelJS.Worksheet | undefined;
  accountTypeToCellMap: Map<AccountType, string>;
  parser: Parser;
  debug?: boolean;
}) {
  const values = row.cells.map((cell: TableCell) => {
    let val = cell.rawValue();

    if (typeof val === 'string' && val.startsWith('=')) {
      const parsed = parser.parse(val.substring(1));
      if (parsed.error) {
        console.log(`Error parsing ${val}: ${parsed.error}`);
        val = `Error: ${parsed.error}`;
      } else if (typeof parsed.result === 'boolean') {
        val = parsed.result ? 'TRUE' : 'FALSE';
        // } else if (parsed.result === null) {
        //   val = '';
      } else {
        val = {
          formula: `=${parsed.result}`,
          result: 7,
        };
      }
      debug &&
        console.log('->', {
          val,
          raw: cell.rawValue(),
        });
    }
    // console.log(val, cell.rawValue());

    // if (typeof val === 'object') {
    //   if (val.operation === 'addColumnCellsByTag') {
    //     const tag = val.args[0];
    //     const taggedRows = row.table.getRowsByTag(tag);
    //     const curRow = ws?.lastRow?.number || 0;
    //     const rowOffset = curRow - row.number;
    //     const range = cell.table.getAddressRange(cell, taggedRows, rowOffset);

    //     return {
    //       formula: `=SUM(${range})`,
    //       result: 7,
    //     };
    //   } else
    //   if (val.operation === 'multiplyCellTag') {
    //     const tag = val.args[0];
    //     const multiplier = val.args[1];
    //     const taggedRows = row.table.getRowsByTag(tag);
    //     const curRow = ws?.lastRow?.number || 0;
    //     const rowOffset = curRow - row.number;
    //     const range = cell.table.getAddressRange(cell, taggedRows, rowOffset);

    //     return {
    //       formula: `=SUM(${range}) * ${multiplier}`,
    //       result: 7,
    //     };
    //   } else if (val.operation === 'subtractCell') {
    //     const [id1, id2] = val.args;
    //     const row1 = row.table.getRowById(id1);
    //     const row2 = row.table.getRowById(id2);
    //     const curRow = ws?.lastRow?.number || 0;
    //     const rowOffset = curRow - row.number;

    //     return {
    //       formula: `=${cell.table.offsetAddress(row1.cells[cell.column].address, rowOffset, 0)} - ${cell.table.offsetAddress(row2.cells[cell.column].address, rowOffset, 0)}`,
    //       result: 7,
    //     };
    //   }
    // }
    // if (isAccountType(row.tbAccountTypeLookupRef) && cell.column === 1) {
    //   return {
    //     formula: `=SUM('${tbWorksheet.name}'!${accountTypeToCellMap.get(
    //       row.tbAccountTypeLookupRef as AccountType,
    //     )})`,
    //     result: 7,
    //   };
    // } else if (
    //   tbWorksheet2 &&
    //   isAccountType(row.tbAccountTypeLookupRef) &&
    //   cell.column === 2
    // ) {
    //   return {
    //     formula: `=SUM('${tbWorksheet2.name}'!${accountTypeToCellMap.get(
    //       row.tbAccountTypeLookupRef as AccountType,
    //     )})`,
    //     result: 7,
    //   };
    // }

    if (cell.style.indent) {
      return `${'    '.repeat(cell.style.indent)}${val}`;
    }
    return val;
  });

  const r = ws.addRow(values);

  const widths: number[] = [];
  row.cells.forEach((cell: TableCell, i: number) => {
    const xCell = r.getCell(i + 1);

    if (cell.style.bold) {
      xCell.font = { bold: true };
    }
    const border: {
      top?: ExcelJS.Border;
      bottom?: ExcelJS.Border;
    } = {};

    if (cell.style.borderTop) {
      border.top = { style: cell.style.borderTop, color: { argb: 'FF000000' } };
    }
    if (cell.style.borderBottom) {
      border.bottom = {
        style: cell.style.borderBottom,
        color: { argb: 'FF000000' },
      };
    }
    if (border.top || border.bottom) {
      xCell.border = border;
    }
    if (
      cell.style.numFmt === 'accounting' ||
      (typeof cell.style.numFmt === 'object' &&
        cell.style.numFmt.type === 'accounting')
    ) {
      xCell.numFmt = numFmt;
    }

    widths[cell.column] = String(cell.value).length;
  });

  // if (row.hasTag('hide-if-zero')) {
  //   const hasNonZeroValues = row.cells.some(
  //     (cell) => typeof cell.value === 'number' && cell.value !== 0,
  //   );
  //   if (!hasNonZeroValues) {
  //     r.hidden = true;
  //   }
  // }

  return { widths };
}

async function addTrialBalance(
  ws: ExcelJS.Worksheet,
  data: AuditData,
  date: dayjs.Dayjs,
) {
  ws.addRow([data.rt.basicInfo.businessName]);

  const year = date.format('YYYY');

  ws.addRow([`Trial Balance`]);
  ws.addRow([`As of ${date.format('MMMM D, YYYY')}`]);
  ws.addRow([]);
  ws.addRow([]);

  ws.columns = [
    { key: 'account' },
    { key: 'balance' },
    { key: 'bs_mapping' },
    {
      width: 3,
      style: {
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFDDDDDD' },
        },
      },
    },
    { key: 'totals' },
    { key: 'totals_balance' },
    {
      width: 3,
      style: {
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFDDDDDD' },
        },
      },
    },
    { key: 'account_types' },
    { key: 'num_accounts' },
  ];
  const header = ws.addRow([
    'Account',
    'Balance',
    'BS Mapping',
    '',
    'Totals',
    '',
    '',
    'Account Types',
    'Num Accounts',
  ]);
  ws.getCell(`B${header.number}`).alignment = { horizontal: 'right' };
  header.font = { bold: true };

  ws.views = [
    {
      state: 'frozen',
      ySplit: header.number,
    },
  ];

  let widths = [10, 10];
  let curRowNumber = header.number;
  const firstAccountTypeRowNumber = curRowNumber + 1;
  for (const accountType of Object.keys(accountTypes)) {
    ++curRowNumber;
    ws.getCell(`H${curRowNumber}`).value = accountType;
    widths[0] = Math.max(widths[0], accountType.length);
    ws.getCell(`I${curRowNumber}`).value = {
      formula: `=COUNTIF(C:C, "${accountType}")`,
      result: 7,
    };
  }
  applyBGFormatting(ws, `H${firstAccountTypeRowNumber}:I${curRowNumber}`, 'H');

  const lastAccountTypeRowNumber = curRowNumber;
  ws.getColumn('account_types').width = widths[0] + 2;
  ws.getColumn('num_accounts').width = widths[1] + 2;

  widths = [10, 10, 10];
  curRowNumber = header.number;
  const firstRowNumber = curRowNumber + 1;
  const accounts = await getAllAccountBalancesByAuditIdAndYear(
    data.auditId,
    year,
  );
  for (const a of accounts) {
    ++curRowNumber;
    ws.getCell(`A${curRowNumber}`).value = a.accountName;
    ws.getCell(`B${curRowNumber}`).value = fOut(a.balance);
    ws.getCell(`C${curRowNumber}`).value = a.accountType;

    ws.getCell(`C${curRowNumber}`).dataValidation = {
      type: 'list',
      allowBlank: false,
      formulae: [
        `=$H$${firstAccountTypeRowNumber}:$H$${lastAccountTypeRowNumber}`,
      ],
      showErrorMessage: true,
      errorStyle: 'error',
      errorTitle: 'Invalid account type',
      error: 'The value must not be a valid account type',
    };

    widths[0] = Math.max(widths[0], a.accountName.length);
    widths[1] = Math.max(widths[1], String(a.balance).length);
    widths[2] = Math.max(widths[2], a.accountType.length);
  }

  applyBGFormatting(ws, `A${firstRowNumber}:C${curRowNumber}`, 'C');

  const totalRow = ws.addRow(['Total', 0]);
  ws.getCell(`B${totalRow.number}`).value = {
    formula: `SUM(B${firstRowNumber},B${totalRow.number - 1})`,
    result: 7,
  };
  ws.getCell(`A${totalRow.number}`).style = {
    font: { bold: true },
    border: {
      top: { style: 'double', color: { argb: 'FF000000' } },
    },
  };
  ws.getCell(`B${totalRow.number}`).style = {
    font: { bold: true },
    border: {
      top: { style: 'double', color: { argb: 'FF000000' } },
    },
  };
  ws.getCell(`C${totalRow.number}`).style = {
    font: { bold: true },
    border: {
      top: { style: 'double', color: { argb: 'FF000000' } },
    },
  };

  ws.getColumn('balance').numFmt = numFmtWithCents;

  ws.getColumn('account').width = widths[0] + 2;
  ws.getColumn('balance').width = widths[1] + 4;
  ws.getColumn('bs_mapping').width = widths[2];

  curRowNumber = header.number;
  const groups = groupAccountTypes(accountTypes);
  const accountTypeToCellMap = new Map<AccountType, string>();
  widths = [10, 20];
  const rowNumbers = {
    retainedEarnings: 0,
    total: {
      ASSET: 0,
      LIABILITY: 0,
      EQUITY: 0,
      INCOME_STATEMENT: 0,
      OTHER: 0,
    },
  };
  for (const g of Object.keys(groups)) {
    const group = g as AccountTypeGroup;
    ++curRowNumber;

    const types = groups[group];
    ws.getCell(`E${curRowNumber}`).value = accountTypeGroupToLabel(group);
    ws.getCell(`E${curRowNumber}`).style = { font: { bold: true } };
    const firstCellToTotal = curRowNumber + 1;

    for (const accountType of Object.keys(types)) {
      ++curRowNumber;
      if (accountType === 'EQUITY_RETAINED_EARNINGS') {
        rowNumbers.retainedEarnings = curRowNumber;
      }
      ws.getCell(`E${curRowNumber}`).value = types[accountType];
      widths[0] = Math.max(widths[0], types[accountType].length);

      accountTypeToCellMap.set(accountType as AccountType, `F${curRowNumber}`);

      // console.log(`TOTAL_${accountType}`);
      ws.getCell(`F${curRowNumber}`).value = {
        formula: `SUMIFS(B${firstRowNumber}:B${
          totalRow.number - 1
        }, C${firstRowNumber}:C${totalRow.number - 1}, "${accountType}")`,
        result: 7,
      };
      ws.getCell(`F${curRowNumber}`).name = `TB_${year}_TOTAL_${accountType}`;
      // console.log('-->', ws.getCell(`F${curRowNumber}`).names);
    }
    ++curRowNumber;

    ws.getCell(`E${curRowNumber}`).style = {
      font: { bold: true },
      border: {
        top: { style: 'double', color: { argb: 'FF000000' } },
      },
    };
    ws.getCell(`F${curRowNumber}`).style = {
      font: { bold: true },
      border: {
        top: { style: 'double', color: { argb: 'FF000000' } },
      },
    };
    let label;
    if (group === 'INCOME_STATEMENT') {
      label = 'Net Income';

      if (rowNumbers.retainedEarnings) {
        ws.getCell(`F${rowNumbers.retainedEarnings}`).value = {
          formula: `SUMIFS(B${firstRowNumber}:B${
            totalRow.number - 1
          }, C${firstRowNumber}:C${
            totalRow.number - 1
          }, "EQUITY_RETAINED_EARNINGS") + F${curRowNumber}`,
          result: 7,
        };
      }
    } else {
      label = `Total ${accountTypeGroupToLabel(group).toLowerCase()}`;
    }
    rowNumbers.total[group] = curRowNumber;

    ws.getCell(`E${curRowNumber}`).value = label;
    ws.getCell(`F${curRowNumber}`).value = {
      formula: `SUM(F${firstCellToTotal}:F${curRowNumber - 1})`,
      result: 7,
    };

    ++curRowNumber;
  }
  ws.getCell(`B2`).value = 12345;
  ws.getCell(`B2`).name = `TB_${year}_TOTAL_HAHA`;
  ws.getCell(`B3`).value = 12345;
  ws.getCell(`B3`).name = `TOTAL_HAHA`;

  curRowNumber += 4;
  ws.getCell(`E${curRowNumber}`).value = 'Total assets';
  ws.getCell(`F${curRowNumber}`).value = {
    formula: `=F${rowNumbers.total.ASSET}`,
    result: 7,
  };

  ++curRowNumber;
  ws.getCell(`E${curRowNumber}`).value = 'Total liabilities + equity';
  ws.getCell(`F${curRowNumber}`).value = {
    formula: `SUM(F${rowNumbers.total.LIABILITY}, F${rowNumbers.total.EQUITY})`,
    result: 7,
  };

  ++curRowNumber;
  ws.getCell(`E${curRowNumber}`).value = 'Variance';
  ws.getCell(`F${curRowNumber}`).value = {
    formula: `=F${curRowNumber - 2} - F${curRowNumber - 1}`,
    result: 7,
  };

  ws.getCell(`E${curRowNumber}`).style = {
    font: { bold: true },
    border: {
      top: { style: 'double', color: { argb: 'FF000000' } },
    },
  };
  ws.getCell(`F${curRowNumber}`).style = {
    font: { bold: true },
    border: {
      top: { style: 'double', color: { argb: 'FF000000' } },
    },
  };

  ws.getColumn('E').alignment = { horizontal: 'right' };
  ws.getColumn('F').numFmt = numFmtWithCents;

  ws.getColumn('totals').width = widths[0] + 2;
  ws.getColumn('totals_balance').width = widths[1];

  return accountTypeToCellMap;
}

const accountTypeFgBgColors = {
  ASSET: ['FF111111', 'FFdef5c1'],
  LIABILITY: ['FF111111', 'FFc1e0f5'],
  EQUITY: ['FF111111', 'FFefd0f7'],
  INCOME: ['FF111111', 'FFffefd9'],
  OTHER: ['FF111111', 'FFffffff'],

  UNKNOWN: ['FFffffff', 'FFeb3d26'],
} as const;

function applyBGFormatting(
  ws: ExcelJS.Worksheet,
  range: string,
  accountTypeCol: string,
) {
  for (const [accountType, colors] of Object.entries(accountTypeFgBgColors)) {
    ws.addConditionalFormatting({
      ref: range,
      rules: [
        {
          type: 'expression',
          priority: 1,

          formulae: [
            `=SEARCH("${accountType}", INDIRECT("${accountTypeCol}" & ROW()))`,
          ],

          style: {
            fill: {
              type: 'pattern',
              pattern: 'solid',
              bgColor: { argb: colors[1] },
            },
            font: { color: { argb: colors[0] } },
          },
        },
      ],
    });
  }
}

// function getAccountTypeStyle(accountType: AccountType) {
//   const key = accountType.slice(
//     0,
//     accountType.indexOf('_'),
//   ) as keyof typeof accountTypeBG;
//   const bgColor = accountTypeBG[key];
//   return {
//     fill: {
//       type: 'pattern',
//       pattern: 'solid',
//       bgColor: { argb: bgColor },
//     },
//     font:
//       accountType === 'UNKNOWN'
//         ? {
//             color: { argb: 'FFffffff' },
//           }
//         : undefined,
//   };
// }

// function isAccountType(v: string | undefined): v is AccountType {
//   if (v === undefined) {
//     return false;
//   }
//   return isKey(accountTypes, v);
// }

function getParser(table: Table, data: AuditData) {
  const parser = new Parser();

  function parseCell(value: string | number) {
    if (typeof value === 'string' && value.startsWith('=')) {
      const parsed = parser.parse(value.substring(1));
      if (parsed.error) {
        throw new Error(parsed.error);
      } else {
        return parsed.result;
      }
    } else {
      return value;
    }
  }

  parser.setFunction('TBLOOKUP', (params) => {
    if (
      !Array.isArray(params) ||
      params.length !== 2 ||
      typeof params[0] !== 'string' ||
      typeof params[1] !== 'string'
    ) {
      console.log(`Invalid TBLOOKUP ${String(params)}`);
      throw new Error('Invalid TBLOOKUP');
    }

    const [account, year] = params as [string, string];
    return `TB_${year}_TOTAL_${account}`;
    // return {
    //   formula: `=TB_${year}_TOTAL_${account}`,
    //   result: data.totalsNew[year].get(account as AccountType),
    // };
  });

  parser.setFunction('GET_BY_ID', (params) => {
    if (
      !Array.isArray(params) ||
      params.length !== 2 ||
      typeof params[0] !== 'string' ||
      typeof params[1] !== 'number'
    ) {
      console.log(`Invalid GET_BY_ID ${String(params)}`);
      throw new Error('Invalid GET_BY_ID');
    }

    const [id, column] = params as [string, number];

    const row = table.getRowById(id);
    const cell = row.cells[column];
    if (!cell) {
      const msg = `GET_BY_ID: cell doesn't exist ${String(params)}`;
      console.log(msg);
      throw new Error(msg);
    }
    return parseCell(cell.value || '');
  });

  parser.setFunction('IS_NETLOSS', (params) => {
    if (
      !Array.isArray(params) ||
      params.length !== 1 ||
      typeof params[0] !== 'string'
    ) {
      console.log(`Invalid IS_NETLOSS ${String(params)}`);
      throw new Error('Invalid IS_NETLOSS');
    }

    const [year] = params as [string];
    const netLossRow = data.incomeStatementTable.getRowById('NET-LOSS');
    let val;
    if (year === data.year) {
      val = netLossRow.cells[1].value;
    } else if (year === data.prevYear) {
      val = netLossRow.cells[2].value;
    } else {
      throw new Error(`IS_NETLOSS: Invalid year: ${year}`);
    }
    if (typeof val !== 'string') {
      throw new Error(`IS_NETLOSS: Invalid value: ${val}`);
    }
    const parser2 = getParser(data.incomeStatementTable, data);
    return parser2.parse(val.substring(1)).result;
  });

  parser.setFunction('SUMTAGCOL', (params) => {
    if (
      !Array.isArray(params) ||
      params.length !== 2 ||
      typeof params[0] !== 'string' ||
      typeof params[1] !== 'number'
    ) {
      console.log(`Invalid SUMTAGCOL ${String(params)}`);
      throw new Error('Invalid SUMTAGCOL');
    }
    const [tag, column] = params as [string, number];

    const taggedRows = table.getRowsByTag(tag);

    const range = table.getAddressRange(
      column,
      taggedRows,
      table.UNSAFE_outputRowOffset,
    );

    return `SUM(${range})`;
    // return {
    //   formula: `=SUM(${range})`,
    //   result: 7,
    // };
  });
  return parser;
}
