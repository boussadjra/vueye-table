import type { TableColumn } from "./column";
import type { RowKey } from "./state";
import type { ChildStatus } from "./tree";

/**
 * One row of data as the engine sees it: its key, its position in the source data, and cached
 * access to each column's value and text.
 */
export interface TableRow<TRow> {
  readonly key: RowKey;
  /** Position in the data the table was given. */
  readonly index: number;
  readonly original: TRow;
  readonly canExpand: boolean;
  readonly isExpanded: boolean;
  readonly depth: number;
  readonly parentKey: RowKey | undefined;
  readonly childCount: number | undefined;
  readonly childStatus: ChildStatus;
  /** Coverage of this row and its loaded descendants. */
  readonly selection: "none" | "some" | "all";
  getValue(columnId: string): unknown;
  /** The formatted text of a cell, as shown, searched, copied, and exported. */
  getDisplay(columnId: string): string;
}

export type RowItemKind = "row" | "detail";

/** A renderer item; detail items do not count as data rows or grid coordinates. */
export interface TableRenderItem<TRow> {
  readonly kind: RowItemKind;
  readonly key: string;
  /** The parent data row, also for detail items. */
  readonly row: TableRow<TRow>;
  /** Position of the parent in snapshot.rows. */
  readonly rowIndex: number;
}

/** Disjoint namespaces and typed keys avoid collisions between 1, "1", and detail-like ids. */
export function getRowItemKey(key: RowKey, kind: RowItemKind = "row"): string {
  return JSON.stringify([kind, typeof key, key]);
}

export function createRow<TRow>(
  original: TRow,
  key: RowKey,
  index: number,
  columns: ReadonlyMap<string, TableColumn<TRow>>,
  canExpand = false,
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
    canExpand,
    isExpanded: false,
    depth: 0,
    parentKey: undefined,
    childCount: 0,
    childStatus: "loaded" as const,
    selection: "none" as const,
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
