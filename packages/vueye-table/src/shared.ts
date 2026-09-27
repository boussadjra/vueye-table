import {
  inferColumns,
  type AnyColumnDef,
  type PaginationState,
  type RowKey,
  type SelectScope,
  type SortRule,
  type TableStatePatch,
} from "@vueye-table/core";
import type { Density } from "@vueye-table/styled";
import type { PropType } from "vue";

/** Props both full components share. */
export const commonProps = {
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

export const stateEmits = [
  "update:page",
  "update:pageSize",
  "update:sorting",
  "update:search",
  "update:filters",
  "update:hiddenColumns",
  "update:selected",
] as const;

interface ControlledProps {
  readonly page: number | undefined;
  readonly pageSize: number | undefined;
  readonly sorting: readonly SortRule[] | undefined;
  readonly search: string | undefined;
  readonly filters: Readonly<Record<string, unknown>> | undefined;
  readonly hiddenColumns: readonly string[] | undefined;
  readonly selected?: readonly RowKey[] | undefined;
}

/** The state a parent controls through `v-model`, as a table state patch. */
export function controlledState(props: ControlledProps, current: PaginationState): TableStatePatch {
  return {
    sorting: props.sorting,
    search: props.search,
    filters: props.filters,
    hiddenColumns: props.hiddenColumns,
    selection: props.selected,
    pagination:
      props.page !== undefined || props.pageSize !== undefined
        ? { page: props.page ?? current.page, pageSize: props.pageSize ?? current.pageSize }
        : undefined,
  };
}

export function resolveColumns(
  columns: readonly AnyColumnDef[] | undefined,
  data: readonly unknown[],
): readonly AnyColumnDef[] {
  return columns ?? inferColumns(data);
}
