import ExcelJS from 'exceljs';

import { AuditId } from '@/types';
import { getAllAccountBalancesByAuditId } from '../account-mapping';
import { getAuditData } from '../audit';

import type { AuditData } from '@/controllers/audit';

export async function generate(auditId: AuditId) {
  const data = await getAuditData(auditId);

  const workbook = new ExcelJS.Workbook();

  const balanceSheet = workbook.addWorksheet('BS');
  const statementOfOperations = workbook.addWorksheet('SOE');
  workbook.addWorksheet('Support---->');
  await addTrialBalance(workbook, data);

  return {
    document: workbook,
    documentName: `Financial Statement - ${data.basicInfo.businessName} - ${data.auditInfo.year}.xlsx`,
  };
}

async function addTrialBalance(workbook: ExcelJS.Workbook, data: AuditData) {
  const ws = workbook.addWorksheet('Trial Balance');
  ws.columns = [
    { key: 'account_id', width: 32 },
    { key: 'account_name', width: 32 },
    { key: 'balance', width: 15, outlineLevel: 1 },
    { key: 'bs_mapping', width: 15, outlineLevel: 1 },
  ];
  ws.addRow([data.basicInfo.businessName]);
  ws.addRow(['Trial Balance']);
  ws.addRow([`As of ${data.fiscalYearEnd}`]);
  ws.addRow([]);

  const accounts = await getAllAccountBalancesByAuditId(data.auditId);

  ws.addRow(['']);
  ws.addRow(['Account', 'Account Name', 'Balance', 'BS Mapping']);

  const widths = [10, 10, 10, 10];
  let firstRowNumber = 0;
  accounts.map((a, idx) => {
    const row = ws.addRow([
      a.accountNumber,
      a.accountName,
      Math.round(Number(a.balance)),
      a.mappedToAccountName,
    ]);
    if (idx === 0) {
      firstRowNumber = row.number;
      console.log(idx, row.number);
    }

    widths[0] = Math.max(widths[0], a.accountNumber.length);
    widths[1] = Math.max(widths[1], a.accountName.length);
    widths[2] = Math.max(widths[2], String(a.balance).length);
    widths[3] = Math.max(widths[3], (a.mappedToAccountName || '').length);
  });

  const totalRow = ws.addRow(['Total', '', 0]);
  ws.getCell(`C${totalRow.number}`).value = {
    formula: `SUM(C${firstRowNumber},C${totalRow.number - 1})`,
    result: 7,
  };
  totalRow.font = { bold: true };
  totalRow.border = { top: { style: 'thin' } };

  ws.getColumn('balance').numFmt = '$ #,##0.00;($ #,##0.00)';
  //   ws.getColumn('balance').numFmt = '"$"#,##0.00;[Red]-"$"#,##0.00';

  ws.getColumn('account_id').width = widths[0] + 2;
  ws.getColumn('account_name').width = widths[1] + 2;
  ws.getColumn('balance').width = widths[2] + 2;
  ws.getColumn('bs_mapping').width = widths[3] + 2;
}
