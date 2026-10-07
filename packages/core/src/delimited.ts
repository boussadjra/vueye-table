/**
 * Delimited text: tab-separated for the clipboard, comma-separated for export.
 *
 * A field is quoted when it holds the delimiter, a quote, or a line break, and quotes inside it
 * are doubled. This is what spreadsheet applications write and read.
 */

function quote(field: string, delimiter: string): string {
  return field.includes(delimiter) ||
    field.includes('"') ||
    field.includes("\n") ||
    field.includes("\r")
    ? `"${field.replaceAll('"', '""')}"`
    : field;
}

/** Escape formula-like display text; a finite number formatted as a number stays numeric. */
export function escapeFormula(text: string, value?: unknown): string {
  const numeric =
    typeof value === "number" &&
    Number.isFinite(value) &&
    /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/u.test(text);
  return !numeric && /^[=+\-@\t\r\n＝＋－＠]/u.test(text) ? "'" + text : text;
}

export interface DelimitedLimits {
  readonly maxRows: number;
  readonly maxColumns: number;
  readonly maxCells: number;
  readonly maxLength: number;
}

export interface DelimitedResult {
  readonly rows: string[][];
  readonly truncated: boolean;
}

/** Write a matrix of text as delimited lines joined with `\n`. */
export function toDelimited(matrix: readonly (readonly string[])[], delimiter = "\t"): string {
  return matrix
    .map((line) => line.map((field) => quote(field, delimiter)).join(delimiter))
    .join("\n");
}

/**
 * Read delimited text into a matrix. Accepts `\n` and `\r\n`, quoted fields with doubled quotes
 * and embedded line breaks, and ignores one trailing line break.
 */
export function parseDelimited(text: string, delimiter = "\t"): string[][] {
  return readDelimited(
    text,
    {
      maxRows: Infinity,
      maxColumns: Infinity,
      maxCells: Infinity,
      maxLength: Infinity,
    },
    delimiter,
  ).rows;
}

/** Read complete fields within a grid and work budget, without materializing discarded fields. */
export function readDelimited(
  text: string,
  limits: DelimitedLimits,
  delimiter = "\t",
): DelimitedResult {
  const rows: string[][] = [];
  if (limits.maxRows === 0 || limits.maxColumns === 0) {
    return { rows, truncated: text.length > 0 };
  }
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let started = false;
  let index = 0;
  let column = 0;
  let cells = 0;
  let truncated = false;
  const end = Math.min(text.length, limits.maxLength);

  const endField = (): void => {
    if (column < limits.maxColumns) {
      row.push(field);
    } else {
      truncated = true;
    }
    column += 1;
    cells += 1;
    field = "";
    started = false;
  };
  const append = (char: string): void => {
    if (column < limits.maxColumns) {
      field += char;
    }
  };

  while (index < end) {
    const char = text.charAt(index);
    if (quoted) {
      if (char === '"') {
        if (index + 1 < end && text.charAt(index + 1) === '"') {
          append('"');
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        append(char);
      }
    } else if (char === '"' && !started) {
      quoted = true;
    } else if (char === delimiter) {
      endField();
      index += 1;
      if (
        cells >= limits.maxCells ||
        (rows.length + 1 >= limits.maxRows && column >= limits.maxColumns)
      ) {
        rows.push(row);
        return { rows, truncated: true };
      }
      continue;
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && index + 1 < end && text.charAt(index + 1) === "\n") {
        index += 1;
      }
      endField();
      rows.push(row);
      row = [];
      column = 0;
      index += 1;
      if (cells >= limits.maxCells || rows.length >= limits.maxRows) {
        return { rows, truncated: truncated || index < text.length };
      }
      continue;
    } else {
      append(char);
    }
    started = true;
    index += 1;
  }

  if (end < text.length) {
    // A field cut short by the character budget must never become a different cell value.
    if (row.length > 0) {
      rows.push(row);
    }
    return { rows, truncated: true };
  }
  if (started || column > 0) {
    endField();
    rows.push(row);
  }
  return { rows, truncated };
}
