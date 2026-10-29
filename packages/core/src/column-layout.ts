import type { ColumnPinSide, TableColumn } from "./column";
import { issue, type TableIssue } from "./issues";
import type { ColumnPinning } from "./state";

interface ColumnLayout<TRow> {
  readonly all: readonly TableColumn<TRow>[];
  readonly visible: readonly TableColumn<TRow>[];
  readonly byId: ReadonlyMap<string, TableColumn<TRow>>;
  readonly pinnedStartWidth: number;
  readonly pinnedEndWidth: number;
  readonly issues: readonly TableIssue[];
}

/** View-only layout; row stages continue to use the original resolved columns. */
export function layoutColumns<TRow>(
  columns: readonly TableColumn<TRow>[],
  columnOrder: readonly string[],
  hiddenColumns: readonly string[],
  pinning: ColumnPinning,
): ColumnLayout<TRow> {
  const byId = new Map(columns.map((column) => [column.id, column]));
  const positions = new Map(columnOrder.map((id, index) => [id, index]));
  const ordered = columns
    .map((column, index) => ({ column, index }))
    .toSorted(
      (a, b) =>
        (positions.get(a.column.id) ?? columnOrder.length + a.index) -
        (positions.get(b.column.id) ?? columnOrder.length + b.index),
    )
    .map(({ column }) => column);
  const hidden = new Set(hiddenColumns);
  const issues: TableIssue[] = [];
  const endIds = new Set(pinning.end);
  const conflicts = new Set(pinning.start.filter((id) => endIds.has(id)));
  const reported = new Set<string>();
  const pinned = new Map<string, ColumnPinSide>();
  const regions: Record<ColumnPinSide, TableColumn<TRow>[]> = { start: [], end: [] };
  for (const side of ["start", "end"] as const) {
    const seen = new Set<string>();
    for (const id of pinning[side]) {
      const duplicate = seen.has(id) || conflicts.has(id);
      seen.add(id);
      if (duplicate && !reported.has(id)) {
        issues.push(
          issue(
            "duplicate_column_pin",
            conflicts.has(id)
              ? `Column "${id}" is pinned to both sides; its pin is ignored.`
              : `Column "${id}" repeats in the ${side} pins; only its first entry is used.`,
            { column: id },
          ),
        );
        reported.add(id);
      }
      if (duplicate) continue;
      const column = byId.get(id);
      // Unknown ids are reported with other state references by the table.
      if (!column) continue;
      if (!column.pinnable) {
        issues.push(
          issue("column_not_pinnable", `Column "${id}" cannot be pinned; its pin is ignored.`, {
            column: id,
          }),
        );
        continue;
      }
      let width = column.width;
      if (width === undefined || !Number.isFinite(width) || width <= 0) {
        width =
          column.minWidth !== undefined && Number.isFinite(column.minWidth) && column.minWidth > 0
            ? column.minWidth
            : 120;
        issues.push(
          issue(
            "unsized_pinned_column",
            `Pinned column "${id}" has no usable width; ${width} pixels are used.`,
            { column: id },
          ),
        );
      }
      const next = Object.freeze({ ...column, width, pinned: side });
      pinned.set(id, side);
      regions[side].push(next);
    }
  }
  const widths: Record<ColumnPinSide, number> = { start: 0, end: 0 };
  for (const side of ["start", "end"] as const) {
    const visible = regions[side].filter((column) => !hidden.has(column.id));
    const edge = side === "start" ? visible.at(-1)?.id : visible[0]?.id;
    const traversal = side === "start" ? regions[side] : [...regions[side]].reverse();
    for (const column of traversal) {
      const isVisible = !hidden.has(column.id);
      byId.set(
        column.id,
        Object.freeze({
          ...column,
          pinOffset: isVisible ? widths[side] : 0,
          isPinnedEdge: isVisible && column.id === edge,
        }),
      );
      if (isVisible) widths[side] += column.width!;
    }
  }
  const all = Object.freeze([
    ...regions.start.map((column) => byId.get(column.id)!),
    ...ordered.filter((column) => !pinned.has(column.id)),
    ...regions.end.map((column) => byId.get(column.id)!),
  ]);
  return {
    all,
    visible: Object.freeze(all.filter((column) => !hidden.has(column.id))),
    byId,
    pinnedStartWidth: widths.start,
    pinnedEndWidth: widths.end,
    issues: Object.freeze(issues),
  };
}
