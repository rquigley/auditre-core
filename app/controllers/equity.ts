import { fIn } from '@/lib/finance';
import { AuditData } from './audit';
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

  if (!documentIds || documentIds.length === 0) {
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
      date: 'date',
    });

    const sharesAuthorized = sheet.rows.reduce((sum, row) => {
      return sum + Number(row[map.sharesAuthorized]);
    }, 0);
    const sharesIssued = sheet.rows.reduce((sum, row) => {
      return sum + Number(row[map.sharesIssued]);
    }, 0);
    const carryingValue = sheet.rows.reduce((sum, row) => {
      return sum + Number(row[map.carryingValue]);
    }, 0);
    const liquidationPreference = sheet.rows.reduce((sum, row) => {
      return sum + Number(row[map.liquidationPreference]);
    }, 0);

    return {
      name: sheet.sheetTitle,
      sharesAuthorized,
      sharesIssued,
      carryingValue,
      liquidationPreference,
      map,
      rows: sheet.rows,
    };
  });
}

export async function getStockBasedCompDocumentData(auditId: AuditId) {
  const documentIds = (await getDataForRequestAttribute2(
    auditId,
    'equity',
    'stockBasedCompDocumentId',
  )) as DocumentId[];

  if (!documentIds || documentIds.length === 0) {
    return [];
  }

  const document = await getDocumentById(documentIds[0]);
  if (!document || !document.extracted) {
    return [];
  }
}

export function getSOEData({
  data,
  certData,
  beginningOfPYDate,
  endOfPYDate,
}: {
  data: AuditData;
  certData: Awaited<ReturnType<typeof getCertificateTransactionDocumentData>>;
  beginningOfPYDate: Date;
  endOfPYDate: Date;
}) {
  const numPreferredSharesPrePY = certData
    // get all worksheets with "preferred" in the name
    .filter((ws) => ws.name.toLowerCase().indexOf('preferred') !== -1)
    .map((ws) =>
      // get the number of shares authorized prior to the beginning of the year
      ws.rows.reduce((sum, row) => {
        const date = new Date(row[ws.map.date]);
        if (date < beginningOfPYDate) {
          return sum + Number(row[ws.map.sharesAuthorized]);
        } else {
          return sum;
        }
      }, 0),
    )
    .reduce((sum, v) => sum + v, 0);

  const amtPreferredSharesPrePY = certData
    // get all worksheets with "preferred" in the name
    .filter((ws) => ws.name.toLowerCase().indexOf('preferred') !== -1)
    .map((ws) =>
      // get the number of shares authorized prior to the beginning of the year
      ws.rows.reduce((sum, row) => {
        const date = new Date(row[ws.map.date]);
        if (date < beginningOfPYDate) {
          return sum + Number(row[ws.map.carryingValue]);
        } else {
          return sum;
        }
      }, 0),
    )
    .reduce((sum, v) => sum + v, 0);

  const numCommonSharesPrePY = certData
    // get all worksheets with "common" in the name
    .filter((ws) => ws.name.toLowerCase().indexOf('common') !== -1)
    .map((ws) =>
      // get the number of shares authorized prior to the beginning of the year
      ws.rows.reduce((sum, row) => {
        const date = new Date(row[ws.map.date]);
        if (date < beginningOfPYDate) {
          return sum + Number(row[ws.map.sharesAuthorized]);
        } else {
          return sum;
        }
      }, 0),
    )
    .reduce((sum, v) => sum + v, 0);

  const amtCommonSharesPrePY = certData
    // get all worksheets with "common" in the name
    .filter((ws) => ws.name.toLowerCase().indexOf('common') !== -1)
    .map((ws) =>
      // get the number of shares authorized prior to the beginning of the year
      ws.rows.reduce((sum, row) => {
        const date = new Date(row[ws.map.date]);
        if (date < beginningOfPYDate) {
          return sum + Number(row[ws.map.carryingValue]);
        } else {
          return sum;
        }
      }, 0),
    )
    .reduce((sum, v) => sum + v, 0);

  /**
   * Previous year
   */
  const numPreferredSharesPY = certData
    // get all worksheets with "preferred" in the name
    .filter((ws) => ws.name.toLowerCase().indexOf('preferred') !== -1)
    .map((ws) =>
      // get the number of shares authorized prior to the beginning of the year
      ws.rows.reduce((sum, row) => {
        const date = new Date(row[ws.map.date]);
        if (date >= beginningOfPYDate && date <= endOfPYDate) {
          return sum + Number(row[ws.map.sharesAuthorized]);
        } else {
          return sum;
        }
      }, 0),
    )
    .reduce((sum, v) => sum + v, 0);

  const amtPreferredSharesPY = certData
    // get all worksheets with "preferred" in the name
    .filter((ws) => ws.name.toLowerCase().indexOf('preferred') !== -1)
    .map((ws) =>
      // get the number of shares authorized prior to the beginning of the year
      ws.rows.reduce((sum, row) => {
        const date = new Date(row[ws.map.date]);
        if (date >= beginningOfPYDate && date <= endOfPYDate) {
          return sum + Number(row[ws.map.carryingValue]);
        } else {
          return sum;
        }
      }, 0),
    )
    .reduce((sum, v) => sum + v, 0);

  const numCommonSharesPY = certData
    // get all worksheets with "common" in the name
    .filter((ws) => ws.name.toLowerCase().indexOf('common') !== -1)
    .map((ws) =>
      // get the number of shares authorized prior to the beginning of the year
      ws.rows.reduce((sum, row) => {
        const date = new Date(row[ws.map.date]);
        if (date >= beginningOfPYDate && date <= endOfPYDate) {
          return sum + Number(row[ws.map.sharesAuthorized]);
        } else {
          return sum;
        }
      }, 0),
    )
    .reduce((sum, v) => sum + v, 0);

  const amtCommonSharesPY = certData
    // get all worksheets with "common" in the name
    .filter((ws) => ws.name.toLowerCase().indexOf('common') !== -1)
    .map((ws) =>
      // get the number of shares authorized prior to the beginning of the year
      ws.rows.reduce((sum, row) => {
        const date = new Date(row[ws.map.date]);
        if (date >= beginningOfPYDate && date <= endOfPYDate) {
          return sum + Number(row[ws.map.carryingValue]);
        } else {
          return sum;
        }
      }, 0),
    )
    .reduce((sum, v) => sum + v, 0);
  /**
   * Current year
   */
  const numPreferredSharesCY = certData
    // get all worksheets with "preferred" in the name
    .filter((ws) => ws.name.toLowerCase().indexOf('preferred') !== -1)
    .map((ws) =>
      // get the number of shares authorized prior to the beginning of the year
      ws.rows.reduce((sum, row) => {
        const date = new Date(row[ws.map.date]);
        if (date > endOfPYDate) {
          return sum + Number(row[ws.map.sharesAuthorized]);
        } else {
          return sum;
        }
      }, 0),
    )
    .reduce((sum, v) => sum + v, 0);

  const amtPreferredSharesCY = certData
    // get all worksheets with "preferred" in the name
    .filter((ws) => ws.name.toLowerCase().indexOf('preferred') !== -1)
    .map((ws) =>
      // get the number of shares authorized prior to the beginning of the year
      ws.rows.reduce((sum, row) => {
        const date = new Date(row[ws.map.date]);
        if (date > endOfPYDate) {
          return sum + Number(row[ws.map.carryingValue]);
        } else {
          return sum;
        }
      }, 0),
    )
    .reduce((sum, v) => sum + v, 0);

  const numCommonSharesCY = certData
    // get all worksheets with "common" in the name
    .filter((ws) => ws.name.toLowerCase().indexOf('common') !== -1)
    .map((ws) =>
      // get the number of shares authorized prior to the beginning of the year
      ws.rows.reduce((sum, row) => {
        const date = new Date(row[ws.map.date]);
        if (date > endOfPYDate) {
          return sum + Number(row[ws.map.sharesAuthorized]);
        } else {
          return sum;
        }
      }, 0),
    )
    .reduce((sum, v) => sum + v, 0);

  const amtCommonSharesCY = certData
    // get all worksheets with "common" in the name
    .filter((ws) => ws.name.toLowerCase().indexOf('common') !== -1)
    .map((ws) =>
      // get the number of shares authorized prior to the beginning of the year
      ws.rows.reduce((sum, row) => {
        const date = new Date(row[ws.map.date]);
        if (date > endOfPYDate) {
          return sum + Number(row[ws.map.carryingValue]);
        } else {
          return sum;
        }
      }, 0),
    )
    .reduce((sum, v) => sum + v, 0);
  ////

  return {
    numPreferredSharesPrePY: numPreferredSharesPrePY,
    amtPreferredSharesPrePY: fIn(amtPreferredSharesPrePY),
    numCommonSharesPrePY,
    amtCommonSharesPrePY: fIn(amtCommonSharesPrePY),

    numPreferredSharesPY: numPreferredSharesPY,
    amtPreferredSharesPY: fIn(amtPreferredSharesPY),
    numCommonSharesPY,
    amtCommonSharesPY: fIn(amtCommonSharesPY),

    numPreferredSharesCY: numPreferredSharesCY,
    amtPreferredSharesCY: fIn(amtPreferredSharesCY),
    numCommonSharesCY,
    amtCommonSharesCY: fIn(amtCommonSharesCY),
  };
}

export async function getSBCReportData(auditId: AuditId) {
  const documentIds = (await getDataForRequestAttribute2(
    auditId,
    'equity',
    'stockBasedCompDocumentId',
  )) as DocumentId[];

  if (!documentIds || documentIds.length === 0) {
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
  const commonOutstanding = optionValuesSheet.rows.reduce((sum, row) => {
    return sum + Number(row[optionValuesCol]);
  }, 0);
  return {
    commonOutstanding,
  };
}
