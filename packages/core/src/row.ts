import type { TableColumn } from "./column";
import type { RowKey } from "./state";

/**
 * One row of data as the engine sees it: its key, its position in the source data, and cached
 * access to each column's value and text.
 */
export interface TableRow<TRow> {
  readonly key: RowKey;
  /** Position in the data the table was given. */
  readonly index: number;
  readonly original: TRow;
  getValue(columnId: string): unknown;
  /** The formatted text of a cell, as shown, searched, copied, and exported. */
  getDisplay(columnId: string): string;
}

export function createRow<TRow>(
  original: TRow,
  key: RowKey,
  index: number,
  columns: ReadonlyMap<string, TableColumn<TRow>>,
): TableRow<TRow> {
  const values = new Map<string, unknown>();
  const displays = new Map<string, string>();

  const getValue = (columnId: string): unknown => {
    if (values.has(columnId)) {
      return values.get(columnId);
    }
    const value = columns.get(columnId)?.getValue(original);
    values.set(columnId, value);
    return value;
  };

  return Object.freeze({
    key,
    index,
    original,
    getValue,
    getDisplay(columnId: string): string {
      const cached = displays.get(columnId);
      if (cached !== undefined) {
        return cached;
      }
      const column = columns.get(columnId);
      const display = column ? column.format(getValue(columnId), original) : "";
      displays.set(columnId, display);
      return display;
    },
  });
}
