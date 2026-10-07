import { issue, type TableIssue } from "./issues";

/** A stable identity for a row, read from the row itself or produced by a function. */
export type RowKey = string | number;
export type ExpandedState = readonly RowKey[] | true;

export type SortDirection = "asc" | "desc";

/** One level of a sort. Several rules sort by the first, then break ties with the next. */
export interface SortRule {
  readonly column: string;
  readonly direction: SortDirection;
}

/** Pages are counted from 1. */
export interface PaginationState {
  readonly page: number;
  readonly pageSize: number;
}

/**
 * Everything a user can change about a table, as plain serializable data.
 *
 * Being plain data, the state can be stored, restored, sent to a server that sorts and pages, or
 * written to the URL with a library such as QueryWeave.
 */
export interface TableState {
  readonly sorting: readonly SortRule[];
  /** Free text matched against every searchable column. */
  readonly search: string;
  /** Filter value per column id, interpreted by that column's `filter`. */
  readonly filters: Readonly<Record<string, unknown>>;
  readonly pagination: PaginationState;
  readonly selection: readonly RowKey[];
  /** Expanded keys, or true for every expandable row. */
  readonly expanded: ExpandedState;
  readonly hiddenColumns: readonly string[];
  /** Column ids in display order. Columns missing from the list keep their definition order. */
  readonly columnOrder: readonly string[];
}

/** A partial state, as accepted by `setState` and `initialState`. */
export type TableStatePatch = {
  readonly [K in keyof TableState]?: TableState[K] | undefined;
};

export const DEFAULT_PAGE_SIZE = 10;

export function createInitialState(
  patch: TableStatePatch = {},
  onIssue?: (problem: TableIssue) => void,
): TableState {
  return freezeState({
    sorting: patch.sorting ?? [],
    search: patch.search ?? "",
    filters: patch.filters ?? {},
    pagination: patch.pagination ?? { page: 1, pageSize: DEFAULT_PAGE_SIZE },
    selection: patch.selection ?? [],
    expanded: normalizeExpanded(patch.expanded === undefined ? [] : patch.expanded, onIssue),
    hiddenColumns: patch.hiddenColumns ?? [],
    columnOrder: patch.columnOrder ?? [],
  });
}

export function mergeState(
  state: TableState,
  patch: TableStatePatch,
  onIssue?: (problem: TableIssue) => void,
): TableState {
  let changed = false;
  const next: Record<string, unknown> = { ...state };
  for (const [key, input] of Object.entries(patch)) {
    const value =
      key === "expanded" && input !== undefined ? normalizeExpanded(input, onIssue) : input;
    if (value === undefined || Object.is(next[key], value)) {
      continue;
    }
    if (
      key === "pagination" &&
      samePagination(next[key] as PaginationState, value as PaginationState)
    ) {
      continue;
    }
    if (key === "expanded" && sameExpanded(state.expanded, value as ExpandedState)) continue;
    next[key] = value;
    changed = true;
  }
  return changed ? freezeState(next as unknown as TableState, state) : state;
}

function normalizeExpanded(value: unknown, onIssue?: (problem: TableIssue) => void): ExpandedState {
  if (value === true) return true;
  if (
    Array.isArray(value) &&
    value.every(
      (key: unknown) =>
        typeof key === "string" || (typeof key === "number" && Number.isFinite(key)),
    )
  ) {
    return [...new Set(value as RowKey[])];
  }
  onIssue?.(
    issue(
      "invalid_expanded",
      "Expanded state must be true or an array of string/finite number keys; an empty array is used.",
    ),
  );
  return [];
}

function sameExpanded(left: ExpandedState, right: ExpandedState): boolean {
  return (
    left === right ||
    (left !== true &&
      right !== true &&
      left.length === right.length &&
      left.every((key, index) => key === right[index]))
  );
}

function samePagination(left: PaginationState, right: PaginationState): boolean {
  return left.page === right.page && left.pageSize === right.pageSize;
}

function freezeState(state: TableState, previous?: TableState): TableState {
  return Object.freeze({
    sorting:
      state.sorting === previous?.sorting
        ? previous.sorting
        : Object.freeze(state.sorting.map((rule) => Object.freeze({ ...rule }))),
    search: state.search,
    filters:
      state.filters === previous?.filters ? previous.filters : Object.freeze({ ...state.filters }),
    pagination:
      state.pagination === previous?.pagination
        ? previous.pagination
        : Object.freeze({ ...state.pagination }),
    selection:
      state.selection === previous?.selection
        ? previous.selection
        : Object.freeze([...state.selection]),
    expanded:
      state.expanded === previous?.expanded
        ? previous.expanded
        : state.expanded === true
          ? true
          : Object.freeze([...state.expanded]),
    hiddenColumns:
      state.hiddenColumns === previous?.hiddenColumns
        ? previous.hiddenColumns
        : Object.freeze([...state.hiddenColumns]),
    columnOrder:
      state.columnOrder === previous?.columnOrder
        ? previous.columnOrder
        : Object.freeze([...state.columnOrder]),
  });
}
