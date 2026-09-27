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
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let index = 0;

  const endField = (): void => {
    row.push(field);
    field = "";
  };
  const endRow = (): void => {
    endField();
    rows.push(row);
    row = [];
  };

  while (index < text.length) {
    const char = text.charAt(index);
    if (quoted) {
      if (char === '"') {
        if (text.charAt(index + 1) === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"' && field === "") {
      quoted = true;
    } else if (char === delimiter) {
      endField();
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text.charAt(index + 1) === "\n") {
        index += 1;
      }
      endRow();
    } else {
      field += char;
    }
    index += 1;
  }

  if (field !== "" || row.length > 0) {
    endRow();
  }
  return rows;
}
