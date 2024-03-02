export class Table {
  rows: Row[] = [];
  _columns: Column[] = [];
  debug: boolean;
  name: string;

  // hacking around limitations of hot-formula-parser
  UNSAFE_outputRowOffset: number = 0;

  constructor(name: string, debug?: boolean) {
    this.name = name;
    this.debug = debug || false;
    this.UNSAFE_outputRowOffset = 0;
  }

  get lastRowNumber() {
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

  getCellByAddress(address: string) {
    const match = address.match(/^([A-Za-z]+)(\d+)$/);
    if (!match) {
      throw new Error(`Invalid address: ${address}`);
    }
    const col = letterToColumn(match[1]);
    const row = parseInt(match[2], 10) - 1;
    return this.getCell(row, col);
  }

  getCellByIdAndCol(id: string, column: number) {
    return this.getRowById(id).cells[column];
  }

  getValue(rowId: string, column: number) {
    return this.getCellByIdAndCol(rowId, column)?.value || '';
  }

  getRange(
    startCellAddr: string,
    endCellAddr: string,
    currentCellAddr: string,
  ) {
    const startCell = this.getCellByAddress(startCellAddr);
    const startRow = startCell.row;
    const endCell = this.getCellByAddress(endCellAddr);
    const endRow = endCell.row;
    const startColumn = startCell.column;
    const endColumn = endCell.column;

    const ret = [];
    for (let row = startRow; row <= endRow; row++) {
      for (let column = startColumn; column <= endColumn; column++) {
        ret.push(this.getCell(row, column));
      }
    }
    return ret;
  }

  /**
   * @deprecated - use getRange instead
   */
  getAddressRange(colNum: number, rows: Row[], rowOffset: number) {
    const isContinuous =
      rows.every((row, i) => row.rowNum === rows[0].rowNum + i) &&
      rows.length === rows[rows.length - 1].rowNum - rows[0].rowNum + 1;

    const colLetter = columnToLetter(colNum);
    if (isContinuous) {
      const start = rows[0].rowNum + 1 + rowOffset;
      const end = rows[rows.length - 1].rowNum + rowOffset + 1;
      return `${colLetter}${start}:${colLetter}${end}`;
    } else {
      return rows
        .map((row) => `${colLetter}${row.rowNum + rowOffset + 1}`)
        .join(',');
    }
  }

  offsetAddress(address: string, rowOffset: number, colOffset: number) {
    const match = address.match(/^([A-Za-z]+)(\d+)$/);
    if (!match) {
      throw new Error(`Invalid address: ${address}`);
    }
    let col = match[1];
    if (colOffset) {
      col = columnToLetter(letterToColumn(col) + colOffset);
    }
    let row = parseInt(match[2], 10);
    if (rowOffset) {
      row += rowOffset;
    }
    return `${col}${row}`;
  }

  duplicateColumn(sourceCol: number, targetCol: number) {
    const source = this.getColumn(sourceCol);
    const target = this.getColumn(targetCol);
    target.style = source.style;

    this.rows.forEach((row) => {
      const cell = row.cells[sourceCol];
      const newCell = new Cell(row.rowNum, targetCol, this);
      newCell.value = cell?.rawValue();
      newCell.style = cell?.style;
      row.cells[targetCol] = newCell;
    });
  }

  addRow(
    values: (typeof Cell.prototype._value)[],
    opts: {
      id?: string;
      tbAccountTypeLookupRef?: string;
      tags?: string[];
      style?: Style;
      cellStyle?: Style[];
      cellNames?: string[];
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
    if (opts.tbAccountTypeLookupRef) {
      row.tbAccountTypeLookupRef = opts.tbAccountTypeLookupRef;
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
    if (opts.cellNames) {
      const cellNames = opts.cellNames;
      row.cells.forEach((cell, i) => {
        if (cellNames[i]) {
          cell.name = cellNames[i];
        }
      });
    }
    return row;
  }

  getRowsByTag(tag: string) {
    return this.rows.filter((row) => row.tags.includes(tag));
  }
}

export class Row {
  table: Table;
  rowNum: number;
  style: Style = {};
  cells: Cell[];
  tags: string[];
  id?: string;
  tbAccountTypeLookupRef?: string;

  constructor(table: Table, rowNum: number) {
    this.table = table;
    this.rowNum = rowNum;
    this.id = undefined;
    this.tbAccountTypeLookupRef = undefined;

    this.cells = [];
    this.tags = [];
  }

  get values() {
    return this.cells.map((cell) => cell.value);
  }

  set values(values) {
    this.cells = values.map((value, i) => {
      const cell = new Cell(this.rowNum, i, this.table);
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
  colNum: number;
  style: Style = {};
  cells: Cell[];

  constructor(table: Table, colNum: number) {
    this.table = table;
    this.colNum = colNum;
    this.cells = [];
  }

  get values() {
    return this.cells.map((cell) => cell.value);
  }

  set values(values) {
    this.cells = values.map((value, i) => {
      const cell = new Cell(this.colNum, i, this.table);
      cell.value = value;
      cell.style = {};
      return cell;
    });
  }
}

export class Cell {
  table: Table;
  _value: number | string | undefined;
  _style: Style = {};

  row: number;
  column: number;
  name: string;

  constructor(row: number, column: number, table: Table) {
    if (row < 0 || column < 0) {
      throw new Error('Invalid row/column');
    }

    this.row = row;
    this.column = column;
    this.table = table;
    this.name = '';
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
    return this._value;
  }
}

type NumFmt = 'accounting' | 'currency' | 'date' | 'number' | 'percent';

export type Style = {
  bold?: boolean;
  borderBottom?: 'thin' | 'double';
  borderTop?: 'thin' | 'double';
  hideCurrency?: boolean;
  indent?: number;
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

export function letterToColumn(letter: string) {
  let column = 0;
  const length = letter.length;
  for (let i = 0; i < length; i++) {
    column += (letter.charCodeAt(i) - 64) * Math.pow(26, length - i - 1);
  }
  return column - 1;
}
