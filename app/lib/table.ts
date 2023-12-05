export class Table {
  rows: Row[] = [];
  _columns: Column[] = [];

  constructor() {}

  private get lastRowNumber() {
    let n = this.rows.length;
    while (n > 0 && this.rows[n - 1] === undefined) {
      n--;
    }
    return n;
  }

  private get nextRow() {
    return this.lastRowNumber + 1;
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
      const col = new Column(this, i + 1);
      if (props.style) {
        col.style = props.style;
      }
      return col;
    });
  }

  getRow(r: number) {
    let row = this.rows[r - 1];
    if (!row) {
      row = this.rows[r - 1] = new Row(this, r);
    }
    return row;
  }

  addRow(values: any[], style?: Style | Style[]): Row {
    const rowNo = this.nextRow;
    const row = this.getRow(rowNo);
    row.values = values;
    if (values.length > this.columns.length) {
      this.columns = values.map((_, i) => new Column(this, i + 1));
    }
    if (style) {
      if (Array.isArray(style)) {
        row.cells.forEach((cell, i) => {
          cell.style = style[i] || {};
        });
      } else {
        row.style = style;
      }
    }
    return row;
  }

  getColumn(c: number) {
    let col = this.columns[c - 1];
    if (!col) {
      col = this.columns[c - 1] = new Column(this, c);
    }
    return col;
  }
}

export class Row {
  table: Table;
  number: number;
  style: Style = {};
  cells: any[] = [];

  constructor(table: Table, number: number) {
    this.table = table;
    this.number = number;
  }

  get values() {
    return this.cells.map((cell) => cell.value);
  }

  set values(values) {
    this.cells = values.map((value, i) => {
      const cell = new Cell(this.number, i + 1, this.table);
      cell.value = value;
      cell.style = {};
      return cell;
    });
  }
}

export class Column {
  table: Table;
  number: number;
  style: Style = {};
  cells: any[] = [];

  constructor(table: Table, number: number) {
    this.table = table;
    this.number = number;
  }

  get values() {
    return this.cells.map((cell) => cell.value);
  }

  set values(values) {
    this.cells = values.map((value, i) => {
      const cell = new Cell(this.number, i + 1, this.table);
      cell.value = value;
      cell.style = {};
      return cell;
    });
  }
}

class Cell {
  table: Table;
  value: any = null;
  _style: Style = {};

  row: number;
  column: number;

  constructor(row: number, column: number, table: Table) {
    if (!row || !column) {
      throw new Error('Invalid row/column');
    }

    this.row = row;
    this.column = column;
    this.table = table;
  }

  // get address() {
  //   return `${this.columnToLetter(this.column)}${this.row}`;
  // }

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
}

export type Style = {
  bold?: boolean;
  borderBottom?: 'single' | 'double';
  borderTop?: 'single' | 'double';
  hideCurrency?: boolean;
  indent?: boolean;
  numFmt?: 'accounting' | 'currency' | 'date' | 'number' | 'percent';
  padTop?: boolean;
  align?: 'center' | 'left' | 'right';
};
