import { Parser } from 'hot-formula-parser';

import type { AccountType } from './finance';
import type { Table } from './table';
import type { AuditData } from '@/controllers/audit';

export function getParser(table: Table, data: AuditData) {
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
    return data.totalsNew[year].get(account as AccountType);
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
    return table.getRowsByTag(tag).reduce((acc, row) => {
      const cell = row.cells[column];
      if (!cell) {
        const msg = `SUMTAGCOL: cell doesn't exist ${String(params)}`;
        console.log(msg);
        throw new Error(msg);
      }
      return acc + Number(parseCell(cell.value || ''));
    }, 0);
  });

  return parser;
}
