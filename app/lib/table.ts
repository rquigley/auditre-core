import { addFP } from './util';

export class Table {
  rows: Row[] = [];
  _columns: Column[] = [];
  debug: boolean;

  constructor(debug?: boolean) {
    this.debug = debug || false;
  }

  private get lastRowNumber() {
    let n = this.rows.length;
    while (n > 0 && this.rows[n - 1] === undefined) {
      n--;
    }
    this.debug && console.log('last row number', n);
    return n;
  }

  private get nextRow() {
    return this.lastRowNumber;
  }

  get lastRow() {
    if (this.rows.length) {
      return this.rows[this.rows.length - 1];
    }
    return undefined;
  }

  get columns() {
    return this._columns;
  }

  set columns(columns: { style?: Style }[]) {
    this._columns = columns.map((props, i) => {
      const col = new Column(this, i);
      if (props.style) {
        col.style = props.style;
      }
      return col;
    });
  }

  getColumn(n: number) {
    let col = this._columns[n];
    if (!col) {
      col = this._columns[n] = new Column(this, n);
    }
    return col;
  }

  getRow(n: number) {
    let row = this.rows[n];
    if (!row) {
      row = this.rows[n] = new Row(this, n);
    }
    return row;
  }

  getRowById(id: string) {
    const row = this.rows.find((r) => r && r.id === id);
    if (!row) {
      throw new Error(`Row not found: ${id}`);
    }
    return row;
  }

  getCell(row: number, column: number) {
    return this.getRow(row).cells[column];
  }

  getCellByIdAndCol(id: string, column: number) {
    return this.getRowById(id).cells[column];
  }

  getAddressRange(cell: Cell, rows: Row[], rowOffset: number = 0) {
    let isContinuous = true;
    for (let n = 0; n < rows.length; n++) {
      if (rows[n].number !== rows[0].number + n) {
        isContinuous = false;
        break;
      }
    }
    if (isContinuous) {
      const start = rows[0].number + rowOffset;
      const end = rows[rows.length - 1].number + rowOffset;
      return `${cell.columnLetter}${start}:${cell.columnLetter}${end}`;
    } else {
      return rows
        .map((row) => `${cell.columnLetter}${row.number + rowOffset}`)
        .join(',');
    }
  }

  duplicateColumn(sourceCol: number, targetCol: number) {
    const source = this.getColumn(sourceCol);
    const target = this.getColumn(targetCol);
    target.style = source.style;

    this.rows.forEach((row) => {
      const cell = row.cells[sourceCol];
      const newCell = new Cell(row.number, targetCol, this);
      newCell.value = cell?.rawValue();
      newCell.style = cell?.style;
      row.cells[targetCol] = newCell;
    });
  }

  addRow(
    values: (typeof Cell.prototype._value)[],
    opts: {
      id?: string;
      tags?: string[];
      style?: Style;
      cellStyle?: Style[];
    } = {},
  ): Row {
    const rowNo = this.nextRow;
    this.debug && console.log('addRow', rowNo, values);
    const row = this.getRow(rowNo);
    row.values = values;
    if (values.length > this.columns.length) {
      this.columns = values.map((_, i) => new Column(this, i));
    }
    if (opts.id) {
      if (this.rows.find((r) => r && r.id === opts.id)) {
        throw new Error(`Duplicate row id: ${opts.id}`);
      }
      row.id = opts.id;
    }
    if (opts.style) {
      row.style = opts.style;
    }
    if (opts.tags) {
      row.tags = opts.tags;
    }
    if (opts.cellStyle) {
      const cellStyle = opts.cellStyle;
      row.cells.forEach((cell, i) => {
        if (cellStyle[i]) {
          cell.style = cellStyle[i];
        }
      });
    }
    return row;
  }

  getRowsByTag(tag: string) {
    // const rows = this.rows.filter((row) => row.tags.includes(tag));
    return this.rows.filter((row) => row.tags.includes(tag));
  }

  addColumnCellsByTag(column: number, tag: string) {
    const values = this.getRowsByTag(tag).map(
      (row) => row.cells[column].value,
    ) as number[];

    return addFP(...values);
  }
}

export class Row {
  table: Table;
  number: number;
  style: Style = {};
  cells: Cell[];
  tags: string[];
  id?: string;

  constructor(table: Table, number: number) {
    this.table = table;
    this.number = number;
    this.id = undefined;

    this.cells = [];
    this.tags = [];
  }

  get values() {
    return this.cells.map((cell) => cell.value);
  }

  set values(values) {
    this.cells = values.map((value, i) => {
      const cell = new Cell(this.number, i, this.table);
      cell.value = value;
      cell.style = {};
      return cell;
    });
  }

  hasTag(tag: string) {
    return this.tags.includes(tag);
  }
}

export class Column {
  table: Table;
  number: number;
  style: Style = {};
  cells: Cell[];

  constructor(table: Table, number: number) {
    this.table = table;
    this.number = number;
    this.cells = [];
  }

  get values() {
    return this.cells.map((cell) => cell.value);
  }

  set values(values) {
    this.cells = values.map((value, i) => {
      const cell = new Cell(this.number, i, this.table);
      cell.value = value;
      cell.style = {};
      return cell;
    });
  }
}

export class Cell {
  table: Table;
  _value: number | string | { operation: string; args: string[] } | undefined;
  _style: Style = {};

  row: number;
  column: number;

  constructor(row: number, column: number, table: Table) {
    if (row < 0 || column < 0) {
      throw new Error('Invalid row/column');
    }

    this.row = row;
    this.column = column;
    this.table = table;
  }

  get columnLetter() {
    return columnToLetter(this.column);
  }

  get address() {
    return `${columnToLetter(this.column)}${this.row + 1}`;
  }

  get style() {
    return {
      ...this.table.getColumn(this.column).style,
      ...this.table.getRow(this.row).style,
      ...this._style,
    };
  }

  set style(style: Style) {
    this._style = style;
  }

  set value(value: typeof Cell.prototype._value) {
    this._value = value;
  }

  rawValue() {
    return this._value;
  }

  get value() {
    if (typeof this._value === 'object' && this._value.operation) {
      if (this._value.operation === 'addColumnCellsByTag') {
        return this.table.addColumnCellsByTag(this.column, this._value.args[0]);
      }
    }
    return this._value;
  }
}

type NumFmt = 'accounting' | 'currency' | 'date' | 'number' | 'percent';

export type Style = {
  bold?: boolean;
  borderBottom?: 'thin' | 'double';
  borderTop?: 'thin' | 'double';
  hideCurrency?: boolean;
  indent?: boolean;
  numFmt?: NumFmt | { type: NumFmt; cents?: boolean };
  padTop?: boolean;
  align?: 'center' | 'left' | 'right';
};

export function columnToLetter(n: number) {
  let s = '';
  while (n >= 0) {
    s = String.fromCharCode((n % 26) + 97) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s.toUpperCase();
}
