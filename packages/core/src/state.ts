/** A stable identity for a row, read from the row itself or produced by a function. */
export type RowKey = string | number;

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
  readonly hiddenColumns: readonly string[];
  /** Column ids in display order. Columns missing from the list keep their definition order. */
  readonly columnOrder: readonly string[];
}

/** A partial state, as accepted by `setState` and `initialState`. */
export type TableStatePatch = {
  readonly [K in keyof TableState]?: TableState[K] | undefined;
};

export const DEFAULT_PAGE_SIZE = 10;

export function createInitialState(patch: TableStatePatch = {}): TableState {
  return freezeState({
    sorting: patch.sorting ?? [],
    search: patch.search ?? "",
    filters: patch.filters ?? {},
    pagination: patch.pagination ?? { page: 1, pageSize: DEFAULT_PAGE_SIZE },
    selection: patch.selection ?? [],
    hiddenColumns: patch.hiddenColumns ?? [],
    columnOrder: patch.columnOrder ?? [],
  });
}

export function mergeState(state: TableState, patch: TableStatePatch): TableState {
  let changed = false;
  const next: Record<string, unknown> = { ...state };
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined || Object.is(next[key], value)) {
      continue;
    }
    if (
      key === "pagination" &&
      samePagination(next[key] as PaginationState, value as PaginationState)
    ) {
      continue;
    }
    next[key] = value;
    changed = true;
  }
  return changed ? freezeState(next as unknown as TableState) : state;
}

function samePagination(left: PaginationState, right: PaginationState): boolean {
  return left.page === right.page && left.pageSize === right.pageSize;
}

function freezeState(state: TableState): TableState {
  return Object.freeze({
    sorting: Object.freeze(state.sorting.map((rule) => Object.freeze({ ...rule }))),
    search: state.search,
    filters: Object.freeze({ ...state.filters }),
    pagination: Object.freeze({ ...state.pagination }),
    selection: Object.freeze([...state.selection]),
    hiddenColumns: Object.freeze([...state.hiddenColumns]),
    columnOrder: Object.freeze([...state.columnOrder]),
  });
}
