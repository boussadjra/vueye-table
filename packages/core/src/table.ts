import { resolveColumn, type ColumnDef, type TableColumn } from "./column";
import { escapeFormula, readDelimited, toDelimited } from "./delimited";
import { rangeContains, type CellPosition, type CellRange } from "./grid";
import { issue, type TableIssue } from "./issues";
import type { DeepKeys } from "./path";
import { getPath, isSafePath } from "./path";
import {
  clampPage,
  countPages,
  filterRows,
  paginateRows,
  sortRows,
  type PageItem,
  paginationItems,
} from "./pipeline";
import { createRow, getRowItemKey, type TableRow, type TableRenderItem } from "./row";
import {
  DEFAULT_PAGE_SIZE,
  createInitialState,
  mergeState,
  type RowKey,
  type ExpandedState,
  type SortDirection,
  type TableState,
  type TableStatePatch,
} from "./state";
import { createUndoStack } from "./undo-stack";

export type SelectionMode = "none" | "single" | "multiple";
export type ExpandMode = "single" | "multiple";

/** Which rows "select all" covers: the current page, or every row that passes the filters. */
export type SelectScope = "page" | "all";

export interface PasteLimit {
  /** Maximum fields examined per paste, including clipped columns. Defaults to 100,000. */
  readonly maxCells?: number | undefined;
  /** Maximum UTF-16 code units examined per paste. Defaults to 5,000,000. */
  readonly maxLength?: number | undefined;
}

export interface TableOptions<TRow> {
  readonly data: readonly TRow[];
  readonly columns: readonly ColumnDef<TRow>[];
  /**
   * How to identify a row: a path into it, or a function. Defaults to `id` when rows have one and
   * to the row's position otherwise.
   */
  readonly rowKey?: DeepKeys<TRow> | ((row: TRow, index: number) => RowKey) | undefined;
  readonly initialState?: TableStatePatch | undefined;
  /** Present all processed rows rather than a page. Defaults to true. */
  readonly paginate?: boolean | undefined;
  readonly getRowCanExpand?: ((row: TRow) => boolean) | undefined;
  readonly expandMode?: ExpandMode | undefined;
  /** Defaults to `"multiple"`. */
  readonly selectionMode?: SelectionMode | undefined;
  /** Defaults to `"all"`. */
  readonly selectScope?: SelectScope | undefined;
  /**
   * The data is one page that a server has already searched, filtered, sorted, and paginated
   * with the current state. The table only presents it; `rowCount` gives the total.
   */
  readonly manual?: boolean | undefined;
  /** The total number of rows across all pages, for `manual` tables. */
  readonly rowCount?: number | undefined;
  /** Called after every state change a table operation makes, not after `setState`. */
  readonly onStateChange?: ((state: TableState, previous: TableState) => void) | undefined;
  /** Called with the new data after an edit, a paste, an undo, or a redo. */
  readonly onDataChange?:
    | ((data: readonly TRow[], changes: readonly CellChange<TRow>[]) => void)
    | undefined;
  /** Called with the reasons whenever an edit, a paste, or a clear refuses some cells. */
  readonly onEditIssues?: ((issues: readonly TableIssue[]) => void) | undefined;
  /** The most edit batches `undo` can reach. Defaults to 100. */
  readonly historyLimit?: number | undefined;
  /** Bound clipboard parsing. Only complete cells inside the visible grid are applied. */
  readonly pasteLimit?: PasteLimit | undefined;
}

export type SelectionCoverage = "none" | "some" | "all";

export interface SortInfo {
  readonly direction: SortDirection;
  /** 0 for the first rule, 1 for the next, and so on. */
  readonly priority: number;
}

/**
 * Everything a renderer needs, computed from the data, the columns, and the state. A snapshot is
 * frozen and replaced on each change, so comparing snapshots by identity detects a change.
 */
export interface TableSnapshot<TRow> {
  readonly state: TableState;
  /** Visible columns in display order. */
  readonly columns: readonly TableColumn<TRow>[];
  /** Every column in display order, hidden ones included. */
  readonly allColumns: readonly TableColumn<TRow>[];
  /** Rows on the current page, or all processed rows when pagination is disabled. */
  readonly rows: readonly TableRow<TRow>[];
  /** Data rows followed by their open details; details do not affect pagination or grid positions. */
  readonly renderItems: readonly TableRenderItem<TRow>[];
  readonly paginate: boolean;
  /** Rows on every page, filtered and sorted. For `manual` tables this is the current page. */
  readonly processedRows: readonly TableRow<TRow>[];
  /** The current page, clamped into range. */
  readonly page: number;
  readonly pageSize: number;
  readonly pageCount: number;
  /** Rows that pass the search and filters. */
  readonly rowCount: number;
  /** Rows before searching and filtering. */
  readonly totalRowCount: number;
  /** The 1-based position of the first row on this page, or 0 when there are no rows. */
  readonly pageStart: number;
  /** The 1-based position of the last row on this page, or 0 when there are no rows. */
  readonly pageEnd: number;
  readonly pageItems: readonly PageItem[];
  readonly canPreviousPage: boolean;
  readonly canNextPage: boolean;
  readonly selectionMode: SelectionMode;
  readonly selectedCount: number;
  /** How much of the current page is selected. */
  readonly pageSelection: SelectionCoverage;
  /** How much of the select-all scope is selected. */
  readonly allSelection: SelectionCoverage;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly issues: readonly TableIssue[];
  isSelected(key: RowKey): boolean;
  getSort(columnId: string): SortInfo | undefined;
  getColumn(columnId: string): TableColumn<TRow> | undefined;
  getRow(key: RowKey): TableRow<TRow> | undefined;
}

/** An edit given as a value of the column's type. */
export interface CellValueEdit {
  readonly rowKey: RowKey;
  readonly column: string;
  readonly value: unknown;
}

/** An edit given as text, read by the column's `parse`, as typed or pasted. */
export interface CellInputEdit {
  readonly rowKey: RowKey;
  readonly column: string;
  readonly input: string;
}

export type CellEdit = CellValueEdit | CellInputEdit;

export interface CellChange<TRow> {
  readonly rowKey: RowKey;
  readonly column: string;
  readonly previous: unknown;
  readonly value: unknown;
  /** The row after the change. */
  readonly row: TRow;
}

export type EditStatus = "applied" | "partial" | "rejected" | "unchanged";

/**
 * The outcome of a batch of edits. `partial` means some edits applied and others were refused;
 * each refusal is in `issues`.
 */
export interface EditResult<TRow> {
  readonly status: EditStatus;
  readonly changes: readonly CellChange<TRow>[];
  readonly issues: readonly TableIssue[];
}

export interface CopyOptions {
  /** Prefix formula-like text with an apostrophe. Defaults to false for clipboard copies. */
  readonly escapeFormulas?: boolean | undefined;
}

export interface ExportOptions extends CopyOptions {
  /** Prefix formula-like text with an apostrophe. Defaults to true for exports. */
  readonly escapeFormulas?: boolean | undefined;
  /** Defaults to `"csv"`. */
  readonly format?: "csv" | "tsv" | undefined;
  /** Column ids to export. Defaults to the visible columns. */
  readonly columns?: readonly string[] | undefined;
  /** Export only the current page. Defaults to every filtered row. */
  readonly pageOnly?: boolean | undefined;
  /** Defaults to `true`. */
  readonly headers?: boolean | undefined;
}

/**
 * A data table: data, columns, and state, with named operations to change them. It knows nothing
 * about rendering; a framework binding subscribes to it and draws each snapshot.
 */
export interface DataTable<TRow> {
  getSnapshot(): TableSnapshot<TRow>;
  getState(): TableState;
  /** Called after every change with the new snapshot. Returns the unsubscribe function. */
  subscribe(listener: (snapshot: TableSnapshot<TRow>) => void): () => void;

  /** Replace part of the state from outside, without calling `onStateChange`. */
  setState(patch: TableStatePatch): void;
  /** Replace the data. The undo stack is cleared unless the data is the table's own. */
  setData(data: readonly TRow[]): void;
  setColumns(columns: readonly ColumnDef<TRow>[]): void;
  /** Update the total row count of a `manual` table. */
  setRowCount(rowCount: number): void;

  /** Cycle a column through ascending, descending, and unsorted. */
  toggleSort(columnId: string, options?: { readonly multi?: boolean | undefined }): void;
  /** Sort by one column, or clear it with `undefined`. */
  sort(
    columnId: string,
    direction: SortDirection | undefined,
    options?: { readonly multi?: boolean | undefined },
  ): void;
  clearSorting(): void;
  search(text: string): void;
  /** Set a column's filter value; an empty value removes the filter. */
  filter(columnId: string, value: unknown): void;
  clearFilters(): void;

  goToPage(page: number): void;
  nextPage(): void;
  previousPage(): void;
  /** Change the page size, keeping the first row of the current page in view. */
  setPageSize(pageSize: number): void;

  select(keys: readonly RowKey[]): void;
  deselect(keys: readonly RowKey[]): void;
  toggleRow(key: RowKey, selected?: boolean): void;
  /** Select every row in the scope, or clear them when all are already selected. */
  toggleAll(scope?: SelectScope): void;
  clearSelection(): void;
  /** The selected rows that are present in the data. */
  getSelectedRows(): readonly TableRow<TRow>[];

  toggleExpanded(key: RowKey, expanded?: boolean): void;
  expandAll(): void;
  collapseAll(): void;

  toggleColumn(columnId: string, visible?: boolean): void;
  moveColumn(columnId: string, toIndex: number): void;

  edit(edits: CellEdit | readonly CellEdit[]): EditResult<TRow>;
  undo(): boolean;
  redo(): boolean;
  /** The text of a range of shown cells, tab-separated like a spreadsheet clipboard. */
  copy(range: CellRange, options?: CopyOptions): string;
  /** Paste tab-separated text with its top-left cell at `origin`, clipped to the grid. */
  paste(origin: CellPosition, text: string): EditResult<TRow>;
  /** Empty every editable cell in a range. */
  clear(range: CellRange): EditResult<TRow>;
  exportRows(options?: ExportOptions): string;

  /** Return to the initial state. */
  reset(): void;
  /** Drop every listener. */
  destroy(): void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function memo<TDeps extends readonly unknown[], TResult>(
  compute: (...deps: TDeps) => TResult,
): (...deps: TDeps) => TResult {
  let last: { readonly deps: TDeps; readonly result: TResult } | undefined;
  return (...deps: TDeps): TResult => {
    if (
      last &&
      last.deps.length === deps.length &&
      last.deps.every((d, i) => Object.is(d, deps[i]))
    ) {
      return last.result;
    }
    const result = compute(...deps);
    last = { deps, result };
    return result;
  };
}

function isInputEdit(edit: CellEdit): edit is CellInputEdit {
  return "input" in edit;
}

function coverage(selected: number, total: number): SelectionCoverage {
  if (selected === 0 || total === 0) {
    return "none";
  }
  return selected === total ? "all" : "some";
}

interface IndexedRows<TRow> {
  readonly rows: readonly TableRow<TRow>[];
  readonly byKey: ReadonlyMap<RowKey, TableRow<TRow>>;
  readonly issues: readonly TableIssue[];
}

function pasteLimit(
  value: number | undefined,
  fallback: number,
  name: string,
  issues: TableIssue[],
): number {
  if (value === undefined) {
    return fallback;
  }
  if (Number.isSafeInteger(value) && value > 0) {
    return value;
  }
  issues.push(
    issue(
      "invalid_paste_limit",
      `Paste ${name} ${String(value)} is not a positive safe integer; ${fallback} is used.`,
    ),
  );
  return fallback;
}

/** Create a data table. */
export function createTable<TRow>(options: TableOptions<TRow>): DataTable<TRow> {
  const paginate = options.paginate ?? true;
  const expandMode = options.expandMode ?? "multiple";
  const selectionMode = options.selectionMode ?? "multiple";
  const selectScope = options.selectScope ?? "all";
  const manual = options.manual ?? false;
  const undoStack = createUndoStack<readonly CellChange<TRow>[]>(options.historyLimit);
  const listeners = new Set<(snapshot: TableSnapshot<TRow>) => void>();
  const optionIssues: TableIssue[] = [];
  const maxPasteCells = pasteLimit(options.pasteLimit?.maxCells, 100_000, "maxCells", optionIssues);
  const maxPasteLength = pasteLimit(
    options.pasteLimit?.maxLength,
    5_000_000,
    "maxLength",
    optionIssues,
  );

  let data = options.data;
  let definitions = options.columns;
  let rowCount = options.rowCount;
  let expandedIssue: TableIssue | undefined;
  let initialState = createInitialState(
    {
      ...options.initialState,
      hiddenColumns:
        options.initialState?.hiddenColumns ??
        options.columns.filter((column) => column.hidden === true).map((column) => column.id),
    },
    (problem) => {
      expandedIssue = problem;
    },
  );
  let state = initialState;
  let snapshot: TableSnapshot<TRow> | undefined;

  const readKey = (row: TRow, index: number): RowKey => {
    const { rowKey } = options;
    if (typeof rowKey === "function") {
      return rowKey(row, index);
    }
    const path = rowKey ?? "id";
    const value = getPath(row, path);
    if (typeof value === "string" || typeof value === "number") {
      return value;
    }
    return rowKey === undefined || !isRecord(row) ? index : String(value);
  };

  const resolveColumns = memo((defs: readonly ColumnDef<TRow>[]) => {
    const issues: TableIssue[] = [];
    const columns = defs.flatMap((definition) => {
      if (!isSafePath(definition.id)) {
        issues.push(
          issue(
            "unsafe_path",
            `The column "${definition.id}" addresses a prototype and is ignored.`,
            { column: definition.id },
          ),
        );
        return [];
      }
      return [resolveColumn(definition)];
    });
    return { columns, byId: new Map(columns.map((column) => [column.id, column])), issues };
  });

  const indexRows = memo(
    (rows: readonly TRow[], byId: ReadonlyMap<string, TableColumn<TRow>>): IndexedRows<TRow> => {
      const byKey = new Map<RowKey, TableRow<TRow>>();
      const issues: TableIssue[] = [];
      const indexed = rows.map((original, index) => {
        let key = readKey(original, index);
        if (byKey.has(key)) {
          issues.push(
            issue(
              "duplicate_row_key",
              `Row ${index} repeats the key "${String(key)}"; it is keyed "${String(key)}#${index}" instead.`,
              { rowKey: key },
            ),
          );
          key = `${String(key)}#${index}`;
        }
        const row = createRow(
          original,
          key,
          index,
          byId,
          options.getRowCanExpand?.(original) ?? false,
        );
        byKey.set(key, row);
        return row;
      });
      return { rows: indexed, byKey, issues };
    },
  );

  const orderColumns = memo(
    (
      columns: readonly TableColumn<TRow>[],
      columnOrder: readonly string[],
      hiddenColumns: readonly string[],
    ) => {
      const position = new Map(columnOrder.map((id, index) => [id, index]));
      const ordered = columns
        .map((column, index) => ({ column, index }))
        .toSorted((left, right) => {
          const leftPosition = position.get(left.column.id) ?? columnOrder.length + left.index;
          const rightPosition = position.get(right.column.id) ?? columnOrder.length + right.index;
          return leftPosition - rightPosition;
        })
        .map(({ column }) => column);
      const hidden = new Set(hiddenColumns);
      return { all: ordered, visible: ordered.filter((column) => !hidden.has(column.id)) };
    },
  );

  const filterStage = memo(filterRows<TRow>);
  const sortStage = memo(sortRows<TRow>);
  const selectedSet = memo((selection: readonly RowKey[]) => new Set(selection));
  const expansionStage = memo((indexed: IndexedRows<TRow>, expanded: ExpandedState) => {
    const keys = expanded === true ? undefined : new Set(expanded);
    const rows = indexed.rows.map((row) =>
      row.canExpand && (expanded === true || keys?.has(row.key))
        ? Object.freeze({ ...row, isExpanded: true })
        : row,
    );
    return { rows, byKey: new Map(rows.map((row) => [row.key, row])) };
  });
  const expandedOrder = memo(
    (rows: readonly TableRow<TRow>[], byKey: ReadonlyMap<RowKey, TableRow<TRow>>) =>
      rows.map((row) => byKey.get(row.key)!),
  );

  function stateIssues(byId: ReadonlyMap<string, TableColumn<TRow>>): TableIssue[] {
    const issues: TableIssue[] = [];
    if (expandedIssue) issues.push(expandedIssue);
    const referenced = new Set([
      ...state.sorting.map((rule) => rule.column),
      ...Object.keys(state.filters),
      ...state.hiddenColumns,
      ...state.columnOrder,
    ]);
    for (const id of referenced) {
      if (!byId.has(id)) {
        issues.push(
          issue("unknown_column", `The state refers to a column "${id}" that is not defined.`, {
            column: id,
          }),
        );
      }
    }
    const { pageSize } = state.pagination;
    if (paginate && (!Number.isInteger(pageSize) || pageSize < 1)) {
      issues.push(
        issue(
          "invalid_page_size",
          `Page size ${String(pageSize)} is not a positive whole number; ${DEFAULT_PAGE_SIZE} is used.`,
        ),
      );
    }
    return issues;
  }

  function computeSnapshot(): TableSnapshot<TRow> {
    const { columns, byId, issues: columnIssues } = resolveColumns(definitions);
    const indexed = indexRows(data, byId);
    const expanded = expansionStage(indexed, state.expanded);
    const ordered = orderColumns(columns, state.columnOrder, state.hiddenColumns);
    const issues = [...optionIssues, ...columnIssues, ...indexed.issues, ...stateIssues(byId)];
    const requestedSize = state.pagination.pageSize;
    let pageSize =
      Number.isInteger(requestedSize) && requestedSize >= 1 ? requestedSize : DEFAULT_PAGE_SIZE;

    let processedRows: readonly TableRow<TRow>[];
    let rows: readonly TableRow<TRow>[];
    let filteredCount: number;
    let page: number;
    let pageCount: number;
    if (manual) {
      processedRows = expanded.rows;
      rows = expanded.rows;
      filteredCount = rowCount ?? indexed.rows.length;
      pageCount = countPages(filteredCount, pageSize);
      page = clampPage(state.pagination.page, pageCount);
    } else {
      const filtered = filterStage(indexed.rows, columns, state.search, state.filters);
      processedRows = expandedOrder(sortStage(filtered, columns, state.sorting), expanded.byKey);
      filteredCount = processedRows.length;
      pageCount = countPages(filteredCount, pageSize);
      page = clampPage(state.pagination.page, pageCount);
      rows = paginateRows(processedRows, { page, pageSize });
    }

    if (!paginate) {
      rows = processedRows;
      page = 1;
      pageCount = 1;
      pageSize = Math.max(1, rows.length);
    }

    const selected = selectedSet(state.selection);
    const pageSelected = rows.filter((row) => selected.has(row.key)).length;
    const scopeRows = selectScope === "page" || manual ? rows : processedRows;
    const scopeSelected =
      scopeRows === rows ? pageSelected : scopeRows.filter((row) => selected.has(row.key)).length;
    const pageStart = rows.length === 0 ? 0 : (page - 1) * pageSize + 1;
    const sortIndex = new Map(
      state.sorting.map((rule, priority) => [rule.column, { direction: rule.direction, priority }]),
    );

    return Object.freeze({
      state,
      columns: ordered.visible,
      allColumns: ordered.all,
      rows,
      renderItems: Object.freeze(
        rows.flatMap((row, rowIndex): TableRenderItem<TRow>[] => {
          const item = Object.freeze({
            kind: "row" as const,
            key: getRowItemKey(row.key),
            row,
            rowIndex,
          });
          return row.isExpanded
            ? [
                item,
                Object.freeze({
                  kind: "detail" as const,
                  key: getRowItemKey(row.key, "detail"),
                  row,
                  rowIndex,
                }),
              ]
            : [item];
        }),
      ),
      paginate,
      processedRows,
      page,
      pageSize,
      pageCount,
      rowCount: filteredCount,
      totalRowCount: manual ? filteredCount : indexed.rows.length,
      pageStart,
      pageEnd: rows.length === 0 ? 0 : pageStart + rows.length - 1,
      pageItems: paginationItems(page, pageCount),
      canPreviousPage: page > 1,
      canNextPage: page < pageCount,
      selectionMode,
      selectedCount: state.selection.length,
      pageSelection: coverage(pageSelected, rows.length),
      allSelection: coverage(scopeSelected, scopeRows.length),
      canUndo: undoStack.canUndo,
      canRedo: undoStack.canRedo,
      issues: Object.freeze(issues),
      isSelected: (key: RowKey): boolean => selected.has(key),
      getSort: (columnId: string): SortInfo | undefined => sortIndex.get(columnId),
      getColumn: (columnId: string): TableColumn<TRow> | undefined => byId.get(columnId),
      getRow: (key: RowKey): TableRow<TRow> | undefined => expanded.byKey.get(key),
    });
  }

  function getSnapshot(): TableSnapshot<TRow> {
    snapshot ??= computeSnapshot();
    return snapshot;
  }

  function notify(): void {
    snapshot = undefined;
    if (listeners.size === 0) {
      return;
    }
    const next = getSnapshot();
    for (const listener of listeners) {
      listener(next);
    }
  }

  /** Apply a change made by a table operation. */
  function commit(patch: TableStatePatch): void {
    const previous = state;
    const previousIssue = expandedIssue;
    const next = mergePatch(patch);
    if (next === previous && previousIssue === expandedIssue) {
      return;
    }
    state = next;
    if (next !== previous) options.onStateChange?.(state, previous);
    notify();
  }

  function canonicalExpanded(
    expanded: ExpandedState,
    candidate: TableState = state,
  ): ExpandedState {
    if (expandMode === "multiple") return expanded;
    if (expanded !== true) return expanded.slice(-1);
    const { columns, byId } = resolveColumns(definitions);
    const indexed = indexRows(data, byId);
    const processed = manual
      ? indexed.rows
      : sortStage(
          filterStage(indexed.rows, columns, candidate.search, candidate.filters),
          columns,
          candidate.sorting,
        );
    const first = processed.find((row) => row.canExpand);
    return first ? [first.key] : [];
  }

  function mergePatch(patch: TableStatePatch): TableState {
    if (patch.expanded !== undefined) expandedIssue = undefined;
    const next = mergeState(state, patch, (problem) => {
      expandedIssue = problem;
    });
    return expandMode === "single" && patch.expanded !== undefined
      ? mergeState(state, { ...patch, expanded: canonicalExpanded(next.expanded, next) })
      : next;
  }

  const firstPage = (): { readonly page: number; readonly pageSize: number } => ({
    page: 1,
    pageSize: state.pagination.pageSize,
  });

  function setSort(columnId: string, direction: SortDirection | undefined, multi: boolean): void {
    const column = getSnapshot().getColumn(columnId);
    if (!column?.sortable) {
      return;
    }
    const others = multi ? state.sorting.filter((rule) => rule.column !== columnId) : [];
    const existing = state.sorting.findIndex((rule) => rule.column === columnId);
    let sorting = others;
    if (direction) {
      const rule = { column: columnId, direction };
      sorting =
        multi && existing !== -1
          ? state.sorting.map((current) => (current.column === columnId ? rule : current))
          : [...others, rule];
    }
    commit({ sorting, pagination: firstPage() });
  }

  function applySelection(next: readonly RowKey[]): void {
    if (selectionMode === "none") {
      return;
    }
    const unique = [...new Set(next)];
    const selection = selectionMode === "single" ? unique.slice(-1) : unique;
    const current = state.selection;
    if (selection.length === current.length && selection.every((key, i) => key === current[i])) {
      return;
    }
    commit({ selection });
  }

  function applyChanges(
    edits: readonly CellEdit[],
    record: boolean,
    recoveredIssues: readonly TableIssue[] = [],
  ): EditResult<TRow> {
    const current = getSnapshot();
    const working = [...data];
    const issues: TableIssue[] = [...recoveredIssues];
    const changes: CellChange<TRow>[] = [];
    // A value from another row tells a column's type when the edited cell is empty. It is looked
    // up once per column, not once per edit, so pasting a large range stays linear.
    const samples = new Map<string, unknown>();
    const sampleOf = (columnId: string): unknown => {
      if (!samples.has(columnId)) {
        const other = current.processedRows.find((candidate) => {
          const value = candidate.getValue(columnId);
          return value !== null && value !== undefined;
        });
        samples.set(columnId, other?.getValue(columnId));
      }
      return samples.get(columnId);
    };
    for (const edit of edits) {
      const row = current.getRow(edit.rowKey);
      const column = current.getColumn(edit.column);
      if (!row) {
        issues.push(
          issue("unknown_row", `No row has the key "${String(edit.rowKey)}".`, {
            rowKey: edit.rowKey,
            column: edit.column,
          }),
        );
        continue;
      }
      if (!isSafePath(edit.column)) {
        issues.push(
          issue(
            "unsafe_path",
            `The path "${edit.column}" addresses a prototype and cannot be written.`,
            { rowKey: edit.rowKey, column: edit.column },
          ),
        );
        continue;
      }
      if (!column) {
        issues.push(
          issue("unknown_column", `No column has the id "${edit.column}".`, {
            rowKey: edit.rowKey,
            column: edit.column,
          }),
        );
        continue;
      }
      const original = working[row.index] as TRow;
      if (record && !column.isEditable(original)) {
        issues.push(
          issue(
            "read_only_cell",
            `The "${column.id}" cell of row "${String(row.key)}" is read-only.`,
            {
              rowKey: row.key,
              column: column.id,
            },
          ),
        );
        continue;
      }
      let value: unknown;
      if (isInputEdit(edit)) {
        const parsed = column.parse(edit.input, original, sampleOf(column.id));
        if (!parsed.ok) {
          issues.push(
            issue("invalid_value", parsed.message, { rowKey: row.key, column: column.id }),
          );
          continue;
        }
        value = parsed.value;
      } else {
        value = edit.value;
      }
      const previous = column.getValue(original);
      if (Object.is(previous, value)) {
        continue;
      }
      const updated = column.setValue(original, value);
      if (updated === undefined) {
        issues.push(
          issue("read_only_cell", `The "${column.id}" column has no way to write a value.`, {
            rowKey: row.key,
            column: column.id,
          }),
        );
        continue;
      }
      working[row.index] = updated;
      changes.push({ rowKey: row.key, column: column.id, previous, value, row: updated });
    }

    let status: EditStatus;
    if (changes.length === 0) {
      status = issues.length > 0 ? "rejected" : "unchanged";
    } else {
      status = issues.length > 0 ? "partial" : "applied";
      data = working;
      if (record) {
        undoStack.record(changes);
      }
      options.onDataChange?.(data, changes);
      notify();
    }
    if (issues.length > 0) {
      options.onEditIssues?.(issues);
    }
    return Object.freeze({
      status,
      changes: Object.freeze(changes),
      issues: Object.freeze(issues),
    });
  }

  function rangeEdits(origin: CellPosition, matrix: readonly (readonly string[])[]): CellEdit[] {
    const { rows, columns } = getSnapshot();
    const edits: CellEdit[] = [];
    matrix.forEach((line, rowOffset) => {
      const row = rows[origin.row + rowOffset];
      if (!row) {
        return;
      }
      line.forEach((input, columnOffset) => {
        const column = columns[origin.column + columnOffset];
        if (column) {
          edits.push({ rowKey: row.key, column: column.id, input });
        }
      });
    });
    return edits;
  }

  function replay(changes: readonly CellChange<TRow>[], direction: "undo" | "redo"): void {
    applyChanges(
      changes.map((change) => ({
        rowKey: change.rowKey,
        column: change.column,
        value: direction === "undo" ? change.previous : change.value,
      })),
      false,
    );
  }

  if (expandMode === "single") {
    initialState = mergeState(initialState, { expanded: canonicalExpanded(initialState.expanded) });
    state = initialState;
    snapshot = undefined;
  }

  const table: DataTable<TRow> = {
    getSnapshot,
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    setState(patch) {
      const previousIssue = expandedIssue;
      const next = mergePatch(patch);
      if (next !== state || previousIssue !== expandedIssue) {
        state = next;
        notify();
      }
    },
    setData(next) {
      if (next === data) {
        return;
      }
      data = next;
      undoStack.clear();
      notify();
    },
    setColumns(next) {
      if (next === definitions) {
        return;
      }
      definitions = next;
      notify();
    },
    setRowCount(next) {
      if (next === rowCount) {
        return;
      }
      rowCount = next;
      notify();
    },

    toggleSort(columnId, { multi = false } = {}) {
      const current = state.sorting.find((rule) => rule.column === columnId)?.direction;
      const next = current === undefined ? "asc" : current === "asc" ? "desc" : undefined;
      setSort(columnId, next, multi);
    },
    sort(columnId, direction, { multi = false } = {}) {
      setSort(columnId, direction, multi);
    },
    clearSorting() {
      commit({ sorting: [] });
    },
    search(text) {
      if (text === state.search) {
        return;
      }
      commit({ search: text, pagination: firstPage() });
    },
    filter(columnId, value) {
      const filters: Record<string, unknown> = { ...state.filters };
      const empty =
        value === undefined ||
        value === null ||
        value === "" ||
        (Array.isArray(value) && value.length === 0);
      if (empty ? !(columnId in filters) : Object.is(filters[columnId], value)) {
        return;
      }
      if (empty) {
        delete filters[columnId];
      } else {
        filters[columnId] = value;
      }
      commit({ filters, pagination: firstPage() });
    },
    clearFilters() {
      if (Object.keys(state.filters).length > 0) {
        commit({ filters: {}, pagination: firstPage() });
      }
    },

    goToPage(page) {
      if (!paginate) return;
      const { pageCount, page: currentPage } = getSnapshot();
      const next = clampPage(page, pageCount);
      if (next !== currentPage || next !== state.pagination.page) {
        commit({ pagination: { page: next, pageSize: state.pagination.pageSize } });
      }
    },
    nextPage() {
      table.goToPage(getSnapshot().page + 1);
    },
    previousPage() {
      table.goToPage(getSnapshot().page - 1);
    },
    setPageSize(pageSize) {
      if (!paginate) return;
      if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize === state.pagination.pageSize) {
        return;
      }
      const { pageStart } = getSnapshot();
      const page = pageStart === 0 ? 1 : Math.floor((pageStart - 1) / pageSize) + 1;
      commit({ pagination: { page, pageSize } });
    },

    select(keys) {
      applySelection([...state.selection, ...keys]);
    },
    deselect(keys) {
      const removed = new Set(keys);
      applySelection(state.selection.filter((key) => !removed.has(key)));
    },
    toggleRow(key, selected) {
      const isSelected = state.selection.includes(key);
      const next = selected ?? !isSelected;
      if (next === isSelected) {
        return;
      }
      if (next) {
        table.select([key]);
      } else {
        table.deselect([key]);
      }
    },
    toggleAll(scope = selectScope) {
      if (selectionMode !== "multiple") {
        return;
      }
      const current = getSnapshot();
      const rows = scope === "page" || manual ? current.rows : current.processedRows;
      const keys = rows.map((row) => row.key);
      const allSelected = keys.length > 0 && keys.every((key) => current.isSelected(key));
      if (allSelected) {
        table.deselect(keys);
      } else {
        table.select(keys);
      }
    },
    clearSelection() {
      applySelection([]);
    },
    getSelectedRows() {
      const current = getSnapshot();
      return state.selection.flatMap((key) => {
        const row = current.getRow(key);
        return row ? [row] : [];
      });
    },

    toggleExpanded(key, expanded) {
      const row = getSnapshot().getRow(key);
      if (!row?.canExpand) return;
      const open = expanded ?? !row.isExpanded;
      if (open === row.isExpanded) return;
      if (expandMode === "single") {
        commit({ expanded: open ? [key] : [] });
      } else if (state.expanded === true) {
        const { byId } = resolveColumns(definitions);
        commit({
          expanded: indexRows(data, byId)
            .rows.filter((candidate) => candidate.canExpand && candidate.key !== key)
            .map((candidate) => candidate.key),
        });
      } else {
        commit({
          expanded: open
            ? [...state.expanded, key]
            : state.expanded.filter((candidate) => candidate !== key),
        });
      }
    },
    expandAll() {
      commit({ expanded: true });
    },
    collapseAll() {
      commit({ expanded: [] });
    },

    toggleColumn(columnId, visible) {
      if (!getSnapshot().getColumn(columnId)) {
        return;
      }
      const hidden = state.hiddenColumns.includes(columnId);
      const show = visible ?? hidden;
      if (show === !hidden) {
        return;
      }
      commit({
        hiddenColumns: show
          ? state.hiddenColumns.filter((id) => id !== columnId)
          : [...state.hiddenColumns, columnId],
      });
    },
    moveColumn(columnId, toIndex) {
      const order = getSnapshot().allColumns.map((column) => column.id);
      const from = order.indexOf(columnId);
      if (from === -1) {
        return;
      }
      const target = Math.min(Math.max(0, Math.trunc(toIndex)), order.length - 1);
      if (target === from) {
        return;
      }
      order.splice(from, 1);
      order.splice(target, 0, columnId);
      commit({ columnOrder: order });
    },

    edit(edits) {
      return applyChanges(Array.isArray(edits) ? edits : [edits as CellEdit], true);
    },
    undo() {
      const changes = undoStack.undo();
      if (!changes) {
        return false;
      }
      replay(changes, "undo");
      return true;
    },
    redo() {
      const changes = undoStack.redo();
      if (!changes) {
        return false;
      }
      replay(changes, "redo");
      return true;
    },
    copy(range, { escapeFormulas = false } = {}) {
      const { rows, columns } = getSnapshot();
      const matrix: string[][] = [];
      rows.forEach((row, rowIndex) => {
        const line: string[] = [];
        columns.forEach((column, columnIndex) => {
          if (rangeContains(range, { row: rowIndex, column: columnIndex })) {
            const display = row.getDisplay(column.id);
            line.push(escapeFormulas ? escapeFormula(display, row.getValue(column.id)) : display);
          }
        });
        if (line.length > 0) {
          matrix.push(line);
        }
      });
      return toDelimited(matrix);
    },
    paste(origin, text) {
      if (
        !Number.isInteger(origin.row) ||
        !Number.isInteger(origin.column) ||
        origin.row < 0 ||
        origin.column < 0
      ) {
        return applyChanges([], true, [
          issue(
            "invalid_value",
            "The paste origin must use non-negative whole row and column indices.",
          ),
        ]);
      }
      const { rows, columns } = getSnapshot();
      const parsed = readDelimited(text, {
        maxRows: Math.max(0, rows.length - origin.row),
        maxColumns: Math.max(0, columns.length - origin.column),
        maxCells: maxPasteCells,
        maxLength: maxPasteLength,
      });
      const issues = parsed.truncated
        ? [
            issue(
              "paste_truncated",
              "The paste exceeds the visible grid or parsing limits; only complete cells within those limits are applied.",
            ),
          ]
        : [];
      return applyChanges(rangeEdits(origin, parsed.rows), true, issues);
    },
    clear(range) {
      const matrix = Array.from({ length: range.bottom - range.top + 1 }, () =>
        Array.from({ length: range.right - range.left + 1 }, () => ""),
      );
      const current = getSnapshot();
      const edits = rangeEdits({ row: range.top, column: range.left }, matrix).filter((edit) => {
        const row = current.getRow(edit.rowKey);
        return (
          row !== undefined && current.getColumn(edit.column)?.isEditable(row.original) === true
        );
      });
      return applyChanges(edits, true);
    },
    exportRows({
      format = "csv",
      columns: ids,
      pageOnly = false,
      headers = true,
      escapeFormulas = true,
    } = {}) {
      const current = getSnapshot();
      const columns = ids
        ? ids.flatMap((id) => {
            const column = current.getColumn(id);
            return column ? [column] : [];
          })
        : current.columns;
      const rows = pageOnly ? current.rows : current.processedRows;
      const matrix = rows.map((row) =>
        columns.map((column) => {
          const display = row.getDisplay(column.id);
          return escapeFormulas ? escapeFormula(display, row.getValue(column.id)) : display;
        }),
      );
      if (headers) {
        matrix.unshift(
          columns.map((column) => (escapeFormulas ? escapeFormula(column.header) : column.header)),
        );
      }
      return toDelimited(matrix, format === "csv" ? "," : "\t");
    },

    reset() {
      commit(initialState);
    },
    destroy() {
      listeners.clear();
    },
  };
  return table;
}
