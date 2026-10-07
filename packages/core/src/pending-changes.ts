import type { RowKey } from "./state";
import type { CellChange } from "./table";

export interface InsertPosition {
  readonly before?: RowKey | undefined;
  readonly parent?: RowKey | undefined;
}
export interface RowChange<TRow> {
  readonly kind: "inserted" | "removed";
  readonly rowKey: RowKey;
  readonly row: TRow;
  readonly position: InsertPosition;
}
export interface UpdatedRow<TRow> {
  readonly rowKey: RowKey;
  readonly row: TRow;
  readonly previous: TRow;
  readonly changes: readonly CellChange<TRow>[];
}
export interface PendingChanges<TRow> {
  readonly inserted: readonly RowChange<TRow>[];
  readonly updated: readonly UpdatedRow<TRow>[];
  readonly removed: readonly RowChange<TRow>[];
}
export interface PendingEntry<TRow> {
  previous: TRow | undefined;
  row: TRow | undefined;
  readonly position: InsertPosition;
  readonly cells: Map<string, CellChange<TRow>>;
}

/** A saved baseline only for touched rows; viewing changes never scans source data. */
export function createPendingChanges<TRow>(): {
  readonly entries: Map<RowKey, PendingEntry<TRow>>;
  snapshot(): PendingChanges<TRow>;
  record(
    key: RowKey,
    previous: TRow | undefined,
    row: TRow | undefined,
    position: InsertPosition,
    changes: readonly CellChange<TRow>[],
  ): void;
} {
  const entries = new Map<RowKey, PendingEntry<TRow>>();
  return {
    entries,
    snapshot() {
      const inserted: RowChange<TRow>[] = [];
      const removed: RowChange<TRow>[] = [];
      const updated: UpdatedRow<TRow>[] = [];
      for (const [rowKey, entry] of entries) {
        if (entry.previous === undefined && entry.row !== undefined)
          inserted.push(
            Object.freeze({ kind: "inserted", rowKey, row: entry.row, position: entry.position }),
          );
        else if (entry.row === undefined && entry.previous !== undefined)
          removed.push(
            Object.freeze({
              kind: "removed",
              rowKey,
              row: entry.previous,
              position: entry.position,
            }),
          );
        else if (entry.row !== undefined && entry.previous !== undefined)
          updated.push(
            Object.freeze({
              rowKey,
              row: entry.row,
              previous: entry.previous,
              changes: Object.freeze([...entry.cells.values()]),
            }),
          );
      }
      return Object.freeze({
        inserted: Object.freeze(inserted),
        updated: Object.freeze(updated),
        removed: Object.freeze(removed),
      });
    },
    record(key, previous, row, position, changes) {
      const entry = entries.get(key) ?? {
        previous,
        row,
        position: Object.freeze({ ...position }),
        cells: new Map<string, CellChange<TRow>>(),
      };
      entry.row = row;
      for (const change of changes) {
        const original = entry.cells.has(change.column)
          ? entry.cells.get(change.column)!.previous
          : change.previous;
        if (Object.is(original, change.value)) entry.cells.delete(change.column);
        else entry.cells.set(change.column, Object.freeze({ ...change, previous: original }));
      }
      if (
        (entry.previous === undefined && row === undefined) ||
        (entry.previous !== undefined && row !== undefined && entry.cells.size === 0)
      )
        entries.delete(key);
      else entries.set(key, entry);
    },
  };
}
