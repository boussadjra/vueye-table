import type { TableColumn } from "./column";
import type { TableRow } from "./row";
import type { PaginationState, SortRule } from "./state";

/**
 * The row pipeline: filter, then sort, then paginate. Each stage is a pure function, so a table
 * recomputes only the stages whose inputs changed, and a server can run the same stages.
 */

/** Split free text into lowercase terms. */
function searchTerms(search: string): readonly string[] {
  return search
    .toLowerCase()
    .split(/\s+/u)
    .filter((term) => term.length > 0);
}

/**
 * Keep rows that pass every column filter and contain every search term in at least one
 * searchable column.
 */
export function filterRows<TRow>(
  rows: readonly TableRow<TRow>[],
  columns: readonly TableColumn<TRow>[],
  search: string,
  filters: Readonly<Record<string, unknown>>,
): readonly TableRow<TRow>[] {
  const terms = searchTerms(search);
  const byId = new Map(columns.map((column) => [column.id, column]));
  const activeFilters = Object.entries(filters).flatMap(([id, value]) => {
    const column = byId.get(id);
    return column && value !== undefined ? [{ column, value }] : [];
  });
  const searchable = columns.filter((column) => column.searchable);

  if (terms.length === 0 && activeFilters.length === 0) {
    return rows;
  }

  return rows.filter((row) => {
    for (const { column, value } of activeFilters) {
      if (!column.matches(row.getValue(column.id), value, row.original)) {
        return false;
      }
    }
    if (terms.length === 0) {
      return true;
    }
    const haystack = searchable.map((column) => row.getDisplay(column.id).toLowerCase());
    return terms.every((term) => haystack.some((text) => text.includes(term)));
  });
}

/** Sort rows by each rule in turn. The sort is stable: ties keep their incoming order. */
export function sortRows<TRow>(
  rows: readonly TableRow<TRow>[],
  columns: readonly TableColumn<TRow>[],
  sorting: readonly SortRule[],
): readonly TableRow<TRow>[] {
  if (!sorting.some((rule) => columns.some((column) => column.id === rule.column))) return rows;
  return rows.toSorted(compareRows(columns, sorting));
}

export function compareRows<TRow>(
  columns: readonly TableColumn<TRow>[],
  sorting: readonly SortRule[],
): (left: TableRow<TRow>, right: TableRow<TRow>) => number {
  const byId = new Map(columns.map((column) => [column.id, column]));
  const rules = sorting.flatMap((rule) => {
    const column = byId.get(rule.column);
    return column ? [{ column, sign: rule.direction === "desc" ? -1 : 1 }] : [];
  });
  return (left, right) => {
    for (const { column, sign } of rules) {
      const leftValue = left.getValue(column.id);
      const rightValue = right.getValue(column.id);
      const leftEmpty = leftValue === null || leftValue === undefined || leftValue === "";
      const rightEmpty = rightValue === null || rightValue === undefined || rightValue === "";
      // Empty values stay last in both directions.
      if (leftEmpty !== rightEmpty) {
        return leftEmpty ? 1 : -1;
      }
      const order = column.compare(leftValue, rightValue) * sign;
      if (order !== 0) {
        return order;
      }
    }
    return 0;
  };
}

/** Stable merge: an existing row wins a tie against an incoming row. */
export function mergeRows<TRow>(
  previous: readonly TableRow<TRow>[],
  incoming: readonly TableRow<TRow>[],
  columns: readonly TableColumn<TRow>[],
  sorting: readonly SortRule[],
): readonly TableRow<TRow>[] {
  const compare = compareRows(columns, sorting);
  const added = sortRows(incoming, columns, sorting);
  const result: TableRow<TRow>[] = [];
  let left = 0;
  let right = 0;
  while (left < previous.length && right < added.length) {
    result.push(compare(previous[left]!, added[right]!) <= 0 ? previous[left++]! : added[right++]!);
  }
  while (left < previous.length) result.push(previous[left++]!);
  while (right < added.length) result.push(added[right++]!);
  return result;
}

/** The number of pages for a row count. An empty table still has one page. */
export function countPages(rowCount: number, pageSize: number): number {
  return Math.max(1, Math.ceil(rowCount / pageSize));
}

/** Clamp a page into `1..pageCount`. */
export function clampPage(page: number, pageCount: number): number {
  return Math.min(Math.max(1, Math.trunc(page) || 1), pageCount);
}

/** The rows on one page. `pagination.page` must already be clamped. */
export function paginateRows<TRow>(
  rows: readonly TableRow<TRow>[],
  pagination: PaginationState,
): readonly TableRow<TRow>[] {
  const start = (pagination.page - 1) * pagination.pageSize;
  return rows.slice(start, start + pagination.pageSize);
}

/** A page number, or a gap between page numbers. */
export type PageItem =
  | { readonly type: "page"; readonly page: number; readonly current: boolean }
  | { readonly type: "gap"; readonly key: string };

/**
 * The page buttons to show: always the first and last page, `siblings` pages on each side of the
 * current one, and a gap wherever pages are skipped. A gap never hides a single page.
 */
export function paginationItems(
  page: number,
  pageCount: number,
  siblings = 1,
): readonly PageItem[] {
  const pages = new Set<number>([1, pageCount]);
  for (let offset = -siblings; offset <= siblings; offset += 1) {
    const candidate = page + offset;
    if (candidate >= 1 && candidate <= pageCount) {
      pages.add(candidate);
    }
  }
  const sorted = [...pages].toSorted((left, right) => left - right);
  const items: PageItem[] = [];
  let previous = 0;
  for (const value of sorted) {
    if (value - previous === 2) {
      items.push({ type: "page", page: value - 1, current: value - 1 === page });
    } else if (value - previous > 2) {
      items.push({ type: "gap", key: `gap-${previous}-${value}` });
    }
    items.push({ type: "page", page: value, current: value === page });
    previous = value;
  }
  return items;
}
