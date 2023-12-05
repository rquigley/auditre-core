import dayjs from 'dayjs';
import ExcelJS from 'exceljs';

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
  ws.addRow([data.basicInfo.businessName]);
  ws.addRow(['Consolidated Balance Sheet']);
  ws.addRow([`As of ${data.fiscalYearEnd}`]);
  ws.addRow([]);
  ws.addRow([]);

  ws.columns = [
    { key: 'account', width: 50 },
    {
      width: 1,
      // style: {
      //   fill: {
      //     type: 'pattern',
      //     pattern: 'solid',
      //     // fgColor: { argb: 'FFDDDDDD' },
      //   },
      // },
    },
    { key: 'balance1', width: 20 },
    {
      width: 1,
      // style: {
      //   fill: {
      //     type: 'pattern',
      //     pattern: 'solid',
      //     fgColor: { argb: 'FFDDDDDD' },
      //   },
      // },
    },
    { key: 'balance2' },
  ];
  const header = ws.addRow(['', '', '(DATE)']);
  ws.getCell(`B${header.number}`).alignment = { horizontal: 'right' };
  header.font = { bold: true };

  let r = ws.addRow(['Assets']);
  r.font = { bold: true };
  ws.addRow(['Current assets:']);
  const addRow = (label: string, accountType: AccountType) =>
    ws.addRow([
      label,
      '',
      {
        formula: `=SUM('${bsWorksheet.name}'!${accountTypeToCellMap.get(
          accountType,
        )})`,
        result: 7,
      },
    ]);

  let r1, r2, rt;
  r1 = addRow('Cash', 'ASSET_CASH_AND_CASH_EQUIVALENTS');
  addRow('Inventory', 'ASSET_INVENTORY');
  addRow('Prepaid expenses', 'ASSET_PREPAID_EXPENSES');
  r2 = addRow('Prepaid expenses and other current assets', 'ASSET_OTHER');
  rt = ws.addRow([
    'Total current assets',
    '',
    {
      formula: `=SUM(${r1.getCell(3).address},${r2.getCell(3).address})`,
      result: 7,
    },
  ]);
  rt.getCell(1).style = {
    // font: { bold: true },
    border: {
      top: { style: 'thin', color: { argb: 'FF000000' } },
    },
  };
  rt.getCell(3).style = {
    // font: { bold: true },
    border: {
      top: { style: 'thin', color: { argb: 'FF000000' } },
    },
  };
  // no cents, move up
  ws.getColumn('balance1').numFmt =
    '_($* #,##0_);_($* (#,##0);_($* "-"??_);_(@_)';
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

function applyBGFormatting(
  ws: ExcelJS.Worksheet,
  range: string,
  accountTypeCol: string,
) {
  const accountTypeBG = {
    ASSET: 'FFdef5c1',
    LIABILITY: 'FFc1e0f5',
    EQUITY: 'FFefd0f7',
    INCOME: 'FFffefd9',

    UNKNOWN: 'FFeb3d26',
  } as const;
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
