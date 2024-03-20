import { Parser } from '@/lib/formula-parser/index';

import type { AccountType } from './finance';
import type { Table } from './table';
import type { AuditData } from '@/controllers/audit';

export function getParser(table: Table, data: AuditData) {
  const parser = new Parser();

  function parseCell(value: string | number | undefined, cellAddress: string) {
    if (typeof value === 'string' && value.startsWith('=')) {
      const parsed = parser.parse(value.substring(1), cellAddress);
      if (parsed.error) {
        throw new Error(parsed.error);
      } else {
        return parsed.result;
      }
    } else {
      return value;
    }
  }

  parser.on('callCellValue', (cellCoord, done, cellAddress) => {
    if (!cellAddress) {
      throw new Error('No cell address');
    }

    const cell = table.getCellByAddress(cellCoord.label);
    done(parseCell(cell.value, cellAddress));
  });

  parser.on(
    'callRangeValue',
    (startCellCoord, endCellCoord, done, cellAddress) => {
      if (!cellAddress) {
        throw new Error('No cell address');
      }

      const range = table.getRange(
        startCellCoord.label,
        endCellCoord.label,
        cellAddress,
      );
      done(range.map((cell) => parseCell(cell.value, cell.address)));
    },
  );

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

    const [account, yearType] = params as [string, string];
    if (!isYearType(yearType)) {
      throw new Error(`TBLOOKUP: Invalid yearType: ${yearType}`);
    }

    return data.totals[yearType].get(account as AccountType);
  });

  parser.on('callFunction', function (name, params, done) {
    if (name === 'IF') {
      if (!Array.isArray(params) || params.length !== 3) {
        console.log(`Invalid IF ${String(params)}`);
        throw new Error('Invalid IF');
      }
      done(params[0] ? params[1] : params[2]);
    }
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
    return parseCell(cell.value || '', cell.address);
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

    const [yearType] = params as [string];
    const netLossRow = data.incomeStatementTable.getRowById('NET-LOSS');
    let val;
    if (yearType === 'CY') {
      val = netLossRow.cells[1].value;
    } else if (yearType === 'PY') {
      val = netLossRow.cells[2].value;
    } else if (yearType === 'PY2') {
      throw new Error(`IS_NETLOSS: No IS for PY2`);
    } else {
      throw new Error(`IS_NETLOSS: Invalid year: ${yearType}`);
    }
    if (typeof val !== 'string') {
      throw new Error(`IS_NETLOSS: Invalid value: ${val}`);
    }
    const parser2 = getParser(data.incomeStatementTable, data);
    return parser2.parse(val.substring(1)).result;
  });

  parser.setFunction('TB_NETLOSS', (params) => {
    if (
      !Array.isArray(params) ||
      params.length !== 1 ||
      typeof params[0] !== 'string'
    ) {
      console.log(`Invalid TB_NETLOSS ${String(params)}`);
      throw new Error('Invalid TB_NETLOSS');
    }

    const [yearType] = params as [string];
    if (!isYearType(yearType)) {
      throw new Error(`TB_NETLOSS: Invalid yearType: ${yearType}`);
    }

    return data.totals[yearType].getTotalForGroup('INCOME_STATEMENT');
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
    return table.getRowsByTag(tag).reduce((acc, row) => {
      const cell = row.cells[column];
      if (!cell) {
        const msg = `SUMTAGCOL: cell doesn't exist ${String(params)}`;
        console.log(msg);
        throw new Error(msg);
      }
      return acc + Number(parseCell(cell.value || '', cell.address));
    }, 0);
  });

  parser.setFunction('CF', (params) => {
    if (
      !Array.isArray(params) ||
      params.length !== 2 ||
      typeof params[0] !== 'string' ||
      typeof params[1] !== 'string'
    ) {
      console.log(`Invalid CF ${String(params)}`);
      throw new Error('Invalid CF');
    }

    const [cfType, yearType] = params as [string, string];
    if (!isYearType(yearType)) {
      throw new Error(`CF: Invalid yearType: ${yearType}`);
    }
    const prevType = getPrevType(yearType);
    if (!isCFType(cfType)) {
      throw new Error(`CF: Invalid cfType: ${cfType}`);
    }
    return (
      data.cashFlow[yearType][cfType].balance -
      data.cashFlow[prevType][cfType].balance
    );
  });

  return parser;
}

type YearType = 'CY' | 'PY' | 'PY2';
export function isYearType(yearType: string): yearType is YearType {
  return yearType === 'CY' || yearType === 'PY' || yearType === 'PY2';
}

export function isCFType(
  cfType: string,
): cfType is 'stockBasedComp' | 'depreciation' | 'TODO' {
  return (
    cfType === 'stockBasedComp' ||
    cfType === 'depreciation' ||
    cfType === 'TODO'
  );
}

export function getPrevType(yearType: YearType) {
  if (yearType === 'CY') {
    return 'PY';
  } else if (yearType === 'PY') {
    return 'PY2';
  } else {
    throw new Error('Cannot determine prev type from PY2');
  }
}

export function yearTypeToYear(yearType: string, data: AuditData) {
  switch (yearType) {
    case 'CY':
      return data.year;
    case 'PY':
      return data.prevYear;
    case 'PY2':
      return data.prevYear2;
    default:
      throw new Error(`Invalid yearType: ${yearType}`);
  }
}
