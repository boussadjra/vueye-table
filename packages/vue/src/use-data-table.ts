import {
  createTable,
  type ColumnDef,
  type DataTable,
  type TableOptions,
  type TableSnapshot,
  type TableStatePatch,
  type TreeLoadSignal,
  type TreeLoadController,
  type ExpandedState,
  type PendingChanges,
  type RowKey,
  type TreeFilter,
} from "@vueye-table/core";
import {
  getCurrentScope,
  onScopeDispose,
  shallowRef,
  toRaw,
  toValue,
  unref,
  watch,
  type MaybeRefOrGetter,
} from "vue";

import { createRowDraft, type RowDraft } from "./row-draft";
import { createSource, type SourceOptions, type SourceBinding } from "./source";

/** Options accepted by {@link useDataTable}. Data, columns, and state may be refs or getters. */
export interface UseDataTableOptions<TRow, TSignal extends TreeLoadSignal = AbortSignal>
  extends
    Omit<TableOptions<TRow, TSignal>, "data" | "columns" | "rowCount" | "treeFilter">,
    SourceOptions<TRow> {
  /** Initial rows for a source, or the caller-owned array for an ordinary table. */
  readonly data?: MaybeRefOrGetter<readonly TRow[]> | undefined;
  readonly columns: MaybeRefOrGetter<readonly ColumnDef<TRow>[]>;
  readonly rowCount?: MaybeRefOrGetter<number | undefined> | undefined;
  /** Search context can change without discarding lazy branches, edits or selection. */
  readonly treeFilter?: MaybeRefOrGetter<TreeFilter | undefined> | undefined;
  /**
   * State owned by the caller, for example `v-model` props or URL query values. Whenever it
   * changes it is applied with `setState`; the table's own changes still reach `onStateChange`.
   */
  readonly state?: MaybeRefOrGetter<TableStatePatch | undefined> | undefined;
}

type TableOperations<TRow> = Omit<DataTable<TRow>, "getSnapshot" | "getState" | "subscribe">;

/**
 * A reactive view of a table: every snapshot field is a plain reactive property, so templates read
 * `table.rows` and `table.pageCount` directly, and every change goes through a named operation.
 * Watching a field needs a getter: `watch(() => table.page, ...)`.
 */
export type DataTableBinding<TRow> = TableSnapshot<TRow> &
  SourceBinding &
  TableOperations<TRow> & {
    /** The engine behind the binding. */
    readonly table: DataTable<TRow>;
    /** The current snapshot, replaced on every change. */
    readonly snapshot: TableSnapshot<TRow>;
    readonly expanded: ExpandedState;
    readonly pendingChanges: PendingChanges<TRow>;
    editRow(key: RowKey): RowDraft<TRow>;
  };

/**
 * A binding for any row type, for components that accept every table. Row types make the binding
 * invariant, so `DataTableBinding<unknown>` would refuse `DataTableBinding<Person>`.
 */
export type AnyDataTableBinding = DataTableBinding<any>;

const OPERATIONS = [
  "appendData",
  "upsertData",
  "removeData",
  "stream",
  "insertRows",
  "removeRows",
  "getPendingChanges",
  "markSaved",
  "revert",
  "setState",
  "setData",
  "setColumns",
  "setTreeFilter",
  "setRowCount",
  "toggleSort",
  "sort",
  "clearSorting",
  "search",
  "filter",
  "clearFilters",
  "goToPage",
  "nextPage",
  "previousPage",
  "setPageSize",
  "select",
  "deselect",
  "toggleRow",
  "toggleAll",
  "clearSelection",
  "getSelectedRows",
  "toggleExpanded",
  "expandAll",
  "collapseAll",
  "toggleColumn",
  "moveColumn",
  "edit",
  "undo",
  "redo",
  "copy",
  "paste",
  "clear",
  "exportRows",
  "reset",
  "destroy",
] as const satisfies readonly (keyof TableOperations<unknown>)[];

function definedEntries(patch: TableStatePatch | undefined): TableStatePatch {
  return Object.fromEntries(Object.entries(patch ?? {}).filter(([, value]) => value !== undefined));
}

/**
 * Create a table bound to the current effect scope. The table follows its reactive data,
 * columns, row count, and state, and stops listening when the scope ends.
 */
export function useDataTable<TRow>(options: UseDataTableOptions<TRow>): DataTableBinding<TRow>;
export function useDataTable<TRow, TSignal extends TreeLoadSignal = AbortSignal>(
  options: UseDataTableOptions<TRow, TSignal> &
    (AbortSignal extends TSignal
      ? unknown
      : { readonly createChildLoadController: () => TreeLoadController<TSignal> }),
): DataTableBinding<TRow>;
export function useDataTable<TRow, TSignal extends TreeLoadSignal = AbortSignal>(
  options: UseDataTableOptions<TRow, TSignal>,
): DataTableBinding<TRow> {
  const empty: readonly TRow[] = Object.freeze([]);
  const seed = (): readonly TRow[] => toRaw(toValue(options.data) ?? empty);
  const table = createTable<TRow, TSignal>({
    ...options,
    manual: options.manual ?? !!unref(options.loadMore),
    data: seed(),
    columns: toValue(options.columns),
    rowCount: toValue(options.rowCount),
    treeFilter: toValue(options.treeFilter),
    initialState: { ...options.initialState, ...definedEntries(toValue(options.state)) },
    // Public overloads require custom signals to provide their matching factory.
    createChildLoadController:
      options.createChildLoadController ??
      ((() => new AbortController()) as unknown as () => TreeLoadController<TSignal>),
  });
  const drafts = new Set<() => void>();
  let disposed = false;
  const snapshot = shallowRef(table.getSnapshot());
  const source = createSource(table, options, seed, (next) => {
    snapshot.value = next;
  });
  snapshot.value = source.initial();
  const unsubscribe = table.subscribe(source.update);

  const stops = [
    watch(
      () => toValue(options.treeFilter),
      (mode) => table.setTreeFilter(mode),
    ),
    watch(
      () => toValue(options.data),
      // Reactive arrays arrive as proxies; the engine works on, and compares, the raw array.
      (data) => table.setData(toRaw(data ?? empty)),
    ),
    watch(
      () => toValue(options.columns),
      (columns) => table.setColumns(columns),
    ),
    watch(
      () => toValue(options.rowCount),
      (rowCount) => {
        if (rowCount !== undefined) {
          table.setRowCount(rowCount);
        }
      },
    ),
    watch(
      () => toValue(options.state),
      (state) => {
        if (state) {
          table.setState(state);
        }
      },
      { deep: true },
    ),
  ];

  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    source.dispose();
    for (const disposeDraft of drafts) disposeDraft();
    drafts.clear();
    for (const stop of stops) {
      stop();
    }
    unsubscribe();
    table.destroy();
  };
  if (getCurrentScope()) onScopeDispose(dispose);

  const binding = { table } as Record<string, unknown>;
  for (const key of ["endThreshold", "loadingMode", "canLoadMore", "loadError"] as const) {
    Object.defineProperty(binding, key, {
      enumerable: true,
      get: () => {
        void snapshot.value;
        return source[key];
      },
    });
  }
  binding["retry"] = source.retry;
  binding["loadNext"] = source.loadNext;
  Object.defineProperty(binding, "snapshot", { enumerable: true, get: () => snapshot.value });
  Object.defineProperty(binding, "expanded", {
    enumerable: true,
    get: () => snapshot.value.state.expanded,
  });
  Object.defineProperty(binding, "pendingChanges", {
    enumerable: true,
    get: () => {
      void snapshot.value;
      return table.getPendingChanges();
    },
  });
  binding["editRow"] = (key: RowKey): RowDraft<TRow> =>
    createRowDraft(table, key, (disposeDraft) => {
      if (disposed) disposeDraft();
      else drafts.add(disposeDraft);
      return () => {
        drafts.delete(disposeDraft);
      };
    });
  for (const key of Object.keys(snapshot.value)) {
    Object.defineProperty(binding, key, {
      enumerable: true,
      get: () => snapshot.value[key as keyof TableSnapshot<TRow>],
    });
  }
  for (const name of OPERATIONS) {
    binding[name] = table[name];
  }
  binding["destroy"] = dispose;
  return Object.freeze(binding) as unknown as DataTableBinding<TRow>;
}
