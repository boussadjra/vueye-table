import {
  createTable,
  type ColumnDef,
  type DataTable,
  type TableOptions,
  type TableSnapshot,
  type TableStatePatch,
  type TreeLoadSignal,
} from "@vueye-table/core";
import {
  getCurrentScope,
  onScopeDispose,
  shallowRef,
  toRaw,
  toValue,
  watch,
  type MaybeRefOrGetter,
} from "vue";

/** Options accepted by {@link useDataTable}. Data, columns, and state may be refs or getters. */
export interface UseDataTableOptions<
  TRow,
  TSignal extends TreeLoadSignal = TreeLoadSignal,
> extends Omit<TableOptions<TRow, TSignal>, "data" | "columns" | "rowCount"> {
  readonly data: MaybeRefOrGetter<readonly TRow[]>;
  readonly columns: MaybeRefOrGetter<readonly ColumnDef<TRow>[]>;
  readonly rowCount?: MaybeRefOrGetter<number | undefined> | undefined;
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
  TableOperations<TRow> & {
    /** The engine behind the binding. */
    readonly table: DataTable<TRow>;
    /** The current snapshot, replaced on every change. */
    readonly snapshot: TableSnapshot<TRow>;
  };

/**
 * A binding for any row type, for components that accept every table. Row types make the binding
 * invariant, so `DataTableBinding<unknown>` would refuse `DataTableBinding<Person>`.
 */
export type AnyDataTableBinding = DataTableBinding<any>;

const OPERATIONS = [
  "insertRows",
  "removeRows",
  "getPendingChanges",
  "markSaved",
  "revert",
  "setState",
  "setData",
  "setColumns",
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
export function useDataTable<TRow, TSignal extends TreeLoadSignal = TreeLoadSignal>(
  options: UseDataTableOptions<TRow, TSignal>,
): DataTableBinding<TRow> {
  const table = createTable<TRow, TSignal>({
    ...options,
    data: toRaw(toValue(options.data)),
    columns: toValue(options.columns),
    rowCount: toValue(options.rowCount),
    initialState: { ...options.initialState, ...definedEntries(toValue(options.state)) },
  });
  const snapshot = shallowRef(table.getSnapshot());
  const unsubscribe = table.subscribe((next) => {
    snapshot.value = next;
  });

  const stops = [
    watch(
      () => toValue(options.data),
      // Reactive arrays arrive as proxies; the engine works on, and compares, the raw array.
      (data) => table.setData(toRaw(data)),
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

  if (getCurrentScope()) {
    onScopeDispose(() => {
      for (const stop of stops) {
        stop();
      }
      unsubscribe();
      table.destroy();
    });
  }

  const binding = { table } as Record<string, unknown>;
  Object.defineProperty(binding, "snapshot", { enumerable: true, get: () => snapshot.value });
  for (const key of Object.keys(snapshot.value)) {
    Object.defineProperty(binding, key, {
      enumerable: true,
      get: () => snapshot.value[key as keyof TableSnapshot<TRow>],
    });
  }
  for (const name of OPERATIONS) {
    binding[name] = table[name];
  }
  return Object.freeze(binding) as unknown as DataTableBinding<TRow>;
}
