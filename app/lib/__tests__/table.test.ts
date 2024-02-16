import { Table } from '../table';

describe('Row', () => {
  test('constructor', () => {
    const table = new Table('test');
    table.addRow([3, 4, 5]);
    const row2 = table.addRow([1, 2, 3]);
    expect(row2.values).toEqual([1, 2, 3]);
    expect(row2.rowNum).toEqual(2);
  });

  test('values getter and setter', () => {
    const table = new Table('test');
    const row = table.addRow([1, 2, 3]);
    expect(row.values).toEqual([1, 2, 3]);
  });
});

describe('Table', () => {
  test('lastRowNumber', () => {
    const table = new Table('test');
    table.addRow([]);
    expect(table.lastRow?.rowNum).toBe(1);
  });

  test('multiple rows', () => {
    const table = new Table('test');
    table.addRow([]);
    const row2 = table.addRow([1, 2, 3]);
    expect(row2.values).toEqual([1, 2, 3]);
    expect(row2.rowNum).toEqual(2);
  });
});
