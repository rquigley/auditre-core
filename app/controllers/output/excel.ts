import dayjs from 'dayjs';
import ExcelJS, { Worksheet } from 'exceljs';

import {
  buildBalanceSheet,
  buildCashFlows,
  buildIncomeStatement,
} from '@/controllers/financial-statement/table';
import {
  AccountTypeGroup,
  accountTypeGroupToLabel,
  accountTypes,
  fOut,
  groupAccountTypes,
  isAccountType,
} from '@/lib/finance';
import {
  getPrevType,
  isCFType,
  isYearType,
  yearTypeToYear,
} from '@/lib/formula-parser';
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

    await addTrialBalance(tbWorksheet, data, date);
    if (identifier === 'year1DocumentId') {
      tbWorksheet1 = tbWorksheet;
    } else if (identifier === 'year2DocumentId') {
      tbWorksheet2 = tbWorksheet;
    }
  }

  if (tbWorksheet1 && tbWorksheet2) {
    addBalanceSheet({
      ws: bsWorksheet,
      data,
    });

    addIncomeStatement({
      ws: isWorksheet,
      data,
    });
    await addCashFlow({
      ws: cfWorksheet,
      data,
    });
  }

  return {
    document: workbook,
    documentName: `Financial Statement - ${data.rt.basicInfo.businessName} - ${data.rt.auditInfo.year}.xlsx`,
  };
}

function addBalanceSheet({
  ws,
  data,
}: {
  ws: ExcelJS.Worksheet;
  data: AuditData;
}) {
  const t = buildBalanceSheet(data);

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
      table: t,
      data,
    });
    rowWidths.forEach((w, i) => {
      widths[i] = Math.max(widths[i] || 0, w);
    });
  });

  fadeZeroRows(ws, t);

  // TODO: I think this is setting the widths based on the char length of the formula,
  // not the numbers themselves. Fake it for now.
  // widths.forEach((w, i) => {
  //   ws.getColumn(i + 1).width = widths[0];
  // });
  ws.getColumn(1).width = widths[0];
  ws.getColumn(2).width = 17;
  ws.getColumn(3).width = 17;
}

function addIncomeStatement({
  ws,
  data,
}: {
  ws: ExcelJS.Worksheet;
  data: AuditData;
}) {
  const t = buildIncomeStatement(data);

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
      table: t,
      data,
    });
    rowWidths.forEach((w, i) => {
      widths[i] = Math.max(widths[i] || 0, w);
    });
  });

  fadeZeroRows(ws, t);

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
}: {
  ws: ExcelJS.Worksheet;
  data: AuditData;
}) {
  const t = await buildCashFlows(data);

  ws.addRow([data.rt.basicInfo.businessName]);
  ws.addRow(['Consolidated statement of cash flows']);
  ws.addRow([]);
  ws.addRow([]);

  t.UNSAFE_outputRowOffset = 4;

  const widths: number[] = [];

  t.rows.forEach((row) => {
    const { widths: rowWidths } = addTableRow({
      ws,
      row,
      table: t,
      data,
    });
    rowWidths.forEach((w, i) => {
      widths[i] = Math.max(widths[i] || 0, w);
    });
  });

  fadeZeroRows(ws, t);

  // TODO: I think this is setting the widths based on the char length of the formula,
  // not the numbers themselves. Fake it for now.
  // widths.forEach((w, i) => {
  //   ws.getColumn(i + 1).width = widths[0];
  // });
  ws.getColumn(1).width = widths[0];
  ws.getColumn(2).width = 17;
  ws.getColumn(3).width = 17;
}

function parseFormula(value: string, table: Table, data: AuditData) {
  value = replaceTBLOOKUP(value, data);
  value = replaceGET_BY_ID(value, table);
  value = replaceSUMTAGCOL(value, table);
  value = replaceIS_NETLOSS(value, data);
  value = replaceTB_NETLOSS(value, data);
  value = replaceCF(value, data);
  return value;
}

function replaceTBLOOKUP(inputString: string, data: AuditData): string {
  const regex = /TBLOOKUP\('([^']+)',\s*'([^']+)'\)/g;

  return inputString.replace(regex, (match, accountType, yearType) => {
    if (!isAccountType(accountType)) {
      throw new Error(`Invalid account type: ${accountType}`);
    }
    const year = yearTypeToYear(yearType, data);
    return `TB_${year}_TOTAL_${accountType.trim()}`;
  });
}

function replaceGET_BY_ID(inputString: string, table: Table): string {
  const regex = /GET_BY_ID\('([^']+)',\s*([0-9]+)\)/g;

  return inputString.replace(regex, (match, id, column) => {
    const row = table.getRowById(id);
    const cell = row.cells[column];
    if (!cell) {
      throw new Error(`GET_BY_ID: cell doesn't exist ${id}, ${column}`);
    }

    return `${cell.address}`;
  });
}

function replaceSUMTAGCOL(inputString: string, table: Table): string {
  const regex = /SUMTAGCOL\('([^']+)',\s*([0-9]+)\)/g;

  return inputString.replace(regex, (match, tag, column) => {
    const taggedRows = table.getRowsByTag(tag);
    if (taggedRows.length === 0) {
      throw new Error(`SUMTAGCOL: No rows with tag ${tag}`);
    }
    const range = table.getAddressRange(
      Number(column),
      taggedRows,
      table.UNSAFE_outputRowOffset,
    );
    return `SUM(${range})`;
  });
}

function replaceIS_NETLOSS(inputString: string, data: AuditData) {
  const regex = /IS_NETLOSS\('([^']+)'\)/g;

  return inputString.replace(regex, (match, yearType) => {
    const year = yearTypeToYear(yearType, data);

    return `IS_NET_LOSS_${year}`;
  });
}

function replaceTB_NETLOSS(inputString: string, data: AuditData) {
  const regex = /TB_NETLOSS\('([^']+)'\)/g;

  return inputString.replace(regex, (match, yearType) => {
    const year = yearTypeToYear(yearType, data);

    return `TB_${year}_TOTAL_INCOME_STATEMENT`;
  });
}

function replaceCF(inputString: string, data: AuditData) {
  const regex = /CF\('([^']+)',\s*'([^']+)'\)/g;

  return inputString.replace(regex, (match, cfType, yearType) => {
    if (!isYearType(yearType)) {
      throw new Error(`CF: Invalid yearType: ${yearType}`);
    }
    const prevType = getPrevType(yearType);
    if (!isCFType(cfType)) {
      throw new Error(`CF: Invalid cfType: ${cfType}`);
    }
    return String(
      data.cashFlow[yearType][cfType].balance -
        data.cashFlow[prevType][cfType].balance,
    );
  });
}

function addTableRow({
  ws,
  row,
  table,
  data,
  debug = false,
}: {
  ws: ExcelJS.Worksheet;
  row: TableRow;
  table: Table;
  data: AuditData;
  debug?: boolean;
}) {
  const values = row.cells.map((cell, idx) => {
    const val = cell.rawValue();

    if (typeof val === 'string' && val.startsWith('=')) {
      return {
        formula: parseFormula(val, table, data),
        result: 7,
      };
    }

    if (idx === 0 && cell.style.indent) {
      return `${'    '.repeat(cell.style.indent)}${val}`;
    }
    return val;
  });

  const r = ws.addRow(values);

  const widths: number[] = [];
  row.cells.forEach((cell, idx) => {
    const xCell = r.getCell(idx + 1);

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
    if (cell.name) {
      xCell.name = cell.name;
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

      ws.getCell(`F${curRowNumber}`).value = {
        formula: `SUMIFS(B${firstRowNumber}:B${
          totalRow.number - 1
        }, C${firstRowNumber}:C${totalRow.number - 1}, "${accountType}")`,
        result: 7,
      };
      ws.getCell(`F${curRowNumber}`).name = `TB_${year}_TOTAL_${accountType}`;
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
    ws.getCell(`F${curRowNumber}`).name = `TB_${year}_TOTAL_${group}`;

    ++curRowNumber;
  }

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

function fadeZeroRows(ws: Worksheet, t: Table) {
  // I'm not sure why the offset is required for the formulae, but it is.
  // Not worth digging into now, but we should figure it out at some point.
  const offset = t.UNSAFE_outputRowOffset + 1;

  ws.addConditionalFormatting({
    ref: `A${offset}:C${t.UNSAFE_outputRowOffset + t.lastRowNumber + 1}`,
    rules: [
      {
        priority: 1,
        type: 'expression',
        formulae: [`=AND($B${offset}=0, $C${offset}=0)`],
        style: {
          font: { color: { argb: 'FFBFBFBF' } },
        },
      },
    ],
  });
}
