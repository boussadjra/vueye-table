import { issue, type TableIssue } from "./issues";
import type { TableRow } from "./row";
import { rowList } from "./row-list";
import type { RowKey, RowPinning } from "./state";

export interface ResolvedRowPins {
  readonly pinning: RowPinning;
  readonly keys: ReadonlySet<RowKey>;
  readonly issues: readonly TableIssue[];
}

/** Manual pages can resolve a pending pin later; client data has a complete key space. */
export function resolveRowPins(
  pinning: RowPinning,
  byKey: { has(key: RowKey): boolean },
  manual: boolean,
): ResolvedRowPins {
  const issues: TableIssue[] = [];
  const keys = new Set<RowKey>();
  const resolve = (region: readonly RowKey[]): readonly RowKey[] => {
    const result = region.filter((key) => {
      if (byKey.has(key)) {
        keys.add(key);
        return true;
      }
      issues.push(
        issue(
          manual ? "unresolved_pinned_row" : "stale_pinned_row",
          manual
            ? "The pinned row is not supplied on this manual page; its key is retained until the host supplies it."
            : "The pinned row no longer resolves and its key is removed.",
          { rowKey: key },
        ),
      );
      return manual;
    });
    return result.length === region.length ? region : result;
  };
  const top = resolve(pinning.top);
  const bottom = resolve(pinning.bottom);
  return {
    pinning: top === pinning.top && bottom === pinning.bottom ? pinning : { top, bottom },
    keys,
    issues,
  };
}

/** Keep the default path lazy and unchanged when no row is pinned. */
export function centreRows<TRow>(
  rows: readonly TableRow<TRow>[],
  keys: ReadonlySet<RowKey>,
): readonly TableRow<TRow>[] {
  return keys.size ? rows.filter((row) => !keys.has(row.key)) : rows;
}

/** A readonly view rather than a copy of an unpaginated centre. */
export function joinRowRegions<TRow>(
  top: readonly TableRow<TRow>[],
  centre: readonly TableRow<TRow>[],
  bottom: readonly TableRow<TRow>[],
): readonly TableRow<TRow>[] {
  if (!top.length && !bottom.length) return centre;
  return rowList(top.length + centre.length + bottom.length, (index) =>
    index < top.length
      ? top[index]!
      : index < top.length + centre.length
        ? centre[index - top.length]!
        : bottom[index - top.length - centre.length]!,
  );
}
