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

/** Logical pin regions, with ids in display order within each region. */
export interface ColumnPinning {
  readonly start: readonly string[];
  readonly end: readonly string[];
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
  /** Widths in pixels a user gave columns, by column id. Other columns keep their `width`. */
  readonly columnSizing: Readonly<Record<string, number>>;
  readonly columnPinning: ColumnPinning;
  /** Column ids, from outermost group to innermost group. */
  readonly grouping: readonly string[];
  /** Group keys, separate from row/detail expansion. Defaults to every group open. */
  readonly expandedGroups: readonly string[] | true;
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
    columnSizing: patch.columnSizing ?? {},
    grouping: normalizeGrouping(patch.grouping === undefined ? [] : patch.grouping, onIssue),
    expandedGroups: normalizeGroupsExpanded(
      patch.expandedGroups === undefined ? true : patch.expandedGroups,
      onIssue,
    ),
    columnPinning: normalizeColumnPinning(
      patch.columnPinning === undefined ? { start: [], end: [] } : patch.columnPinning,
      onIssue,
    ),
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
      key === "grouping" && input !== undefined
        ? normalizeGrouping(input, onIssue)
        : key === "expandedGroups" && input !== undefined
          ? normalizeGroupsExpanded(input, onIssue)
          : key === "expanded" && input !== undefined
            ? normalizeExpanded(input, onIssue)
            : key === "columnPinning" && input !== undefined
              ? normalizeColumnPinning(input, onIssue)
              : input;
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
    if (key === "grouping" && sameExpanded(state.grouping, value as readonly string[])) continue;
    if (key === "expandedGroups" && sameExpanded(state.expandedGroups, value as ExpandedState))
      continue;
    if (key === "columnPinning" && samePinning(state.columnPinning, value as ColumnPinning))
      continue;
    if (
      key === "columnSizing" &&
      sameSizing(state.columnSizing, value as TableState["columnSizing"])
    )
      continue;
    next[key] = value;
    changed = true;
  }
  return changed ? freezeState(next as unknown as TableState, state) : state;
}

function normalizeGrouping(
  value: unknown,
  onIssue?: (problem: TableIssue) => void,
): readonly string[] {
  if (Array.isArray(value) && value.every((id: unknown) => typeof id === "string"))
    return [...new Set(value)];
  onIssue?.(
    issue("invalid_grouping", "Grouping must be an array of column ids; grouping is disabled."),
  );
  return [];
}

function normalizeGroupsExpanded(
  value: unknown,
  onIssue?: (problem: TableIssue) => void,
): readonly string[] | true {
  if (value === true) return true;
  if (Array.isArray(value) && value.every((key: unknown) => typeof key === "string"))
    return [...new Set(value)];
  onIssue?.(
    issue(
      "invalid_expanded_groups",
      "Expanded groups must be true or an array of group keys; all groups are collapsed.",
    ),
  );
  return [];
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

function normalizeColumnPinning(
  value: unknown,
  onIssue?: (problem: TableIssue) => void,
): ColumnPinning {
  if (
    value !== null &&
    typeof value === "object" &&
    "start" in value &&
    "end" in value &&
    Array.isArray(value.start) &&
    value.start.every((id: unknown) => typeof id === "string") &&
    Array.isArray(value.end) &&
    value.end.every((id: unknown) => typeof id === "string")
  )
    return { start: value.start, end: value.end };
  onIssue?.(
    issue(
      "invalid_column_pinning",
      "Column pinning must contain start and end arrays of column ids; empty regions are used.",
    ),
  );
  return { start: [], end: [] };
}

function samePinning(left: ColumnPinning, right: ColumnPinning): boolean {
  return (
    left.start.length === right.start.length &&
    left.end.length === right.end.length &&
    left.start.every((id, index) => id === right.start[index]) &&
    left.end.every((id, index) => id === right.end[index])
  );
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

function sameSizing(left: TableState["columnSizing"], right: TableState["columnSizing"]): boolean {
  const keys = Object.keys(left);
  return (
    keys.length === Object.keys(right).length &&
    keys.every((key) => Object.hasOwn(right, key) && Object.is(left[key], right[key]))
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
    columnSizing:
      state.columnSizing === previous?.columnSizing
        ? previous.columnSizing
        : Object.freeze({ ...state.columnSizing }),
    columnPinning:
      state.columnPinning === previous?.columnPinning
        ? previous.columnPinning
        : Object.freeze({
            start: Object.freeze([...state.columnPinning.start]),
            end: Object.freeze([...state.columnPinning.end]),
          }),
    grouping:
      state.grouping === previous?.grouping
        ? previous.grouping
        : Object.freeze([...state.grouping]),
    expandedGroups:
      state.expandedGroups === previous?.expandedGroups
        ? previous.expandedGroups
        : state.expandedGroups === true
          ? true
          : Object.freeze([...state.expandedGroups]),
  });
}
