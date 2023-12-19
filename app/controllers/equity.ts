import { addFP } from '@/lib/util';
import {
  getColumnMap,
  getById as getDocumentById,
  getSheetData,
} from './document';
import { getDataForRequestAttribute2 } from './request-data';

import type { AuditData } from './audit';
import type { AuditId, DocumentId } from '@/types';

export async function getAuthorizedSharesTotal(
  auditId: AuditId,
  data: AuditData,
) {
  return 11111;
}

export async function getConvertiblePreferredStockData(auditId: AuditId) {
  const documentIds = (await getDataForRequestAttribute2(
    auditId,
    'equity',
    'certificateTransactionDocumentId',
  )) as DocumentId[];

  if (!documentIds) {
    return [];
  }

  const document = await getDocumentById(documentIds[0]);
  if (!document || !document.extracted) {
    return [];
  }
  const sheets = getSheetData(document);

  return sheets.map((sheet) => {
    const map = getColumnMap(sheet.schema, {
      sharesAuthorized: 'shares',
      sharesIssued: 'shares',
      carryingValue: 'cost',
      liquidationPreference: 'cost',
    });

    const sharesAuthorized = sheet.rows.reduce((sum, row) => {
      return sum + Number(row[map.sharesAuthorized]);
    }, 0);
    const sharesIssued = sheet.rows.reduce((sum, row) => {
      return sum + Number(row[map.sharesIssued]);
    }, 0);
    const carryingValue = addFP(...sheet.rows.map((r) => r[map.carryingValue]));
    const liquidationPreference = addFP(
      ...sheet.rows.map((r) => r[map.liquidationPreference]),
    );

    return {
      name: sheet.sheetTitle,
      sharesAuthorized,
      sharesIssued,
      carryingValue,
      liquidationPreference,
    };
  });
}
