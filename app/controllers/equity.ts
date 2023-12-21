import { addFP } from '@/lib/util';
import {
  getColumnMap,
  getById as getDocumentById,
  getSheetData,
} from './document';
import { getDataForRequestAttribute2 } from './request-data';

import type { AuditId, DocumentId } from '@/types';

export async function getAuthorizedSharesTotal(auditId: AuditId) {
  const certTransactionReport =
    await getCertificateTransactionDocumentData(auditId);
  if (certTransactionReport.length === 0) {
    return {
      nonCommon: 0,
      common: 0,
    };
  }
  return {
    nonCommon: certTransactionReport
      .filter((row) => !row.name.match(/common/i))
      .reduce((acc, v) => acc + v.sharesAuthorized, 0),
    common: certTransactionReport
      .filter((row) => row.name.match(/common/i))
      .reduce((acc, v) => acc + v.sharesAuthorized, 0),
  };
}

export async function getCertificateTransactionDocumentData(auditId: AuditId) {
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

export async function getSBCReportData(auditId: AuditId) {
  const documentIds = (await getDataForRequestAttribute2(
    auditId,
    'equity',
    'stockBasedCompDocumentId',
  )) as DocumentId[];

  if (!documentIds) {
    return null;
  }

  const document = await getDocumentById(documentIds[0]);
  if (!document || !document.extracted) {
    return null;
  }

  const sheets = getSheetData(document);

  const optionValuesSheet = sheets.find((sheet) =>
    sheet.sheetTitle.match(/option values/i),
  );
  if (!optionValuesSheet) {
    return null;
  }
  const optionValuesCol = optionValuesSheet.schema.cols.findIndex((col) =>
    col.name.match(/quantity/i),
  );
  if (!optionValuesCol) {
    return null;
  }
  const commonOutstanding = addFP(
    ...optionValuesSheet.rows.map((row) => row[optionValuesCol]),
  );
  return {
    commonOutstanding,
  };
}
