import dayjs from 'dayjs';
import ExcelJS from 'exceljs';

import { groupAccountTypes } from '@/lib/finance';
import { isKey } from '@/lib/util';
import { AuditId } from '@/types';
import {
  accountTypes,
  getAllAccountBalancesByAuditId,
} from '../account-mapping';
import { getAuditData } from '../audit';

import type { AuditData } from '@/controllers/audit';

export async function generate(auditId: AuditId) {
  const data = await getAuditData(auditId);

  const workbook = new ExcelJS.Workbook();

  await addBalanceSheet(workbook, data);

  const statementOfOperations = workbook.addWorksheet('SOE');
  workbook.addWorksheet('Support---->');
  await addTrialBalance(workbook, data);

  return {
    document: workbook,
    documentName: `Financial Statement - ${data.basicInfo.businessName} - ${data.auditInfo.year}.xlsx`,
  };
}

async function addBalanceSheet(workbook: ExcelJS.Workbook, data: AuditData) {
  const ws = workbook.addWorksheet('Balance Sheet');
}

async function addTrialBalance(workbook: ExcelJS.Workbook, data: AuditData) {
  const ws = workbook.addWorksheet('Trial Balance');

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
  ];
  const header = ws.addRow(['Account', 'Balance', 'BS Mapping', '', 'Totals']);
  ws.getCell(`B${header.number}`).alignment = { horizontal: 'right' };
  header.font = { bold: true };

  ws.views = [
    {
      state: 'frozen',
      ySplit: header.number,
    },
  ];

  let widths = [10, 10, 10];
  let firstRowNumber = 0;

  // const accountTypeFormula = [
  //   `"${Object.keys(accountTypes).slice(0, 9).join(',')}"`,
  // ];

  const accounts = await getAllAccountBalancesByAuditId(data.auditId);
  accounts.map((a, idx) => {
    const row = ws.addRow([
      `${a.accountNumber}${a.accountNumber && a.accountName ? ' - ' : ''}${
        a.accountName
      }`,
      Math.round(Number(a.balance)),
      a.accountType,
    ]);
    if (idx === 0) {
      firstRowNumber = row.number;
    }
    if (!a.accountType) {
      ws.getCell(`C${row.number}`).style = {
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFF0000' },
        },
      };
    }
    // Disabling this for now. There is a limit of 255 characters for the formula
    // See https://github.com/exceljs/exceljs/issues/2256#issuecomment-1523018123
    // for a potential solution.
    // ws.getCell(`D${row.number}`).dataValidation = {
    //   type: 'list',
    //   allowBlank: true,
    //   formulae: accountTypeFormula,
    //   showErrorMessage: true,
    //   errorStyle: 'error',
    //   errorTitle: 'Invalid account type',
    //   error: 'The value must not be a valid account type',
    // };

    widths[0] = Math.max(
      widths[0],
      a.accountNumber.length + a.accountName.length,
    );
    widths[1] = Math.max(widths[1], String(a.balance).length);
    widths[2] = Math.max(widths[2], (a.mappedToAccountName || '').length);
  });

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

  let curRowNumber = header.number;

  const groups = groupAccountTypes(accountTypes);

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
}
