import {
  inferColumns,
  type AnyColumnDef,
  type PaginationState,
  type RowKey,
  type SelectScope,
  type SortRule,
  type TableState,
  type TableStatePatch,
  type ExpandedState,
  type ExpandMode,
  type TreeOptions,
  type TableRow,
  type TableColumn,
  type TableOptions,
  type EditResult,
  type TableIssue,
  type CellChange,
} from "@vueye-table/core";
import { virtualProps } from "@vueye-table/headless";
import { hierarchyProps } from "@vueye-table/headless";
import type { Density } from "@vueye-table/styled";
import type { TableSource, LoadMore } from "@vueye-table/vue";
import { defineComponent, type PropType, type VNodeChild } from "vue";

interface ContentProps {
  readonly item: unknown;
  readonly row: TableRow<unknown>;
  readonly column: TableColumn<unknown>;
  readonly value: unknown;
  readonly display: string;
  readonly editable: boolean;
}
/** Isolate application cell slots from unrelated table/grid navigation updates. */
export const CellContent = defineComponent({
  name: "VueyeCellContent",
  props: {
    row: { type: Object as PropType<TableRow<unknown>>, required: true },
    column: { type: Object as PropType<TableColumn<unknown>>, required: true },
    value: { type: null as unknown as PropType<unknown>, required: true },
    display: { type: String, required: true },
    editable: { type: Boolean, default: false },
    render: { type: Function as PropType<(props: ContentProps) => VNodeChild>, required: true },
  },
  setup(props) {
    return () =>
      props.render({
        item: props.row.original,
        row: props.row,
        column: props.column,
        value: props.value,
        display: props.display,
        editable: props.editable,
      });
  },
});

/** Props both full components share. */
export const commonProps = {
  validateRow: { type: Function as PropType<TableOptions<any>["validateRow"]>, default: undefined },
  asyncValidation: {
    type: String as PropType<"held" | "optimistic" | undefined>,
    default: undefined,
  },
  createRow: { type: Function as PropType<(() => any) | undefined>, default: undefined },
  setParentKey: {
    type: Function as PropType<TableOptions<any>["setParentKey"]>,
    default: undefined,
  },
  addRow: { type: Boolean, default: false },
  removeRows: { type: Boolean, default: false },
  ...virtualProps,
  ...hierarchyProps,
  rowCanExpand: {
    type: Function as PropType<((row: any) => boolean) | undefined>,
    default: undefined,
  },
  expandMode: { type: String as PropType<ExpandMode>, default: "multiple" },
  expanded: { type: [Boolean, Array] as PropType<ExpandedState | undefined>, default: undefined },
  getChildren: { type: Function as PropType<TreeOptions<any>["getChildren"]>, default: undefined },
  setChildren: { type: Function as PropType<TreeOptions<any>["setChildren"]>, default: undefined },
  getParentKey: {
    type: Function as PropType<TreeOptions<any>["getParentKey"]>,
    default: undefined,
  },
  hasChildren: { type: Function as PropType<TreeOptions<any>["hasChildren"]>, default: undefined },
  loadChildren: {
    type: Function as PropType<TreeOptions<any, AbortSignal>["loadChildren"]>,
    default: undefined,
  },
  treeFilter: { type: String as PropType<TreeOptions<unknown>["treeFilter"]>, default: undefined },
  paginateBy: { type: String as PropType<TreeOptions<unknown>["paginateBy"]>, default: undefined },
  source: {
    type: [Object, Function] as PropType<TableSource<unknown> | undefined>,
    default: undefined,
  },
  loadMore: { type: Function as PropType<LoadMore<unknown> | undefined>, default: undefined },
  endThreshold: { type: Number, default: 5 },
  manual: { type: Boolean as PropType<boolean | undefined>, default: undefined },
  rowCount: { type: Number as PropType<number | undefined>, default: undefined },
  /** Override the virtual default of no pagination; permits virtualizing a large page. */
  paginate: { type: Boolean as PropType<boolean | undefined>, default: undefined },
  /** Column definitions. Without them, columns are inferred from the data. */
  columns: { type: Array as PropType<readonly AnyColumnDef[]>, default: undefined },
  /** A path into each row, or a function, giving its key. Defaults to `id`, then position. */
  rowKey: {
    type: [String, Function] as PropType<string | ((row: any, index: number) => RowKey)>,
    default: undefined,
  },
  caption: { type: String, default: undefined },
  loading: { type: Boolean, default: false },
  density: { type: String as PropType<Density>, default: "comfortable" },
  striped: { type: Boolean, default: false },
  bordered: { type: Boolean, default: false },
  hover: { type: Boolean, default: true },
  stickyHeader: { type: Boolean, default: false },
  theme: { type: String as PropType<"light" | "dark">, default: undefined },
  /** A CSS height that makes the body scroll, such as `"24rem"`. */
  maxHeight: { type: String, default: undefined },

  searchable: { type: Boolean, default: true },
  searchPlaceholder: { type: String, default: "Search…" },
  columnToggle: { type: Boolean, default: true },
  pagination: { type: Boolean, default: true },
  pageSizeOptions: { type: Array as PropType<readonly number[]>, default: () => [5, 10, 20, 50] },

  page: { type: Number, default: undefined },
  pageSize: { type: Number, default: undefined },
  sorting: { type: Array as PropType<readonly SortRule[]>, default: undefined },
  search: { type: String, default: undefined },
  filters: { type: Object as PropType<Readonly<Record<string, unknown>>>, default: undefined },
  hiddenColumns: { type: Array as PropType<readonly string[]>, default: undefined },
  selectScope: { type: String as PropType<SelectScope>, default: "all" },
} as const;

export const editingEmits = {
  "update:data": (_data: readonly unknown[]) => true,
  edit: (_changes: readonly CellChange<unknown>[]) => true,
  save: (_result: EditResult<unknown>) => true,
  cancel: (_key: RowKey) => true,
  "edit-issues": (_issues: readonly TableIssue[]) => true,
  "edit-error": (_issues: readonly TableIssue[]) => true,
};

export function editingOptions(
  props: Pick<
    TableOptions<unknown>,
    "validateRow" | "asyncValidation" | "createRow" | "setParentKey"
  >,
): Pick<TableOptions<unknown>, "validateRow" | "asyncValidation" | "createRow" | "setParentKey"> {
  return {
    validateRow: props.validateRow,
    asyncValidation: props.asyncValidation,
    createRow: props.createRow,
    setParentKey: props.setParentKey,
  };
}

export const stateEmits = [
  "update:page",
  "update:pageSize",
  "update:sorting",
  "update:search",
  "update:filters",
  "update:hiddenColumns",
  "update:selected",
  "update:expanded",
] as const;

interface ControlledProps {
  readonly page: number | undefined;
  readonly pageSize: number | undefined;
  readonly sorting: readonly SortRule[] | undefined;
  readonly search: string | undefined;
  readonly filters: Readonly<Record<string, unknown>> | undefined;
  readonly hiddenColumns: readonly string[] | undefined;
  readonly selected?: readonly RowKey[] | undefined;
  readonly expanded?: ExpandedState | undefined;
}

/** The state a parent controls through `v-model`, as a table state patch. */
export function controlledState(props: ControlledProps, current: PaginationState): TableStatePatch {
  return {
    sorting: props.sorting,
    search: props.search,
    filters: props.filters,
    hiddenColumns: props.hiddenColumns,
    selection: props.selected,
    expanded: props.expanded,
    pagination:
      props.page !== undefined || props.pageSize !== undefined
        ? { page: props.page ?? current.page, pageSize: props.pageSize ?? current.pageSize }
        : undefined,
  };
}

/**
 * Emit a `v-model` update for each piece of state that changed. The state is frozen and replaced
 * piece by piece, so identity tells what changed.
 */
export function emitStateChanges(
  emit: (event: (typeof stateEmits)[number], value: unknown) => void,
  state: TableState,
  previous: TableState,
): void {
  if (state.pagination.page !== previous.pagination.page) {
    emit("update:page", state.pagination.page);
  }
  if (state.pagination.pageSize !== previous.pagination.pageSize) {
    emit("update:pageSize", state.pagination.pageSize);
  }
  if (state.sorting !== previous.sorting) {
    emit("update:sorting", state.sorting);
  }
  if (state.search !== previous.search) {
    emit("update:search", state.search);
  }
  if (state.filters !== previous.filters) {
    emit("update:filters", state.filters);
  }
  if (state.hiddenColumns !== previous.hiddenColumns) {
    emit("update:hiddenColumns", state.hiddenColumns);
  }
  if (state.selection !== previous.selection) {
    emit("update:selected", state.selection);
  }
  if (state.expanded !== previous.expanded) emit("update:expanded", state.expanded);
}

export function expansionOptions(
  props: {
    readonly rowCanExpand: ((row: any) => boolean) | undefined;
    readonly expandMode: ExpandMode;
  } & TreeOptions<unknown, AbortSignal>,
  detail: boolean,
): TreeOptions<unknown, AbortSignal> & {
  readonly getRowCanExpand: ((row: unknown) => boolean) | undefined;
  readonly expandMode: ExpandMode;
} {
  return {
    getRowCanExpand: props.rowCanExpand ?? (detail ? () => true : undefined),
    expandMode: props.expandMode,
    getChildren: props.getChildren,
    setChildren: props.setChildren,
    getParentKey: props.getParentKey,
    hasChildren: props.hasChildren,
    loadChildren: props.loadChildren,
    treeFilter: props.treeFilter,
    paginateBy: props.paginateBy,
  };
}

export function emitExpansionChanges(
  emit: {
    (event: "expand", item: unknown, row: TableRow<unknown>): void;
    (event: "collapse", item: unknown, row: TableRow<unknown>): void;
  },
  state: TableState,
  previous: TableState,
  table:
    | {
        readonly processedRows: readonly TableRow<unknown>[];
        getRow(key: RowKey): TableRow<unknown> | undefined;
      }
    | undefined,
): void {
  if (!table || state.expanded === previous.expanded) return;
  const keys = new Set([
    ...table.processedRows.map((row) => row.key),
    ...(state.expanded === true ? [] : state.expanded),
    ...(previous.expanded === true ? [] : previous.expanded),
  ]);
  for (const key of keys) {
    const before = previous.expanded === true || previous.expanded.includes(key);
    const after = state.expanded === true || state.expanded.includes(key);
    const row = table.getRow(key);
    if (row?.canExpand && before !== after) {
      if (after) emit("expand", row.original, row);
      else emit("collapse", row.original, row);
    }
  }
}

/**
 * The given columns, or columns inferred from the data. Inferred columns are reused while the
 * data keeps the same fields, so an edit that replaces the array does not rebuild every row.
 */
export function createColumnResolver(): (
  columns: readonly AnyColumnDef[] | undefined,
  data: readonly unknown[],
) => readonly AnyColumnDef[] {
  let inferred:
    | { readonly signature: string; readonly columns: readonly AnyColumnDef[] }
    | undefined;
  return (columns, data) => {
    if (columns) {
      return columns;
    }
    const next = inferColumns(data);
    const signature = next.map((column) => column.id).join("\u0000");
    if (inferred?.signature !== signature) {
      inferred = { signature, columns: next };
    }
    return inferred.columns;
  };
}
