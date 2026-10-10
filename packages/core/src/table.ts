import { resolveColumn, type ColumnDef, type TableColumn, type TextContext } from "./column";
import { escapeFormula, readDelimited, toDelimited } from "./delimited";
import { createEditValidation } from "./edit-validation";
import { rangeContains, type CellPosition, type CellRange } from "./grid";
import { issue, type TableIssue } from "./issues";
import type { DeepKeys } from "./path";
import { getPath, isSafePath } from "./path";
import {
  createPendingChanges,
  type InsertPosition,
  type PendingChanges,
  type RowChange,
} from "./pending-changes";
import {
  clampPage,
  countPages,
  filterRows,
  paginateRows,
  sortRows,
  mergeRows,
  type PageItem,
  paginationItems,
} from "./pipeline";
import { createRow, getRowItemKey, type TableRow, type TableRenderItem } from "./row";
import { appendList, mapList } from "./row-list";
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
import {
  createStream,
  type DataIngestionResult,
  type LoadState,
  type StreamOptions,
  type StreamResult,
} from "./stream";
import { createCollator, foldText, type TextNormalizer } from "./text";
import {
  buildTree,
  processTree,
  createTreeFlattener,
  type TreeOptions,
  type TreeFilter,
  type TreeLoadSignal,
  type TreeLoadController,
  type TreeModel,
  type TreeNode,
  type ChildStatus,
} from "./tree";
import { createUndoStack } from "./undo-stack";
import type { PendingCell, ValidationResult } from "./validation";

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

export interface TableOptions<
  TRow,
  TSignal extends TreeLoadSignal = TreeLoadSignal,
> extends TreeOptions<TRow, TSignal> {
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
  /**
   * The BCP 47 locale text is ordered in, such as `"fr"` or `"ar-DZ"`. Defaults to the runtime's.
   * Read once, when the table is created.
   */
  readonly locale?: string | undefined;
  /**
   * How search and text filters read text before comparing it. Defaults to `foldText`, which
   * ignores case, accents and Arabic letter shapes. Read once, when the table is created.
   */
  readonly normalizeText?: TextNormalizer | undefined;
  /** Caller-owned source hint, independent of filtering and pagination. */
  readonly expectedRowCount?: number | undefined;
  /** Called after every state change a table operation makes, not after `setState`. */
  readonly onStateChange?: ((state: TableState, previous: TableState) => void) | undefined;
  /** Called with new data after edits or ingestion; ingestion has an empty cell-change list. */
  readonly onDataChange?:
    | ((data: readonly TRow[], changes: readonly CellChange<TRow>[]) => void)
    | undefined;
  /** Called with the reasons whenever an edit, a paste, or a clear refuses some cells. */
  readonly onEditIssues?: ((issues: readonly TableIssue[]) => void) | undefined;
  /** The most edit batches `undo` can reach. Defaults to 100. */
  readonly historyLimit?: number | undefined;
  /** Bound clipboard parsing. Only complete cells inside the visible grid are applied. */
  readonly pasteLimit?: PasteLimit | undefined;
  readonly validateRow?:
    | ((next: TRow, previous: TRow) => ValidationResult | Promise<ValidationResult>)
    | undefined;
  readonly asyncValidation?: "held" | "optimistic" | undefined;
  readonly createRow?: (() => TRow) | undefined;
  /** Immutable inverse of getParentKey for inserting adjacency children. */
  readonly setParentKey?: ((row: TRow, parent: RowKey | undefined) => TRow) | undefined;
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
  /** True when hierarchy options are configured, including an empty tree. */
  readonly tree: boolean;
  readonly loadState: LoadState;
  readonly loadedRowCount: number;
  readonly expectedRowCount: number | undefined;
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
  readonly pendingCells: readonly PendingCell[];
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

/** Optional identity checks for a batch prepared from an earlier row snapshot. */
export interface EditOptions<TRow> {
  readonly expectedRows?: ReadonlyMap<RowKey, TRow> | undefined;
}

export interface CellChange<TRow> {
  readonly rowKey: RowKey;
  readonly column: string;
  readonly previous: unknown;
  readonly value: unknown;
  /** The row after the change. */
  readonly row: TRow;
}

export type EditStatus = "applied" | "partial" | "rejected" | "unchanged" | "pending";

/**
 * The outcome of a batch of edits. `partial` means some edits applied and others were refused;
 * each refusal is in `issues`.
 */
export interface EditResult<TRow> {
  readonly status: EditStatus;
  readonly changes: readonly CellChange<TRow>[];
  readonly issues: readonly TableIssue[];
  readonly rowChanges: readonly RowChange<TRow>[];
  readonly pendingCells: readonly PendingCell[];
  /** Present on pending batches; resolves to their final outcome, including superseded cells. */
  readonly completion?: Promise<EditResult<TRow>> | undefined;
}

export interface CopyOptions {
  /** Prefix formula-like text with an apostrophe. Defaults to false for clipboard copies. */
  readonly escapeFormulas?: boolean | undefined;
}

export interface ExportOptions extends CopyOptions {
  /** Prepend a numeric Depth column for hierarchical exports. */
  readonly depth?: boolean | undefined;
  /** Prefix the first data column with this text repeated per level. */
  readonly indent?: string | undefined;
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
  appendData(rows: readonly TRow[]): DataIngestionResult;
  upsertData(rows: readonly TRow[]): DataIngestionResult;
  removeData(keys: readonly RowKey[]): DataIngestionResult;
  stream(
    source: AsyncIterable<readonly TRow[] | TRow>,
    options?: StreamOptions,
  ): Promise<StreamResult>;
  insertRows(rows?: readonly TRow[], at?: InsertPosition): EditResult<TRow>;
  removeRows(keys: readonly RowKey[]): EditResult<TRow>;
  getPendingChanges(): PendingChanges<TRow>;
  markSaved(keys?: readonly RowKey[]): void;
  revert(keys?: readonly RowKey[]): EditResult<TRow>;
  getSnapshot(): TableSnapshot<TRow>;
  getState(): TableState;
  /** Called after every change with the new snapshot. Returns the unsubscribe function. */
  subscribe(listener: (snapshot: TableSnapshot<TRow>) => void): () => void;

  /** Replace part of the state from outside, without calling `onStateChange`. */
  setState(patch: TableStatePatch): void;
  /** Replace the data. The undo stack is cleared unless the data is the table's own. */
  setData(data: readonly TRow[]): void;
  setColumns(columns: readonly ColumnDef<TRow>[]): void;
  /** Change tree search context without replacing rows or clearing loaded children. */
  setTreeFilter(mode: TreeFilter | undefined): void;
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

  edit(edits: CellEdit | readonly CellEdit[], options?: EditOptions<TRow>): EditResult<TRow>;
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
  readonly byKey: Map<RowKey, TableRow<TRow>>;
  readonly issues: readonly TableIssue[];
}

interface RowScene<TRow> {
  readonly data: readonly TRow[];
  readonly lazy: ReadonlyMap<RowKey, readonly TRow[]>;
}
type EditHistory<TRow> =
  | { readonly kind: "cells"; readonly changes: readonly CellChange<TRow>[] }
  | {
      readonly kind: "rows";
      readonly before: RowScene<TRow>;
      readonly after: RowScene<TRow>;
      readonly keys: readonly RowKey[];
    };

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
export function createTable<TRow, TSignal extends TreeLoadSignal = TreeLoadSignal>(
  options: TableOptions<TRow, TSignal>,
): DataTable<TRow> {
  const paginate = options.paginate ?? true;
  const expandMode = options.expandMode ?? "multiple";
  const selectionMode = options.selectionMode ?? "multiple";
  const selectScope = options.selectScope ?? "all";
  const manual = options.manual ?? false;
  const textContext: TextContext = {
    collator: createCollator(options.locale),
    normalize: options.normalizeText ?? foldText,
  };
  let treeFilter = options.treeFilter ?? "ancestors";
  const treeEnabled = Boolean(
    options.getChildren || options.getParentKey || options.hasChildren || options.loadChildren,
  );
  const rootPagination = treeEnabled && (manual || (options.paginateBy ?? "root") === "root");
  const projectedRows = new WeakMap<TableRow<TRow>, TableRow<TRow>>();
  function shareRow(base: TableRow<TRow>, next: TableRow<TRow>): TableRow<TRow> {
    const previous = projectedRows.get(base);
    if (
      previous &&
      (Object.keys(next) as (keyof TableRow<TRow>)[]).every((key) => previous[key] === next[key])
    )
      return previous;
    projectedRows.set(base, next);
    return next;
  }
  let lazyVersion = 0;
  const lazyChildren = new Map<RowKey, readonly TRow[]>();
  const childStatuses = new Map<RowKey, ChildStatus>();
  const loadIssues = new Map<RowKey, TableIssue>();
  const loadValidationIssues = new Map<RowKey, readonly TableIssue[]>();
  const pendingLoads = new Map<RowKey, TreeLoadController<TSignal>>();
  let destroyed = false;
  const undoStack = createUndoStack<EditHistory<TRow>>(options.historyLimit);
  const pendingChanges = createPendingChanges<TRow>();
  const listeners = new Set<(snapshot: TableSnapshot<TRow>) => void>();
  const optionIssues: TableIssue[] = [];
  const maxPasteCells = pasteLimit(options.pasteLimit?.maxCells, 100_000, "maxCells", optionIssues);
  const maxPasteLength = pasteLimit(
    options.pasteLimit?.maxLength,
    5_000_000,
    "maxLength",
    optionIssues,
  );
  const sourceExpected =
    options.expectedRowCount === undefined ||
    (Number.isSafeInteger(options.expectedRowCount) && options.expectedRowCount >= 0)
      ? options.expectedRowCount
      : undefined;
  if (sourceExpected !== options.expectedRowCount)
    optionIssues.push(
      issue(
        "invalid_stream_option",
        "expectedRowCount must be a non-negative safe integer; it is unknown instead.",
      ),
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
  let loadState: LoadState = "idle";
  let expectedRowCount = sourceExpected;
  let ingestionIssues: readonly TableIssue[] = [];
  let streamIssues: readonly TableIssue[] = [];
  const streaming = createStream<TRow>({
    ingest: (rows, mode) => ingestData(rows, mode),
    update(next, expected, problems, publish) {
      loadState = next;
      expectedRowCount = expected;
      streamIssues = [...problems];
      if (publish) notify();
    },
  });
  let transaction = false;
  let deferValidationNotify = false;
  let validationNotifyRequested = false;
  const validation = createEditValidation<TRow>({
    snapshot: getSnapshot,
    apply: applyChanges,
    notify,
    writeIssue(row, next) {
      const node = treeEnabled
        ? treeStage(data, resolveColumns(definitions).byId, lazyVersion).byKey.get(row.key)
        : undefined;
      if (node && (!node.writable || (node.parent && options.getChildren && !options.setChildren)))
        return issue("read_only_cell", "This nested row has no immutable writable source path.", {
          rowKey: row.key,
        });
      if (readKey(next, row.index) !== readKey(row.original, row.index))
        return issue(
          "invalid_row_operation",
          "Editing a row key is not supported; remove and insert the row instead.",
          { rowKey: row.key },
        );
      return undefined;
    },
    batch(run) {
      deferValidationNotify = true;
      validationNotifyRequested = false;
      try {
        return run();
      } finally {
        deferValidationNotify = false;
        if (validationNotifyRequested) notify();
      }
    },
    record: (changes) => undoStack.record({ kind: "cells", changes }),
    onIssues: (issues) => options.onEditIssues?.(issues),
    optimistic: options.asyncValidation === "optimistic",
    validateRow: options.validateRow,
  });

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
      return [resolveColumn(definition, textContext)];
    });
    return { columns, byId: new Map(columns.map((column) => [column.id, column])), issues };
  });

  let primedIndex:
    | {
        data: readonly TRow[];
        columns: ReadonlyMap<string, TableColumn<TRow>>;
        result: IndexedRows<TRow>;
      }
    | undefined;
  let reusableRows:
    | { columns: ReadonlyMap<string, TableColumn<TRow>>; rows: ReadonlyMap<RowKey, TableRow<TRow>> }
    | undefined;
  const indexRows = memo(
    (rows: readonly TRow[], byId: ReadonlyMap<string, TableColumn<TRow>>): IndexedRows<TRow> => {
      if (primedIndex?.data === rows && primedIndex.columns === byId) return primedIndex.result;
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
        const previous = reusableRows?.columns === byId ? reusableRows.rows.get(key) : undefined;
        const row =
          previous?.original === original && previous.index === index
            ? previous
            : createRow(original, key, index, byId, options.getRowCanExpand?.(original) ?? false);
        byKey.set(key, row);
        return row;
      });
      stableSource.set(rows, stableRows(rows));
      reusableRows = { columns: byId, rows: byKey };
      return { rows: indexed, byKey, issues };
    },
  );

  const treeStage = memo(
    (rows: readonly TRow[], byId: ReadonlyMap<string, TableColumn<TRow>>, _version: number) =>
      buildTree(rows, byId, readKey, options, lazyChildren),
  );
  const treeIndex = memo(
    (model: TreeModel<TRow>): IndexedRows<TRow> => ({
      rows: model.rows,
      byKey: new Map(model.rows.map((row) => [row.key, row])),
      issues: model.issues,
    }),
  );
  const treePositions = memo((model: TreeModel<TRow>) => {
    const result = new Map<RowKey, InsertPosition>();
    const index = (siblings: readonly TreeNode<TRow>[], parent?: RowKey): void => {
      siblings.forEach((node, position) =>
        result.set(
          node.row.key,
          Object.freeze({ parent, before: siblings[position + 1]?.row.key }),
        ),
      );
    };
    index(model.roots);
    for (const node of model.nodes) index(node.children, node.row.key);
    return result;
  });
  const processedTreeStage = memo(
    (
      model: TreeModel<TRow>,
      columns: readonly TableColumn<TRow>[],
      search: string,
      filters: TableState["filters"],
      sorting: TableState["sorting"],
      mode: TreeFilter,
    ) =>
      processTree(
        model,
        columns,
        { ...state, search, filters, sorting },
        mode,
        manual,
        textContext.normalize,
      ),
  );
  const flattenTree = createTreeFlattener<TRow>();
  const emptyAncestors = new Set<RowKey>();
  const singleTreePath = memo((model: TreeModel<TRow>, expanded: ExpandedState) => {
    const ancestors = new Set<RowKey>();
    if (expanded !== true) {
      for (const key of expanded) {
        let parent = model.byKey.get(key)?.parent;
        while (parent && !ancestors.has(parent.row.key)) {
          ancestors.add(parent.row.key);
          parent = parent.parent;
        }
      }
    }
    return ancestors;
  });
  const treeSelection = memo((model: TreeModel<TRow>, selection: readonly RowKey[]) => {
    const selected = new Set(selection);
    const counts = new Map<TreeNode<TRow>, { selected: number; total: number }>();
    const stack = model.roots.map((node) => ({ node, exit: false }));
    while (stack.length) {
      const { node, exit } = stack.pop()!;
      if (!exit) {
        stack.push({ node, exit: true });
        for (const child of node.children) stack.push({ node: child, exit: false });
      } else {
        let count = selected.has(node.row.key) ? 1 : 0;
        let total = 1;
        for (const child of node.children) {
          const value = counts.get(child)!;
          count += value.selected;
          total += value.total;
        }
        counts.set(node, { selected: count, total });
      }
    }
    return counts;
  });

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

  let primedFilter:
    | {
        rows: readonly TableRow<TRow>[];
        columns: readonly TableColumn<TRow>[];
        search: string;
        filters: TableState["filters"];
        result: readonly TableRow<TRow>[];
      }
    | undefined;
  let primedSort:
    | {
        rows: readonly TableRow<TRow>[];
        columns: readonly TableColumn<TRow>[];
        sorting: TableState["sorting"];
        result: readonly TableRow<TRow>[];
      }
    | undefined;
  const filterStage = memo(
    (
      rows: readonly TableRow<TRow>[],
      columns: readonly TableColumn<TRow>[],
      search: string,
      filters: TableState["filters"],
    ) =>
      primedFilter?.rows === rows &&
      primedFilter.columns === columns &&
      primedFilter.search === search &&
      primedFilter.filters === filters
        ? primedFilter.result
        : filterRows(rows, columns, search, filters, textContext.normalize),
  );
  const sortStage = memo(
    (
      rows: readonly TableRow<TRow>[],
      columns: readonly TableColumn<TRow>[],
      sorting: TableState["sorting"],
    ) =>
      primedSort?.rows === rows && primedSort.columns === columns && primedSort.sorting === sorting
        ? primedSort.result
        : sortRows(rows, columns, sorting),
  );
  const rowMembership = new WeakMap<readonly TableRow<TRow>[], Set<RowKey>>();
  function membership(rows: readonly TableRow<TRow>[]): Set<RowKey> {
    let keys = rowMembership.get(rows);
    if (!keys) {
      keys = new Set(rows.map((row) => row.key));
      rowMembership.set(rows, keys);
    }
    return keys;
  }
  const selectedSet = memo((selection: readonly RowKey[]) => new Set(selection));
  const expansionStage = memo(
    (indexed: IndexedRows<TRow>, expanded: ExpandedState, selection: readonly RowKey[]) => {
      const keys = expanded === true ? undefined : new Set(expanded);
      const selected = new Set(selection);
      const rows = mapList(indexed.rows, (row) => {
        const isExpanded = row.canExpand && (expanded === true || (keys?.has(row.key) ?? false));
        return isExpanded || selected.has(row.key)
          ? shareRow(
              row,
              Object.freeze({
                ...row,
                isExpanded,
                selection: selected.has(row.key) ? ("all" as const) : ("none" as const),
              }),
            )
          : row;
      });
      const byKey = {
        get(key: RowKey): TableRow<TRow> | undefined {
          const row = indexed.byKey.get(key);
          return row && row.index < rows.length ? rows[row.index] : undefined;
        },
      };
      return { rows, byKey };
    },
  );
  const expandedOrder = memo(
    (rows: readonly TableRow<TRow>[], byKey: { get(key: RowKey): TableRow<TRow> | undefined }) =>
      mapList(rows, (row) => byKey.get(row.key)!),
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
    const cellProblems = validation.problems();
    const dirty = new Set(pendingChanges.entries.keys());
    const metadata = (row: TableRow<TRow>): TableRow<TRow> =>
      dirty.has(row.key) || cellProblems.has(row.key)
        ? shareRow(
            row,
            Object.freeze({
              ...row,
              isDirty: dirty.has(row.key),
              cellIssues: cellProblems.get(row.key),
            }),
          )
        : row;
    const { columns, byId, issues: columnIssues } = resolveColumns(definitions);
    const model = treeEnabled ? treeStage(data, byId, lazyVersion) : undefined;
    const indexed = model ? { rows: model.rows, issues: model.issues } : indexRows(data, byId);
    const expanded = model
      ? undefined
      : expansionStage(indexed as IndexedRows<TRow>, state.expanded, state.selection);
    const ordered = orderColumns(columns, state.columnOrder, state.hiddenColumns);
    const issues = [
      ...optionIssues,
      ...ingestionIssues,
      ...streamIssues,
      ...columnIssues,
      ...indexed.issues,
      ...stateIssues(byId),
      ...loadIssues.values(),
      ...Array.from(loadValidationIssues.values()).flat(),
      ...Array.from(cellProblems.values()).flatMap((row) => [...row.values()]),
    ];
    const requestedSize = state.pagination.pageSize;
    let pageSize =
      Number.isInteger(requestedSize) && requestedSize >= 1 ? requestedSize : DEFAULT_PAGE_SIZE;

    let processedRows: readonly TableRow<TRow>[];
    let rows: readonly TableRow<TRow>[];
    let filteredCount: number;
    let page: number;
    let pageCount: number;
    let treeRow: ((key: RowKey) => TableRow<TRow> | undefined) | undefined;
    let totalCount = indexed.rows.length;
    if (model) {
      const processed = processedTreeStage(
        model,
        columns,
        state.search,
        state.filters,
        state.sorting,
        treeFilter,
      );
      const ancestors =
        expandMode === "single" ? singleTreePath(model, state.expanded) : emptyAncestors;
      const visible = flattenTree(processed, state.expanded, ancestors);
      const expandedState = state.expanded;
      const keys = state.expanded === true ? undefined : new Set(state.expanded);
      const selected = treeSelection(model, state.selection);
      const projected = new Map<RowKey, TableRow<TRow>>();
      const statuses = new Map(childStatuses);
      treeRow = (key) => {
        const cached = projected.get(key);
        if (cached) return cached;
        const node = model.byKey.get(key);
        if (!node) return undefined;
        const status =
          statuses.get(key) ?? (node.children.length || !node.unloaded ? "loaded" : "idle");
        const count = selected.get(node)!;
        const canExpand =
          node.children.length > 0 ||
          status !== "loaded" ||
          (options.getRowCanExpand?.(node.row.original) ?? false);
        const result = shareRow(
          node.row,
          Object.freeze({
            ...node.row,
            isDirty: dirty.has(key),
            cellIssues: cellProblems.get(key),
            depth: node.depth,
            parentKey: node.parent?.row.key,
            childCount: status === "loaded" ? node.children.length : undefined,
            childStatus: status,
            canExpand,
            isExpanded:
              canExpand &&
              (expandedState === true ||
                (keys?.has(key) ?? false) ||
                ancestors.has(key) ||
                processed.autoExpanded.has(key)),
            selection: coverage(count.selected, count.total),
          }),
        );
        projected.set(key, result);
        return result;
      };
      processedRows = visible.map((node) => treeRow!(node.row.key)!);
      filteredCount = manual
        ? (rowCount ?? model.roots.length)
        : rootPagination
          ? processed.roots.length
          : visible.length;
      totalCount = rootPagination ? model.roots.length : model.nodes.length;
      pageCount = countPages(filteredCount, pageSize);
      page = clampPage(state.pagination.page, pageCount);
      if (manual) rows = processedRows;
      else if (rootPagination) {
        const roots = new Set(processed.roots.slice((page - 1) * pageSize, page * pageSize));
        const allRoots = new Set(processed.roots);
        let root: TreeNode<TRow> | undefined;
        rows = processedRows.filter((_row, index) => {
          const node = visible[index]!;
          if (allRoots.has(node)) root = node;
          return root !== undefined && roots.has(root);
        });
      } else rows = paginateRows(processedRows, { page, pageSize });
    } else if (manual) {
      processedRows = expanded!.rows;
      rows = expanded!.rows;
      filteredCount = rowCount ?? indexed.rows.length;
      pageCount = countPages(filteredCount, pageSize);
      page = clampPage(state.pagination.page, pageCount);
    } else {
      const filtered = filterStage(indexed.rows, columns, state.search, state.filters);
      processedRows = expandedOrder(sortStage(filtered, columns, state.sorting), expanded!.byKey);
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
    const flatProjected = new Map<RowKey, TableRow<TRow>>();
    if (!model) {
      const project = (row: TableRow<TRow>): TableRow<TRow> => {
        let result = flatProjected.get(row.key);
        if (!result) {
          result = metadata(row);
          flatProjected.set(row.key, result);
        }
        return result;
      };
      const shared = rows === processedRows;
      processedRows = mapList(processedRows, project);
      rows = shared ? processedRows : rows.map(project);
    }

    const selected = selectedSet(state.selection);
    const allData = model ? model.byKey : (indexed as IndexedRows<TRow>).byKey;
    const allProcessedKeys = model
      ? undefined
      : manual
        ? undefined
        : membership(filterStage(indexed.rows, columns, state.search, state.filters));
    const selectedInProcessed = state.selection.filter(
      (key) => allData.has(key) && (!allProcessedKeys || allProcessedKeys.has(key)),
    ).length;
    const pageSelected =
      rows === processedRows
        ? selectedInProcessed
        : rows.filter((row) => selected.has(row.key)).length;
    const scopeRows = selectScope === "page" || manual ? rows : processedRows;
    const scopeSelected =
      scopeRows === rows
        ? pageSelected
        : model
          ? scopeRows.filter((row) => selected.has(row.key)).length
          : selectedInProcessed;
    const pageStart = rows.length === 0 ? 0 : (page - 1) * pageSize + 1;
    const sortIndex = new Map(
      state.sorting.map((rule, priority) => [rule.column, { direction: rule.direction, priority }]),
    );

    return Object.freeze({
      tree: treeEnabled,
      loadState,
      loadedRowCount: indexed.rows.length,
      expectedRowCount,
      state,
      columns: ordered.visible,
      allColumns: ordered.all,
      rows,
      renderItems:
        !model && state.expanded !== true && state.expanded.length === 0
          ? mapList(rows, (row, rowIndex) =>
              Object.freeze({ kind: "row" as const, key: getRowItemKey(row.key), row, rowIndex }),
            )
          : Object.freeze(
              rows.flatMap((row, rowIndex): TableRenderItem<TRow>[] => {
                const item = Object.freeze({
                  kind: "row" as const,
                  key: getRowItemKey(row.key),
                  row,
                  rowIndex,
                });
                return row.isExpanded &&
                  (!model || (options.getRowCanExpand?.(row.original) ?? false))
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
      totalRowCount: manual ? filteredCount : totalCount,
      pageStart,
      pageEnd:
        rows.length === 0
          ? 0
          : rootPagination
            ? Math.min(filteredCount, page * pageSize)
            : pageStart + rows.length - 1,
      pageItems: paginationItems(page, pageCount),
      canPreviousPage: page > 1,
      canNextPage: page < pageCount,
      selectionMode,
      selectedCount: model
        ? state.selection.filter((key) => model.byKey.has(key)).length
        : state.selection.length,
      pageSelection: coverage(pageSelected, rows.length),
      allSelection: coverage(scopeSelected, scopeRows.length),
      canUndo: undoStack.canUndo,
      canRedo: undoStack.canRedo,
      issues: Object.freeze(issues),
      pendingCells: validation.cells(),
      isSelected: (key: RowKey): boolean => selected.has(key),
      getSort: (columnId: string): SortInfo | undefined => sortIndex.get(columnId),
      getColumn: (columnId: string): TableColumn<TRow> | undefined => byId.get(columnId),
      getRow: (key: RowKey): TableRow<TRow> | undefined =>
        treeRow
          ? treeRow(key)
          : (flatProjected.get(key) ??
            (expanded!.byKey.get(key) ? metadata(expanded!.byKey.get(key)!) : undefined)),
    });
  }

  function getSnapshot(): TableSnapshot<TRow> {
    snapshot ??= computeSnapshot();
    return snapshot;
  }

  function notify(): void {
    snapshot = undefined;
    if (deferValidationNotify) {
      validationNotifyRequested = true;
      return;
    }
    if (transaction) return;
    if (listeners.size === 0) {
      return;
    }
    const next = getSnapshot();
    for (const listener of listeners) {
      listener(next);
    }
  }

  function abortLoads(all = false): void {
    for (const [key, controller] of pendingLoads) {
      const row = all ? undefined : getSnapshot().getRow(key);
      // Closing an ancestor also makes an in-flight descendant unnecessary.
      const visible =
        !all && getSnapshot().processedRows.some((candidate) => candidate.key === key);
      if (all || !row?.isExpanded || !visible) {
        pendingLoads.delete(key);
        childStatuses.delete(key);
        controller.abort();
        snapshot = undefined;
      }
    }
  }

  function requestChildren(row: TableRow<TRow>): void {
    if (
      !options.loadChildren ||
      destroyed ||
      pendingLoads.has(row.key) ||
      lazyChildren.has(row.key) ||
      row.childStatus === "loaded"
    )
      return;
    const key = row.key;
    if (!options.createChildLoadController) {
      childStatuses.set(key, "error");
      loadIssues.set(
        key,
        issue(
          "invalid_tree_option",
          "Lazy children require createChildLoadController from the caller's runtime.",
          { rowKey: key },
        ),
      );
      notify();
      return;
    }
    let controller: TreeLoadController<TSignal>;
    try {
      controller = options.createChildLoadController();
    } catch (error) {
      loadIssues.set(key, issue("tree_load_error", String(error), { rowKey: key }));
      childStatuses.set(key, "error");
      notify();
      return;
    }
    pendingLoads.set(key, controller);
    childStatuses.set(key, "loading");
    loadIssues.delete(key);
    loadValidationIssues.delete(key);
    notify();
    // Promise scheduling catches synchronous loader failures as well as rejected loads.
    void Promise.resolve()
      .then(() => (controller.signal.aborted ? [] : options.loadChildren!(row, controller.signal)))
      .then((children) => {
        if (controller.signal.aborted || pendingLoads.get(key) !== controller || destroyed)
          return undefined;
        const { byId } = resolveColumns(definitions);
        const existing = treeStage(data, byId, lazyVersion);
        // Validate a loaded subtree against all existing keys, including collapsed rows.
        const candidate = buildTree(
          children,
          byId,
          readKey,
          { ...options, getParentKey: undefined },
          new Map(),
        );
        pendingLoads.delete(key);
        loadValidationIssues.set(
          key,
          candidate.issues.filter(
            (problem) => problem.code === "tree_cycle" || problem.code === "tree_depth_exceeded",
          ),
        );
        const collisions = candidate.nodes.filter((node) => existing.byKey.has(node.row.key));
        if (
          collisions.length ||
          candidate.issues.some((problem) => problem.code === "duplicate_row_key")
        ) {
          childStatuses.set(key, "error");
          loadIssues.set(
            key,
            issue(
              "tree_duplicate_key",
              "Loaded children collide with existing keys; the batch is rejected.",
              { rowKey: key },
            ),
          );
        } else {
          lazyChildren.set(key, children);
          childStatuses.set(key, "loaded");
          lazyVersion++;
          // A selected parent covers children as they arrive.
          if (state.selection.includes(key) && selectionMode === "multiple") {
            const nextModel = treeStage(data, byId, lazyVersion);
            applySelection([...state.selection, ...selectionKeys([key], nextModel)]);
          }
        }
        notify();
        startVisibleLoads();
        return undefined;
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || pendingLoads.get(key) !== controller || destroyed) return;
        pendingLoads.delete(key);
        childStatuses.set(key, "error");
        loadIssues.set(
          key,
          issue("tree_load_error", `Children could not be loaded: ${String(error)}`, {
            rowKey: key,
          }),
        );
        notify();
      });
  }

  function startVisibleLoads(): void {
    if (!treeEnabled || !options.loadChildren || destroyed) return;
    const current = getSnapshot();
    for (const row of current.rows)
      if (row.isExpanded && row.childStatus === "idle") requestChildren(row);
  }

  function selectionKeys(keys: readonly RowKey[], model?: TreeModel<TRow>): RowKey[] {
    if (!treeEnabled || selectionMode !== "multiple") return [...keys];
    model ??= treeStage(data, resolveColumns(definitions).byId, lazyVersion);
    const result = new Set(keys);
    const stack = keys.flatMap((key) => {
      const node = model.byKey.get(key);
      return node ? [node] : [];
    });
    const visited = new Set<RowKey>();
    while (stack.length) {
      const node = stack.pop()!;
      if (visited.has(node.row.key)) continue;
      visited.add(node.row.key);
      result.add(node.row.key);
      for (const child of node.children) stack.push(child);
    }
    return [...result];
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
    snapshot = undefined;
    abortLoads();
    if (next !== previous) options.onStateChange?.(state, previous);
    notify();
    startVisibleLoads();
  }

  function canonicalExpanded(
    expanded: ExpandedState,
    candidate: TableState = state,
  ): ExpandedState {
    if (expandMode === "multiple") return expanded;
    if (expanded !== true) return expanded.slice(-1);
    const { columns, byId } = resolveColumns(definitions);
    if (treeEnabled) {
      const model = treeStage(data, byId, lazyVersion);
      const tree = processedTreeStage(
        model,
        columns,
        candidate.search,
        candidate.filters,
        candidate.sorting,
        treeFilter,
      );
      const first = tree.roots.find(
        (node) =>
          node.children.length > 0 ||
          (options.hasChildren?.(node.row.original) ?? false) ||
          (options.getRowCanExpand?.(node.row.original) ?? false),
      );
      return first ? [first.row.key] : [];
    }
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
    const model = treeEnabled
      ? treeStage(data, resolveColumns(definitions).byId, lazyVersion)
      : undefined;
    const replacements = new Map<TreeNode<TRow>, TRow>();
    const cache = new Map(lazyChildren);
    const originalOf = (node: TreeNode<TRow>): TRow => replacements.get(node) ?? node.row.original;
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
      const node = model?.byKey.get(row.key);
      const original = node ? originalOf(node) : (working[row.index] as TRow);
      if (node && !node.writable) {
        issues.push(
          issue(
            "read_only_cell",
            "A recovered nested root has no unambiguous source path for editing.",
            { rowKey: row.key, column: column.id },
          ),
        );
        continue;
      }
      if (node?.parent && options.getChildren && !options.setChildren) {
        issues.push(
          issue(
            "read_only_cell",
            "Editing a nested child requires an immutable setChildren callback.",
            { rowKey: row.key, column: column.id },
          ),
        );
        continue;
      }
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
      let updated: TRow | undefined;
      try {
        updated = column.setValue(original, value);
      } catch (error) {
        issues.push(
          issue("invalid_value", error instanceof Error ? error.message : String(error), {
            rowKey: row.key,
            column: column.id,
          }),
        );
        continue;
      }
      if (updated === undefined) {
        issues.push(
          issue("read_only_cell", `The "${column.id}" column has no way to write a value.`, {
            rowKey: row.key,
            column: column.id,
          }),
        );
        continue;
      }
      if (readKey(updated, row.index) !== readKey(original, row.index)) {
        issues.push(
          issue(
            "invalid_row_operation",
            "Editing a row key is not supported; remove and insert the row instead.",
            { rowKey: row.key, column: column.id },
          ),
        );
        continue;
      }
      if (!node) working[row.index] = updated;
      else {
        const planned = new Map<TreeNode<TRow>, TRow>([[node, updated]]);
        const plannedCache = new Map<RowKey, readonly TRow[]>();
        let cursor = node;
        try {
          while (cursor.parent) {
            const parent = cursor.parent;
            const children = parent.children.map(
              (child) => planned.get(child) ?? originalOf(child),
            );
            if (cursor.lazy) plannedCache.set(parent.row.key, children);
            if (options.setChildren)
              planned.set(parent, options.setChildren(originalOf(parent), children));
            cursor = parent;
          }
        } catch (error) {
          issues.push(
            issue("invalid_value", error instanceof Error ? error.message : String(error), {
              rowKey: row.key,
              column: column.id,
            }),
          );
          continue;
        }
        for (const [item, plannedRow] of planned) replacements.set(item, plannedRow);
        for (const [key, children] of plannedCache) cache.set(key, children);
        if (!options.getChildren && !node.lazy) working[node.sourceIndex] = updated;
        if (options.getChildren || options.setChildren)
          working[cursor.sourceIndex] = originalOf(cursor);
      }
      changes.push({ rowKey: row.key, column: column.id, previous, value, row: updated });
    }

    let status: EditStatus;
    if (changes.length === 0) {
      status = issues.length > 0 ? "rejected" : "unchanged";
    } else {
      status = issues.length > 0 ? "partial" : "applied";
      data = working;
      if (model) {
        lazyChildren.clear();
        for (const [key, children] of cache) lazyChildren.set(key, children);
        lazyVersion++;
      }
      if (record) {
        if (!transaction) undoStack.record({ kind: "cells", changes });
      }
      const groups = new Map<RowKey, CellChange<TRow>[]>();
      for (const change of changes) {
        const group = groups.get(change.rowKey) ?? [];
        group.push(change);
        groups.set(change.rowKey, group);
      }
      for (const [key, group] of groups)
        pendingChanges.record(
          key,
          current.getRow(key)!.original,
          group.at(-1)!.row,
          positionOf(key),
          group,
        );
      if (!transaction) options.onDataChange?.(data, changes);
      notify();
    }
    if (issues.length > 0 && !transaction) {
      options.onEditIssues?.(issues);
    }
    return Object.freeze({
      status,
      changes: Object.freeze(changes),
      issues: Object.freeze(issues),
      rowChanges: Object.freeze([]),
      pendingCells: Object.freeze([]),
    });
  }

  function sourceRows(): IndexedRows<TRow> {
    const { byId } = resolveColumns(definitions);
    const model = treeEnabled ? treeStage(data, byId, lazyVersion) : undefined;
    return model ? treeIndex(model) : indexRows(data, byId);
  }
  function positionOf(key: RowKey): InsertPosition {
    const { byId } = resolveColumns(definitions);
    if (treeEnabled) {
      const model = treeStage(data, byId, lazyVersion);
      return treePositions(model).get(key) ?? Object.freeze({});
    }
    const indexed = indexRows(data, byId);
    const row = indexed.byKey.get(key);
    return Object.freeze({ before: row ? indexed.rows[row.index + 1]?.key : undefined });
  }
  function scene(): RowScene<TRow> {
    return { data, lazy: new Map(lazyChildren) };
  }
  function resultForRows(
    changes: readonly RowChange<TRow>[],
    issues: readonly TableIssue[],
    cells: readonly CellChange<TRow>[] = [],
  ): EditResult<TRow> {
    return Object.freeze({
      status:
        changes.length || cells.length
          ? issues.length
            ? "partial"
            : "applied"
          : issues.length
            ? "rejected"
            : "unchanged",
      changes: Object.freeze([...cells]),
      rowChanges: Object.freeze([...changes]),
      pendingCells: Object.freeze([]),
      issues: Object.freeze([...issues]),
    });
  }
  function rowProblem(message: string, rowKey?: RowKey): TableIssue {
    return issue("invalid_row_operation", message, { rowKey });
  }
  function stableRows(rows: readonly TRow[]): boolean {
    return (
      options.rowKey !== undefined ||
      rows.every((row) => {
        const key = getPath(row, "id");
        return typeof key === "string" || typeof key === "number";
      })
    );
  }
  function cellDifferences(previous: TRow, row: TRow, key: RowKey): CellChange<TRow>[] {
    return resolveColumns(definitions).columns.flatMap((column) => {
      const before = column.getValue(previous);
      const value = column.getValue(row);
      return Object.is(before, value)
        ? []
        : [{ rowKey: key, column: column.id, previous: before, value, row }];
    });
  }
  function recordRows(
    previous: IndexedRows<TRow>,
    keys: readonly RowKey[],
    positions: ReadonlyMap<RowKey, InsertPosition>,
    baselines: ReadonlyMap<RowKey, TRow> = new Map(),
  ): RowChange<TRow>[] {
    const next = sourceRows();
    const rowChanges: RowChange<TRow>[] = [];
    for (const key of keys) {
      const before = previous.byKey.get(key)?.original;
      const row = next.byKey.get(key)?.original;
      const position = positions.get(key) ?? positionOf(key);
      const cells =
        before !== undefined && row !== undefined ? cellDifferences(before, row, key) : [];
      const baseline = baselines.get(key);
      const pending = pendingChanges.entries.get(key);
      if (row === undefined && baseline !== undefined && pending?.previous !== undefined)
        pending.previous = baseline;
      pendingChanges.record(
        key,
        row === undefined ? (baseline ?? before) : before,
        row,
        position,
        cells,
      );
      if (before === undefined && row !== undefined)
        rowChanges.push(
          Object.freeze({ kind: "inserted", rowKey: key, row, position: positionOf(key) }),
        );
      else if (row === undefined && before !== undefined)
        rowChanges.push(Object.freeze({ kind: "removed", rowKey: key, row: before, position }));
    }
    return rowChanges;
  }
  function publishRows(
    before: RowScene<TRow>,
    previous: IndexedRows<TRow>,
    keys: readonly RowKey[],
    positions: ReadonlyMap<RowKey, InsertPosition>,
    issues: readonly TableIssue[],
    baselines: ReadonlyMap<RowKey, TRow> = new Map(),
  ): EditResult<TRow> {
    const rowChanges = recordRows(previous, keys, positions, baselines);
    if (!transaction) {
      undoStack.record({ kind: "rows", before, after: scene(), keys });
      options.onDataChange?.(data, []);
      if (issues.length) options.onEditIssues?.(issues);
    }
    notify();
    return resultForRows(rowChanges, issues);
  }
  function restoreScene(
    entry: Extract<EditHistory<TRow>, { kind: "rows" }>,
    direction: "undo" | "redo",
  ): void {
    const previous = sourceRows();
    const baselines = removalBaselines();
    const positions = new Map(entry.keys.map((key) => [key, positionOf(key)]));
    const target = direction === "undo" ? entry.before : entry.after;
    data = target.data;
    const changed = new Set([...entry.before.lazy.keys(), ...entry.after.lazy.keys()]);
    for (const key of changed) {
      if (entry.before.lazy.get(key) === entry.after.lazy.get(key)) continue;
      const rows = target.lazy.get(key);
      if (rows) lazyChildren.set(key, rows);
      else lazyChildren.delete(key);
    }
    lazyVersion++;
    recordRows(previous, entry.keys, positions, baselines);
    options.onDataChange?.(data, []);
    notify();
  }
  function removalBaselines(): ReadonlyMap<RowKey, TRow> {
    const baselines = new Map<RowKey, TRow>();
    if (!options.getChildren || !options.setChildren) return baselines;
    const model = treeStage(data, resolveColumns(definitions).byId, lazyVersion);
    for (const node of model.nodes.toReversed()) {
      const entry = pendingChanges.entries.get(node.row.key);
      if (entry && entry.previous === undefined) continue;
      let baseline = entry?.previous ?? node.row.original;
      const children = node.children
        .filter(
          (child) =>
            !pendingChanges.entries.has(child.row.key) ||
            pendingChanges.entries.get(child.row.key)!.previous !== undefined,
        )
        .map((child) => baselines.get(child.row.key) ?? child.row.original);
      const originalChildren = options.getChildren(baseline) ?? [];
      if (
        children.length !== originalChildren.length ||
        children.some((child, index) => child !== originalChildren[index])
      )
        baseline = options.setChildren(baseline, children);
      baselines.set(node.row.key, baseline);
    }
    return baselines;
  }
  function rewriteNested(
    model: TreeModel<TRow>,
    removed: ReadonlySet<RowKey>,
    overrides: ReadonlyMap<RowKey, readonly TRow[]>,
    cache: Map<RowKey, readonly TRow[]>,
  ): readonly TRow[] {
    const replacements = new Map<TreeNode<TRow>, TRow>();
    for (const node of model.nodes.toReversed()) {
      if (removed.has(node.row.key)) continue;
      const children =
        overrides.get(node.row.key) ??
        node.children
          .filter((child) => !removed.has(child.row.key))
          .map((child) => replacements.get(child) ?? child.row.original);
      const changed =
        overrides.has(node.row.key) ||
        children.length !== node.children.length ||
        children.some((child, index) => child !== node.children[index]?.row.original);
      if (!changed) continue;
      if (!options.setChildren) throw new Error("Changing nested children requires setChildren.");
      replacements.set(node, options.setChildren(node.row.original, children));
      if (cache.has(node.row.key)) cache.set(node.row.key, children);
    }
    const roots = new Map(
      model.roots.filter((node) => node.writable).map((node) => [node.sourceIndex, node]),
    );
    return data.flatMap((row, index) => {
      const node = roots.get(index);
      return node && removed.has(node.row.key)
        ? []
        : [node ? (replacements.get(node) ?? row) : row];
    });
  }
  function insertRows(rows?: readonly TRow[], at: InsertPosition = {}): EditResult<TRow> {
    const before = scene();
    const previous = sourceRows();
    const problems: TableIssue[] = [];
    const reject = (problem: TableIssue): EditResult<TRow> => {
      if (!transaction) options.onEditIssues?.([problem]);
      return resultForRows([], [problem]);
    };
    let incoming: readonly TRow[];
    try {
      incoming = rows ?? (options.createRow ? [options.createRow()] : []);
    } catch (error) {
      return reject(rowProblem(error instanceof Error ? error.message : String(error)));
    }
    if (rows === undefined && !options.createRow)
      return reject(rowProblem("insertRows() requires rows or a createRow callback."));
    if (!incoming.length) return resultForRows([], []);
    if (!stableRows(data) || !stableRows(incoming))
      return reject(
        rowProblem("Row operations require stable row keys; supply rowKey or an id on every row."),
      );
    const { byId } = resolveColumns(definitions);
    const model = treeEnabled ? treeStage(data, byId, lazyVersion) : undefined;
    const parent = at.parent === undefined ? undefined : model?.byKey.get(at.parent);
    const sibling = at.before === undefined ? undefined : previous.byKey.get(at.before);
    if (at.parent !== undefined && !parent)
      return reject(
        issue("unknown_row", "The insertion parent does not exist.", { rowKey: at.parent }),
      );
    if (at.before !== undefined && !sibling)
      return reject(
        issue("unknown_row", "The insertion sibling does not exist.", { rowKey: at.before }),
      );
    if (
      sibling &&
      (model?.byKey.get(sibling.key)?.parent?.row.key ?? sibling.parentKey) !== at.parent
    )
      return reject(rowProblem("The before row must belong to the requested parent.", sibling.key));
    if (parent && !parent.writable)
      return reject(rowProblem("A recovered parent has no writable source path.", parent.row.key));
    if (parent && getSnapshot().getRow(parent.row.key)?.childStatus !== "loaded")
      return reject(
        rowProblem("Load the parent's children before inserting rows.", parent.row.key),
      );
    const cache = new Map(lazyChildren);
    let next: readonly TRow[];
    try {
      if (options.getChildren && parent && model) {
        const children = parent.children.map((child) => child.row.original);
        const index =
          at.before === undefined
            ? children.length
            : parent.children.findIndex((child) => child.row.key === at.before);
        children.splice(index, 0, ...incoming);
        next = rewriteNested(model, new Set(), new Map([[parent.row.key, children]]), cache);
      } else if (parent && cache.has(parent.row.key)) {
        incoming = incoming.map((row) =>
          options.setParentKey ? options.setParentKey(row, parent.row.key) : row,
        );
        const children = [...cache.get(parent.row.key)!];
        const index =
          at.before === undefined
            ? children.length
            : parent.children.findIndex((child) => child.row.key === at.before);
        children.splice(index, 0, ...incoming);
        cache.set(parent.row.key, children);
        next = [...data];
      } else {
        if (parent && options.getParentKey) {
          incoming = incoming.map((row) =>
            options.setParentKey ? options.setParentKey(row, parent.row.key) : row,
          );
          if (incoming.some((row) => options.getParentKey!(row) !== parent.row.key))
            return reject(
              rowProblem("Supply setParentKey or rows already addressed to the requested parent."),
            );
        }
        const working = [...data];
        working.splice(sibling?.index ?? working.length, 0, ...incoming);
        next = working;
      }
      const candidate = treeEnabled
        ? buildTree(next, byId, readKey, options, cache)
        : indexRows(next, byId);
      if (!stableRows(candidate.rows.map((row) => row.original)))
        return reject(rowProblem("Every inserted descendant must have a stable key."));
      const baseline = new Map<string, number>();
      for (const problem of previous.issues) {
        const key = `${problem.code}:${String(problem.rowKey)}`;
        baseline.set(key, (baseline.get(key) ?? 0) + 1);
      }
      problems.push(
        ...candidate.issues.filter((problem) => {
          const key = `${problem.code}:${String(problem.rowKey)}`;
          const remaining = baseline.get(key) ?? 0;
          if (!remaining) return true;
          baseline.set(key, remaining - 1);
          return false;
        }),
      );
      if (problems.length) {
        if (!transaction) options.onEditIssues?.(problems);
        return resultForRows([], problems);
      }
      const keys = candidate.rows
        .filter((row) => !previous.byKey.has(row.key))
        .map((row) => row.key);
      if (!keys.length) return reject(rowProblem("No unique rows can be inserted."));
      data = next;
      lazyChildren.clear();
      for (const [key, value] of cache) lazyChildren.set(key, value);
      lazyVersion++;
      return publishRows(before, previous, keys, new Map(), []);
    } catch (error) {
      return reject(rowProblem(error instanceof Error ? error.message : String(error)));
    }
  }
  function removeRows(keys: readonly RowKey[]): EditResult<TRow> {
    const before = scene();
    const previous = sourceRows();
    const problems: TableIssue[] = [];
    const removed = new Set<RowKey>();
    const { byId } = resolveColumns(definitions);
    const model = treeEnabled ? treeStage(data, byId, lazyVersion) : undefined;
    if (!stableRows(data)) {
      const problem = rowProblem("Row operations require stable row keys.");
      if (!transaction) options.onEditIssues?.([problem]);
      return resultForRows([], [problem]);
    }
    for (const key of keys) {
      if (!previous.byKey.has(key)) {
        problems.push(issue("unknown_row", "The row to remove does not exist.", { rowKey: key }));
        continue;
      }
      const node = model?.byKey.get(key);
      if (node && !node.writable) {
        problems.push(rowProblem("A recovered row has no writable source path.", key));
        continue;
      }
      const stack = node ? [node] : [];
      removed.add(key);
      while (stack.length) {
        const item = stack.pop()!;
        removed.add(item.row.key);
        for (const child of item.children) stack.push(child);
      }
    }
    if (!removed.size) {
      if (problems.length && !transaction) options.onEditIssues?.(problems);
      return resultForRows([], problems);
    }
    const positions = new Map([...removed].map((key) => [key, positionOf(key)]));
    const cache = new Map(lazyChildren);
    try {
      const baselines = removalBaselines();
      const next =
        options.getChildren && model
          ? rewriteNested(model, removed, new Map(), cache)
          : data.filter((row, index) => !removed.has(readKey(row, index)));
      for (const [key, children] of cache) {
        if (removed.has(key)) cache.delete(key);
        else
          cache.set(
            key,
            children.filter((row, index) => !removed.has(readKey(row, index))),
          );
      }
      data = next;
      lazyChildren.clear();
      for (const [key, value] of cache) lazyChildren.set(key, value);
      lazyVersion++;
      validation.cancel([...removed]);
      abortLoads();
      return publishRows(before, previous, [...removed], positions, problems, baselines);
    } catch (error) {
      problems.push(rowProblem(error instanceof Error ? error.message : String(error)));
      if (!transaction) options.onEditIssues?.(problems);
      return resultForRows([], problems);
    }
  }
  function revert(keys?: readonly RowKey[]): EditResult<TRow> {
    const selected = new Set(keys ?? pendingChanges.entries.keys());
    const entries = [...pendingChanges.entries]
      .filter(([key]) => selected.has(key))
      .map(([key, entry]) => [key, { ...entry, cells: new Map(entry.cells) }] as const);
    if (!entries.length) return resultForRows([], []);
    const before = scene();
    const previous = sourceRows();
    const positions = new Map([...selected].map((key) => [key, positionOf(key)]));
    const problems: TableIssue[] = [];
    const cells: CellChange<TRow>[] = [];
    transaction = true;
    try {
      problems.push(
        ...removeRows(
          entries.filter(([, entry]) => entry.previous === undefined).map(([key]) => key),
        ).issues,
      );
      const missing = entries.filter(
        ([, entry]) => entry.previous !== undefined && entry.row === undefined,
      );
      for (let pass = 0; missing.length && pass <= entries.length; pass++) {
        let progress = false;
        for (let index = missing.length - 1; index >= 0; index--) {
          const [key, entry] = missing[index]!;
          if (sourceRows().byKey.has(key)) {
            missing.splice(index, 1);
            progress = true;
            continue;
          }
          if (entry.position.parent !== undefined && !sourceRows().byKey.has(entry.position.parent))
            continue;
          const at = {
            ...entry.position,
            before:
              entry.position.before !== undefined && sourceRows().byKey.has(entry.position.before)
                ? entry.position.before
                : undefined,
          };
          const result = insertRows([entry.previous!], at);
          problems.push(...result.issues);
          missing.splice(index, 1);
          progress = true;
        }
        if (!progress) break;
      }
      for (const [key] of missing)
        problems.push(
          rowProblem("The saved parent is missing; restore it before this child.", key),
        );
      const edits = entries.flatMap(([key, entry]) =>
        entry.previous !== undefined && sourceRows().byKey.has(key)
          ? [...entry.cells.values()].map((change) => ({
              rowKey: key,
              column: change.column,
              value: change.previous,
            }))
          : [],
      );
      const result = applyChanges(edits, false);
      cells.push(...result.changes);
      problems.push(...result.issues);
      for (const [key] of entries)
        if (!problems.some((problem) => problem.rowKey === key)) pendingChanges.entries.delete(key);
      validation.cancel([...selected]);
    } finally {
      transaction = false;
    }
    const after = scene();
    if (before.data !== after.data || cells.length)
      undoStack.record({ kind: "rows", before, after, keys: [...selected] });
    const next = sourceRows();
    const rowChanges = [...selected].flatMap((key): RowChange<TRow>[] => {
      const old = previous.byKey.get(key);
      const row = next.byKey.get(key);
      return !old && row
        ? [{ kind: "inserted", rowKey: key, row: row.original, position: positionOf(key) }]
        : old && !row
          ? [{ kind: "removed", rowKey: key, row: old.original, position: positions.get(key)! }]
          : [];
    });
    if (before.data !== after.data) options.onDataChange?.(data, cells);
    if (problems.length) options.onEditIssues?.(problems);
    notify();
    return resultForRows(rowChanges, problems, cells);
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
      (direction === "undo" ? changes.toReversed() : changes).map((change) => ({
        rowKey: change.rowKey,
        column: change.column,
        value: direction === "undo" ? change.previous : change.value,
      })),
      false,
    );
  }

  function ingestionResult(
    appended: number,
    replaced: number,
    removed: number,
    problems: readonly TableIssue[],
  ): DataIngestionResult {
    return Object.freeze({
      status:
        appended + replaced + removed
          ? problems.length
            ? "partial"
            : "applied"
          : problems.length
            ? "rejected"
            : "unchanged",
      appended,
      replaced,
      removed,
      issues: Object.freeze([...problems]),
    });
  }
  const stableSource = new WeakMap<readonly TRow[], boolean>();
  function ingestionKeys(rows: readonly TRow[]): boolean {
    let valid = stableSource.get(rows);
    if (valid === undefined) {
      valid = stableRows(rows);
      stableSource.set(rows, valid);
    }
    return valid;
  }
  function isProtectedSource(key: RowKey): boolean {
    return pendingChanges.entries.has(key) || validation.hasPending(key);
  }
  function affectedBranch(model: TreeModel<TRow> | undefined, key: RowKey): RowKey[] {
    const result = [key];
    const node = model?.byKey.get(key);
    if (!node) return result;
    let parent = node.parent;
    while (parent) {
      result.push(parent.row.key);
      parent = parent.parent;
    }
    const stack = [...node.children];
    while (stack.length) {
      const child = stack.pop()!;
      result.push(child.row.key);
      for (const descendant of child.children) stack.push(descendant);
    }
    return result;
  }
  function transformScene(
    source: RowScene<TRow>,
    updates: ReadonlyMap<RowKey, TRow>,
    removed: ReadonlySet<RowKey>,
  ): RowScene<TRow> {
    const seen = new Set<RowKey>();
    const replace = (rows: readonly TRow[]): readonly TRow[] =>
      rows.flatMap((row, index) => {
        const key = readKey(row, index);
        seen.add(key);
        return removed.has(key) ? [] : [updates.get(key) ?? row];
      });
    const cache = new Map<RowKey, readonly TRow[]>();
    for (const [key, children] of source.lazy) {
      if (!removed.has(key)) cache.set(key, replace(children));
    }
    let next: readonly TRow[];
    if (!options.getChildren) next = replace(source.data);
    else {
      const model = buildTree(
        source.data,
        resolveColumns(definitions).byId,
        readKey,
        options,
        source.lazy,
      );
      const replacements = new Map<TreeNode<TRow>, TRow>();
      for (const node of model.nodes.toReversed()) {
        const key = node.row.key;
        seen.add(key);
        if (removed.has(key)) continue;
        let row = updates.get(key) ?? node.row.original;
        const supplied = updates.has(key) ? options.getChildren(row) : undefined;
        if (supplied !== undefined) cache.delete(key);
        const children =
          supplied ??
          node.children
            .filter((child) => !removed.has(child.row.key))
            .map((child) => replacements.get(child) ?? child.row.original);
        const old = options.getChildren(row) ?? node.children.map((child) => child.row.original);
        if (
          supplied === undefined &&
          ((updates.has(key) && node.children.length > 0 && !cache.has(key)) ||
            children.length !== old.length ||
            children.some((child, index) => child !== old[index]))
        ) {
          if (!options.setChildren)
            throw new Error("Updating nested source children requires setChildren.");
          row = options.setChildren(row, children);
          if (cache.has(key)) cache.set(key, children);
        }
        replacements.set(node, row);
      }
      const roots = new Map(
        model.roots.filter((node) => node.writable).map((node) => [node.sourceIndex, node]),
      );
      next = source.data.flatMap((row, index) => {
        const node = roots.get(index);
        return node && removed.has(node.row.key)
          ? []
          : [node ? (replacements.get(node) ?? row) : row];
      });
    }
    const additions = [...updates]
      .filter(([key]) => !seen.has(key) && !removed.has(key))
      .map(([, row]) => row);
    return { data: appendList(next, additions), lazy: cache };
  }
  function rebaseBatches(
    transform: (source: RowScene<TRow>) => RowScene<TRow>,
    removed: ReadonlySet<RowKey>,
  ): void {
    undoStack.transform((entry) => {
      if (entry.kind === "cells") {
        if (!removed.size) return entry;
        const changes = entry.changes.filter((change) => !removed.has(change.rowKey));
        return changes.length ? { ...entry, changes } : undefined;
      }
      const keys = entry.keys.filter((key) => !removed.has(key));
      return keys.length
        ? { ...entry, keys, before: transform(entry.before), after: transform(entry.after) }
        : undefined;
    });
  }
  function newTreeIssues(
    previous: readonly TableIssue[],
    next: readonly TableIssue[],
  ): TableIssue[] {
    const counts = new Map<string, number>();
    for (const problem of previous) {
      const key = JSON.stringify([problem.code, problem.rowKey]);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return next.filter((problem) => {
      const key = JSON.stringify([problem.code, problem.rowKey]);
      const remaining = counts.get(key) ?? 0;
      if (!remaining) return true;
      counts.set(key, remaining - 1);
      return false;
    });
  }
  function ingestData(incoming: readonly TRow[], mode: "append" | "upsert"): DataIngestionResult {
    const problems: TableIssue[] = [];
    const reject = (problem: TableIssue): DataIngestionResult => {
      ingestionIssues = [problem];
      notify();
      return ingestionResult(0, 0, 0, ingestionIssues);
    };
    if (destroyed)
      return reject(issue("invalid_ingestion", "A disposed table cannot receive source data."));
    if (!incoming.length) return ingestionResult(0, 0, 0, []);
    try {
      if (!ingestionKeys(data) || !stableRows(incoming))
        return reject(
          issue(
            "invalid_ingestion",
            "Source ingestion requires stable rowKey values or ids on every row.",
          ),
        );
    } catch (error) {
      return reject(
        issue("invalid_ingestion", error instanceof Error ? error.message : String(error)),
      );
    }
    const previous = sourceRows();
    const { byId, columns } = resolveColumns(definitions);
    const model = treeEnabled ? treeStage(data, byId, lazyVersion) : undefined;
    const seenBatch = new Set<RowKey>();
    const updates = new Map<RowKey, TRow>();
    for (const row of incoming) {
      try {
        const key = readKey(row, previous.rows.length + updates.size);
        if (typeof key !== "string" && (typeof key !== "number" || !Number.isFinite(key))) {
          problems.push(
            issue("invalid_ingestion", "An incoming row key must be a string or finite number."),
          );
          continue;
        }
        const existing = previous.byKey.get(key);
        if (seenBatch.has(key) || (mode === "append" && existing)) {
          problems.push(
            issue(
              "duplicate_row_key",
              "An incoming source row repeats an existing key and is refused.",
              { rowKey: key },
            ),
          );
          continue;
        }
        seenBatch.add(key);
        const parent = options.getParentKey?.(row);
        const affected = affectedBranch(model, key);
        if (parent !== undefined && parent !== null)
          affected.push(...affectedBranch(model, parent));
        if (affected.some(isProtectedSource)) {
          problems.push(
            issue(
              "ingestion_conflict",
              "Incoming source data would overwrite a local change or pending validation; retry after save or revert.",
              { rowKey: key },
            ),
          );
          continue;
        }
        const node = model?.byKey.get(key);
        if (
          node &&
          (!node.writable ||
            (node.lazy &&
              options.getParentKey &&
              options.getParentKey(row) !== node.parent?.row.key))
        ) {
          problems.push(
            issue(
              "invalid_ingestion",
              "This recovered or lazy tree row has no writable source position.",
              { rowKey: key },
            ),
          );
          continue;
        }
        if (existing?.original !== row) updates.set(key, row);
      } catch (error) {
        problems.push(
          issue("invalid_ingestion", error instanceof Error ? error.message : String(error)),
        );
      }
    }
    if (!updates.size) {
      ingestionIssues = problems;
      notify();
      return ingestionResult(0, 0, 0, problems);
    }
    const replaced = [...updates.keys()].filter((key) => previous.byKey.has(key)).length;
    const appended = updates.size - replaced;
    const previousState = state;
    try {
      if (!model && !replaced) {
        const added = Object.freeze([...updates.values()]);
        const indexed = added.map((row, offset) =>
          createRow(
            row,
            readKey(row, previous.rows.length + offset),
            previous.rows.length + offset,
            byId,
            options.getRowCanExpand?.(row) ?? false,
          ),
        );
        const filtered = manual
          ? previous.rows
          : filterStage(previous.rows, columns, state.search, state.filters);
        const addedFiltered = manual
          ? indexed
          : filterRows(indexed, columns, state.search, state.filters, textContext.normalize);
        const allRows = appendList(previous.rows, indexed);
        const allFiltered = appendList(filtered, addedFiltered);
        const keys = membership(filtered);
        for (const row of addedFiltered) keys.add(row.key);
        rowMembership.set(allFiltered, keys);
        const sorted =
          manual ||
          !state.sorting.some((rule) => columns.some((column) => column.id === rule.column))
            ? allFiltered
            : mergeRows(
                sortStage(filtered, columns, state.sorting),
                addedFiltered,
                columns,
                state.sorting,
              );
        const next = appendList(data, added);
        rebaseBatches((source) => ({ ...source, data: appendList(source.data, added) }), new Set());
        for (const row of indexed) previous.byKey.set(row.key, row);
        primedIndex = {
          data: next,
          columns: byId,
          result: { rows: allRows, byKey: previous.byKey, issues: previous.issues },
        };
        primedFilter = {
          rows: allRows,
          columns,
          search: state.search,
          filters: state.filters,
          result: allFiltered,
        };
        primedSort = { rows: allFiltered, columns, sorting: state.sorting, result: sorted };
        stableSource.set(next, true);
        data = next;
      } else {
        const next = transformScene(scene(), updates, new Set());
        const candidate = treeEnabled
          ? buildTree(next.data, byId, readKey, options, next.lazy)
          : indexRows(next.data, byId);
        const fresh = newTreeIssues(previous.issues, candidate.issues);
        if (fresh.length || !stableRows(candidate.rows.map((row) => row.original))) {
          problems.push(
            ...fresh,
            ...(!stableRows(candidate.rows.map((row) => row.original))
              ? [issue("invalid_ingestion", "Every incoming descendant needs a stable key.")]
              : []),
          );
          ingestionIssues = problems;
          notify();
          return ingestionResult(0, 0, 0, problems);
        }
        const nextKeys = new Set(candidate.rows.map((row) => row.key));
        const removedKeys = new Set(
          previous.rows.filter((row) => !nextKeys.has(row.key)).map((row) => row.key),
        );
        rebaseBatches((source) => transformScene(source, updates, removedKeys), removedKeys);
        data = next.data;
        lazyChildren.clear();
        for (const [key, rows] of next.lazy) lazyChildren.set(key, rows);
        lazyVersion++;
        for (const key of [...updates.keys(), ...removedKeys]) {
          pendingLoads.get(key)?.abort();
          pendingLoads.delete(key);
          childStatuses.delete(key);
          loadIssues.delete(key);
          loadValidationIssues.delete(key);
        }
        validation.cancel([...removedKeys]);
        const selection = state.selection.filter((key) => !removedKeys.has(key));
        state = mergeState(state, {
          selection: selection.length === state.selection.length ? state.selection : selection,
          expanded:
            state.expanded === true ? true : state.expanded.filter((key) => !removedKeys.has(key)),
        });
      }
      validation.cancel([...updates.keys()]);
      ingestionIssues = problems;
    } catch (error) {
      return reject(
        issue("invalid_ingestion", error instanceof Error ? error.message : String(error)),
      );
    }
    if (state !== previousState) options.onStateChange?.(state, previousState);
    options.onDataChange?.(data, []);
    notify();
    startVisibleLoads();
    return ingestionResult(appended, replaced, 0, problems);
  }
  function removeData(keys: readonly RowKey[]): DataIngestionResult {
    const previousState = state;
    const problems: TableIssue[] = [];
    const removed = new Set<RowKey>();
    const previous = sourceRows();
    const model = treeEnabled
      ? treeStage(data, resolveColumns(definitions).byId, lazyVersion)
      : undefined;
    if (destroyed || !ingestionKeys(data))
      problems.push(
        issue("invalid_ingestion", "Source removal requires a live table and stable row keys."),
      );
    else
      for (const key of new Set(keys)) {
        if (!previous.byKey.has(key)) {
          problems.push(
            issue("unknown_row", "The source row to remove does not exist.", { rowKey: key }),
          );
          continue;
        }
        if (affectedBranch(model, key).some(isProtectedSource)) {
          problems.push(
            issue(
              "ingestion_conflict",
              "Source removal would discard local changes or pending validation.",
              { rowKey: key },
            ),
          );
          continue;
        }
        const node = model?.byKey.get(key);
        if (node && !node.writable) {
          problems.push(
            issue("invalid_ingestion", "A recovered tree row has no writable source position.", {
              rowKey: key,
            }),
          );
          continue;
        }
        removed.add(key);
        const stack = node ? [...node.children] : [];
        while (stack.length) {
          const child = stack.pop()!;
          removed.add(child.row.key);
          for (const descendant of child.children) stack.push(descendant);
        }
      }
    try {
      if (removed.size) {
        const next = transformScene(scene(), new Map(), removed);
        rebaseBatches((source) => transformScene(source, new Map(), removed), removed);
        data = next.data;
        lazyChildren.clear();
        for (const [key, rows] of next.lazy) lazyChildren.set(key, rows);
        lazyVersion++;
        validation.cancel([...removed]);
        for (const key of removed) {
          pendingLoads.get(key)?.abort();
          pendingLoads.delete(key);
          childStatuses.delete(key);
          loadIssues.delete(key);
          loadValidationIssues.delete(key);
        }
        const selection = state.selection.filter((key) => !removed.has(key));
        state = mergeState(state, {
          selection: selection.length === state.selection.length ? state.selection : selection,
          expanded:
            state.expanded === true ? true : state.expanded.filter((key) => !removed.has(key)),
        });
      }
      ingestionIssues = problems;
    } catch (error) {
      ingestionIssues = [
        issue("invalid_ingestion", error instanceof Error ? error.message : String(error)),
      ];
      notify();
      return ingestionResult(0, 0, 0, ingestionIssues);
    }
    if (state !== previousState) options.onStateChange?.(state, previousState);
    if (removed.size) options.onDataChange?.(data, []);
    notify();
    startVisibleLoads();
    return ingestionResult(0, 0, removed.size, problems);
  }

  if (expandMode === "single") {
    initialState = mergeState(initialState, { expanded: canonicalExpanded(initialState.expanded) });
    state = initialState;
    snapshot = undefined;
  }

  const table: DataTable<TRow> = {
    appendData: (rows) => ingestData(rows, "append"),
    upsertData: (rows) => ingestData(rows, "upsert"),
    removeData,
    stream(source, streamOptions) {
      if (destroyed)
        return Promise.resolve(
          Object.freeze({
            status: "aborted",
            receivedRowCount: 0,
            issues: Object.freeze([
              issue("invalid_ingestion", "A disposed table cannot start a source."),
            ]),
          }),
        );
      return streaming.run(source, { expectedRowCount: sourceExpected, ...streamOptions });
    },
    insertRows,
    removeRows,
    revert,
    getPendingChanges: () => pendingChanges.snapshot(),
    markSaved(keys) {
      if (!keys) pendingChanges.entries.clear();
      else for (const key of keys) pendingChanges.entries.delete(key);
      notify();
    },
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
        snapshot = undefined;
        abortLoads();
        notify();
        startVisibleLoads();
      }
    },
    setData(next) {
      if (next === data) {
        return;
      }
      validation.cancel();
      streaming.cancel();
      loadState = "idle";
      streamIssues = [];
      ingestionIssues = [];
      expectedRowCount = sourceExpected;
      pendingChanges.entries.clear();
      abortLoads(true);
      lazyChildren.clear();
      childStatuses.clear();
      loadIssues.clear();
      loadValidationIssues.clear();
      lazyVersion++;
      data = next;
      undoStack.clear();
      notify();
      startVisibleLoads();
    },
    setColumns(next) {
      if (next === definitions) {
        return;
      }
      definitions = next;
      validation.cancel();
      notify();
    },
    setRowCount(next) {
      if (next === rowCount) {
        return;
      }
      rowCount = next;
      notify();
    },

    setTreeFilter(next) {
      const mode = next ?? "ancestors";
      if (mode === treeFilter) return;
      treeFilter = mode;
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
      applySelection([...state.selection, ...selectionKeys(keys)]);
    },
    deselect(keys) {
      const removed = new Set(selectionKeys(keys));
      applySelection(state.selection.filter((key) => !removed.has(key)));
    },
    toggleRow(key, selected) {
      const isSelected = treeEnabled
        ? getSnapshot().getRow(key)?.selection === "all"
        : state.selection.includes(key);
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
      if (open === row.isExpanded) {
        if (open && row.childStatus === "error") requestChildren(row);
        return;
      }
      if (expandMode === "single") {
        commit({ expanded: open ? [key] : [] });
      } else if (state.expanded === true) {
        const { byId } = resolveColumns(definitions);
        commit({
          expanded: (treeEnabled
            ? treeStage(data, byId, lazyVersion).rows.map((candidate) =>
                getSnapshot().getRow(candidate.key)!,
              )
            : indexRows(data, byId).rows
          )
            .filter((candidate) => candidate.canExpand && candidate.key !== key)
            .map((candidate) => candidate.key),
        });
      } else {
        commit({
          expanded: open
            ? [...state.expanded, key]
            : state.expanded.filter((candidate) => candidate !== key),
        });
      }
      if (open) requestChildren(getSnapshot().getRow(key)!);
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

    edit(edits, editOptions) {
      return validation.edit(Array.isArray(edits) ? edits : [edits as CellEdit], [], editOptions);
    },
    undo() {
      const entry = undoStack.undo();
      if (!entry) {
        return false;
      }
      validation.cancel();
      if (entry.kind === "cells") replay(entry.changes, "undo");
      else restoreScene(entry, "undo");
      return true;
    },
    redo() {
      const entry = undoStack.redo();
      if (!entry) {
        return false;
      }
      validation.cancel();
      if (entry.kind === "cells") replay(entry.changes, "redo");
      else restoreScene(entry, "redo");
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
        return validation.edit(
          [],
          [
            issue(
              "invalid_value",
              "The paste origin must use non-negative whole row and column indices.",
            ),
          ],
        );
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
      return validation.edit(rangeEdits(origin, parsed.rows), issues);
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
      return validation.edit(edits);
    },
    exportRows({
      format = "csv",
      columns: ids,
      pageOnly = false,
      headers = true,
      escapeFormulas = true,
      depth = false,
      indent = "",
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
        columns.map((column, index) => {
          const display = (index === 0 ? indent.repeat(row.depth) : "") + row.getDisplay(column.id);
          return escapeFormulas ? escapeFormula(display, row.getValue(column.id)) : display;
        }),
      );
      if (depth) matrix.forEach((line, index) => line.unshift(String(rows[index]!.depth)));
      if (headers) {
        matrix.unshift(
          columns.map((column) => (escapeFormulas ? escapeFormula(column.header) : column.header)),
        );
        if (depth) matrix[0]!.unshift("Depth");
      }
      return toDelimited(matrix, format === "csv" ? "," : "\t");
    },

    reset() {
      commit(initialState);
    },
    destroy() {
      destroyed = true;
      streaming.cancel();
      validation.cancel();
      abortLoads(true);
      listeners.clear();
    },
  };
  startVisibleLoads();
  return table;
}
