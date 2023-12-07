import dayjs from 'dayjs';
import ExcelJS from 'exceljs';

import {
  buildBalanceSheet,
  filterHideIfZeroRows,
} from '@/controllers/financial-statement/table';
import { groupAccountTypes } from '@/lib/finance';
import { isKey } from '@/lib/util';
import { AuditId } from '@/types';
import {
  AccountType,
  accountTypes,
  getAllAccountBalancesByAuditId,
} from '../account-mapping';
import { getAuditData } from '../audit';

import type { AuditData } from '@/controllers/audit';
import type { Cell as TableCell, Row as TableRow } from '@/lib/table';

export async function generate(auditId: AuditId) {
  const data = await getAuditData(auditId);

  const workbook = new ExcelJS.Workbook();

  const bsWorksheet = workbook.addWorksheet('Balance Sheet');

  const statementOfOperations = workbook.addWorksheet('SOE');
  workbook.addWorksheet('Support---->');
  const tbWorksheet = workbook.addWorksheet('Trial Balance');

  const accountTypeToCellMap = await addTrialBalance(tbWorksheet, data);

  await addBalanceSheet(bsWorksheet, data, accountTypeToCellMap, tbWorksheet);

  return {
    document: workbook,
    documentName: `Financial Statement - ${data.basicInfo.businessName} - ${data.auditInfo.year}.xlsx`,
  };
}

async function addBalanceSheet(
  ws: ExcelJS.Worksheet,
  data: AuditData,
  accountTypeToCellMap: Map<AccountType, string>,
  bsWorksheet: ExcelJS.Worksheet,
) {
  const t = await buildBalanceSheet(data);

  ws.addRow([data.basicInfo.businessName]);
  ws.addRow(['Consolidated Balance Sheet']);
  ws.addRow([]);
  ws.addRow([]);

  const widths: number[] = [];
  t.rows.forEach((row) => {
    const { widths: rowWidths } = addTableRow(
      ws,
      row,
      bsWorksheet,
      accountTypeToCellMap,
    );
    rowWidths.forEach((w, i) => {
      widths[i] = Math.max(widths[i] || 0, w);
    });
  });

  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = widths[0];
  });
}

function addTableRow(
  ws: ExcelJS.Worksheet,
  row: TableRow,
  bsWorksheet: ExcelJS.Worksheet,
  accountTypeToCellMap: Map<AccountType, string>,
) {
  const values = row.cells.map((cell: TableCell) => {
    const val = cell.rawValue();
    if (typeof val === 'object') {
      if (val.operation === 'addColumnCellsByTag') {
        const tag = val.args[0];
        const taggedRows = row.table.getRowsByTag(tag);
        const curRow = (ws?.lastRow?.number || 0) + 1;
        const rowOffset = curRow - row.number;
        const range = cell.table.getAddressRange(cell, taggedRows, rowOffset);

        return {
          formula: `=SUM(${range})`,
          result: 7,
        };
      }
    }
    if (isAccountType(row.id) && cell.column !== 0) {
      return {
        formula: `=SUM('${bsWorksheet.name}'!${accountTypeToCellMap.get(
          row.id as AccountType,
        )})`,
        result: 7,
      };
    }

    if (cell.style.indent) {
      return `    ${cell.value}`;
    }
    return cell.value;
  });

  const r = ws.addRow(values);

  const widths: number[] = [];
  row.cells.forEach((cell: TableCell, i: number) => {
    const xCell = r.getCell(i + 1);

    if (cell.style.bold) {
      xCell.font = { bold: true };
    }
    const border: any = {};

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
    if (cell.style.numFmt === 'accounting') {
      xCell.numFmt = '_($* #,##0_);_($* (#,##0);_($* "-"??_);_(@_)';
    }

    widths[i] = String(cell.value).length;
  });

  if (row.hasTag('hide-if-zero')) {
    const hasNonZeroValues = row.cells.some(
      (cell) => typeof cell.value === 'number' && cell.value !== 0,
    );
    if (!hasNonZeroValues) {
      r.hidden = true;
    }
  }

  return { widths };
}

async function addTrialBalance(ws: ExcelJS.Worksheet, data: AuditData) {
  ws.addRow([data.basicInfo.businessName]);
  ws.addRow(['Trial Balance']);
  const date = dayjs(data.trialBalance.trialBalanceDate).format('MMMM D, YYYY');
  ws.addRow([`As of ${date}`]);
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
  let firstAccountTypeRowNumber = curRowNumber + 1;
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

  let lastAccountTypeRowNumber = curRowNumber;
  ws.getColumn('account_types').width = widths[0] + 2;
  ws.getColumn('num_accounts').width = widths[1] + 2;

  widths = [10, 10, 10];
  curRowNumber = header.number;
  let firstRowNumber = curRowNumber + 1;
  const accounts = await getAllAccountBalancesByAuditId(data.auditId);
  for (const a of accounts) {
    ++curRowNumber;
    ws.getCell(`A${curRowNumber}`).value = `${a.accountNumber}${
      a.accountNumber && a.accountName ? ' - ' : ''
    }${a.accountName}`;
    ws.getCell(`B${curRowNumber}`).value = Math.round(Number(a.balance));
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

    widths[0] = Math.max(
      widths[0],
      a.accountNumber.length + a.accountName.length,
    );
    widths[1] = Math.max(widths[1], String(a.balance).length);
    widths[2] = Math.max(widths[2], (a.mappedToAccountName || '').length);
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

  ws.getColumn('balance').numFmt =
    '_($* #,##0.00_);_($* (#,##0.00);_($* "-"??_);_(@_)';

  ws.getColumn('account').width = widths[0] + 2;
  ws.getColumn('balance').width = widths[1] + 4;
  ws.getColumn('bs_mapping').width = widths[2];

  curRowNumber = header.number;
  const groups = groupAccountTypes(accountTypes);
  const accountTypeToCellMap = new Map<AccountType, string>();
  widths = [10, 20];
  for (const group of Object.keys(groups)) {
    ++curRowNumber;

    const types = groups[group];
    ws.getCell(`E${curRowNumber}`).value = group;
    ws.getCell(`E${curRowNumber}`).style = { font: { bold: true } };
    const firstCellToTotal = curRowNumber + 1;
    for (const type of Object.keys(types)) {
      ++curRowNumber;
      ws.getCell(`E${curRowNumber}`).value = types[type];
      widths[0] = Math.max(widths[0], types[type].length);

      accountTypeToCellMap.set(type as AccountType, `F${curRowNumber}`);
      ws.getCell(`F${curRowNumber}`).value = {
        formula: `SUMIFS(B${firstRowNumber}:B${totalRow.number}, C${firstRowNumber}:C${totalRow.number}, "${type}")`,
        result: 7,
      };
      ws.getCell(`F${curRowNumber}`).numFmt =
        '_($* #,##0.00_);_($* (#,##0.00);_($* "-"??_);_(@_)';
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
    ws.getCell(`E${curRowNumber}`).value = `Total ${group}`;
    ws.getCell(`F${curRowNumber}`).value = {
      formula: `SUM(F${firstCellToTotal}:F${curRowNumber - 1})`,
      result: 7,
    };
    ws.getCell(`F${curRowNumber}`).numFmt =
      '_($* #,##0.00_);_($* (#,##0.00);_($* "-"??_);_(@_)';
    ++curRowNumber;
  }
  ws.getColumn('totals').width = widths[0] + 2;
  ws.getColumn('totals_balance').width = widths[1];

  return accountTypeToCellMap;
}

const accountTypeBG = {
  ASSET: 'FFdef5c1',
  LIABILITY: 'FFc1e0f5',
  EQUITY: 'FFefd0f7',
  INCOME: 'FFffefd9',

  UNKNOWN: 'FFeb3d26',
} as const;

function applyBGFormatting(
  ws: ExcelJS.Worksheet,
  range: string,
  accountTypeCol: string,
) {
  for (const [accountType, bgColor] of Object.entries(accountTypeBG)) {
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
              bgColor: { argb: bgColor },
            },
            font:
              accountType === 'UNKNOWN'
                ? {
                    color: { argb: 'FFffffff' },
                  }
                : undefined,
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

function isAccountType(v: any): v is AccountType {
  return isKey(accountTypes, v);
}
