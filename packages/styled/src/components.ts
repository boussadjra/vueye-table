import { columnLabel, type SortInfo, type TableColumn, type TableRow } from "@vueye-table/core";
import {
  DataGridBody,
  DataGridRoot,
  DataTableBody,
  DataTableColumnVisibility,
  DataTableHeader,
  DataTableHeaderCell,
  DataTableHeaderRow,
  DataTablePageSize,
  DataTablePagination,
  DataTableRoot,
  DataTableSearch,
  DataTableSortButton,
  DataTableStatus,
} from "@vueye-table/headless";
import { injectDataTable, type AnyDataTableBinding, type DataTableBinding } from "@vueye-table/vue";
import {
  defineComponent,
  h,
  type PropType,
  type SlotsType,
  type VNode,
  type VNodeChild,
} from "vue";

import { icon } from "./icons";
import { withClass } from "./with-class";

export type Density = "compact" | "comfortable" | "spacious";

/** Visual options shared by the styled table and grid. */
const surfaceProps = {
  density: { type: String as PropType<Density>, default: "comfortable" },
  striped: { type: Boolean, default: false },
  bordered: { type: Boolean, default: false },
  hover: { type: Boolean, default: true },
  stickyHeader: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  /** Force a theme; by default the table follows `prefers-color-scheme`. */
  theme: { type: String as PropType<"light" | "dark" | undefined>, default: undefined },
} as const;

function surfaceAttrs(props: {
  readonly density: Density;
  readonly striped: boolean;
  readonly bordered: boolean;
  readonly hover: boolean;
  readonly stickyHeader: boolean;
  readonly loading: boolean;
  readonly theme: "light" | "dark" | undefined;
}) {
  return {
    class: "vt-surface",
    "data-density": props.density,
    "data-striped": props.striped ? "" : undefined,
    "data-bordered": props.bordered ? "" : undefined,
    "data-hover": props.hover ? "" : undefined,
    "data-sticky-header": props.stickyHeader ? "" : undefined,
    "data-loading": props.loading ? "" : undefined,
    "data-vt-theme": props.theme,
    "aria-busy": props.loading ? "true" : undefined,
  };
}

/** An arrow showing a column's sort direction and, in a multi-column sort, its priority. */
export const VtSortIndicator = defineComponent({
  name: "VtSortIndicator",
  props: { sort: { type: Object as PropType<SortInfo | undefined>, default: undefined } },
  setup(props) {
    const table = injectDataTable("<VtSortIndicator>");
    return () =>
      h("span", { class: "vt-sort-indicator", "data-active": props.sort ? "" : undefined }, [
        icon(!props.sort ? "sortNone" : props.sort.direction === "asc" ? "sortAsc" : "sortDesc"),
        props.sort && table.state.sorting.length > 1
          ? h("span", { class: "vt-sort-priority" }, String(props.sort.priority + 1))
          : null,
      ]);
  },
});

/** A header row of styled header cells with sort indicators. */
export const VtHeader = defineComponent({
  name: "VtHeader",
  slots: Object as SlotsType<
    {
      [key: `header.${string}`]: (props: {
        column: TableColumn<unknown>;
        sort: SortInfo | undefined;
        toggleSort: (multi?: boolean) => void;
      }) => VNode[];
    } & {
      before?: () => VNode[];
      after?: () => VNode[];
      header?: (props: { column: TableColumn<unknown> }) => VNodeChild;
    }
  >,
  setup(_props, { slots }) {
    const table = injectDataTable("<VtHeader>");
    return () =>
      h(DataTableHeader, { class: "vt-head" }, () =>
        h(DataTableHeaderRow, () => [
          slots.before?.(),
          ...table.columns.map((column) =>
            h(
              DataTableHeaderCell,
              { key: column.id, column },
              {
                default:
                  slots[`header.${column.id}`] ??
                  (() =>
                    column.sortable
                      ? h(
                          DataTableSortButton,
                          { column, class: "vt-sort-button" },
                          {
                            default: () => [slots.header?.({ column }) ?? column.header],
                            indicator: ({ sort }: { sort: SortInfo | undefined }) => [
                              h(VtSortIndicator, { sort }),
                            ],
                          },
                        )
                      : [slots.header?.({ column }) ?? column.header]),
              },
            ),
          ),
          slots.after?.(),
        ]),
      );
  },
});

/**
 * The styled table surface: a scroll container, a loading bar, and the table. Without a default
 * slot it renders a styled header and body.
 */
export const VtTable = defineComponent({
  name: "VtTable",
  slots: Object as SlotsType<{
    default?: (props: { table: DataTableBinding<unknown> }) => VNode[];
  }>,
  props: {
    table: { type: Object as PropType<AnyDataTableBinding>, required: true },
    ...surfaceProps,
  },
  setup(props, { slots }) {
    return () =>
      h("div", surfaceAttrs(props), [
        h("div", { class: "vt-progress", role: "presentation" }),
        h("div", { class: "vt-scroll" }, [
          h(
            DataTableRoot,
            { table: props.table, class: "vt-table" },
            {
              default: () => slots.default?.({ table: props.table }) ?? [h(VtHeader), h(VtBody)],
            },
          ),
        ]),
      ]);
  },
});

/** The styled body, with the empty state in a full-width row. */
export const VtBody = defineComponent({
  name: "VtBody",
  slots: Object as SlotsType<{
    default?: (props: { rows: readonly TableRow<unknown>[] }) => VNode[];
    empty?: () => VNode[];
  }>,
  setup(_props, { slots }) {
    return () =>
      h(
        DataTableBody,
        { class: "vt-body" },
        {
          ...slots,
          empty: slots.empty ?? (() => h(VtEmpty)),
        },
      );
  },
});

/** The default empty state. */
export const VtEmpty = defineComponent({
  name: "VtEmpty",
  slots: Object as SlotsType<{ default?: () => VNode[] }>,
  props: { text: { type: String, default: "No matching rows" } },
  setup(props, { slots }) {
    return () =>
      h("div", { class: "vt-empty" }, [
        icon("empty", "vt-empty-icon"),
        slots.default?.() ?? props.text,
      ]);
  },
});

/** A search field with an icon. */
export const VtSearch = defineComponent({
  name: "VtSearch",
  inheritAttrs: false,
  setup(_props, { attrs }) {
    return () => h("label", { class: "vt-search" }, [icon("search"), h(DataTableSearch, attrs)]);
  },
});

/** "Rows per page" with a picker. */
export const VtPageSize = defineComponent({
  name: "VtPageSize",
  props: {
    options: { type: Array as PropType<readonly number[]>, default: () => [5, 10, 20, 50] },
    label: { type: String, default: "Rows per page" },
  },
  setup(props) {
    return () =>
      h("label", { class: "vt-page-size" }, [
        h("span", props.label),
        h(DataTablePageSize, { options: props.options, label: props.label }),
      ]);
  },
});

/** A menu of column checkboxes behind a "Columns" button. */
export const VtColumnVisibility = defineComponent({
  name: "VtColumnVisibility",
  props: { label: { type: String, default: "Columns" } },
  setup(props) {
    return () =>
      h("details", { class: "vt-menu" }, [
        h("summary", { class: "vt-button" }, [icon("columns"), props.label]),
        h(DataTableColumnVisibility, { as: "div", class: "vt-menu-panel" }),
      ]);
  },
});

export const VtPagination = withClass(DataTablePagination, "vt-pagination", "VtPagination");
export const VtStatus = withClass(DataTableStatus, "vt-status", "VtStatus");

/** A horizontal bar for controls above or below a table. */
export const VtToolbar = defineComponent({
  name: "VtToolbar",
  slots: Object as SlotsType<{ default?: () => VNode[] }>,
  setup(_props, { slots }) {
    return () => h("div", { class: "vt-theme vt-toolbar", role: "toolbar" }, slots.default?.());
  },
});

const GridBody = defineComponent({
  name: "VtGridBody",
  props: { rowNumbers: { type: Boolean, default: true } },
  setup(props) {
    const table = injectDataTable("<VtGrid>");
    return () =>
      h(
        DataGridBody,
        { class: "vt-body" },
        {
          rowHeader: ({ row }: { row: TableRow<unknown> }) =>
            props.rowNumbers
              ? h(
                  "th",
                  { class: "vt-row-number", scope: "row" },
                  String(table.pageStart + table.rows.indexOf(row)),
                )
              : null,
        },
      );
  },
});

/** The styled spreadsheet grid, with optional row numbers and A, B, C column letters. */
export const VtGrid = defineComponent({
  name: "VtGrid",
  slots: Object as SlotsType<{ default?: (props: Record<string, unknown>) => VNode[] }>,
  props: {
    table: { type: Object as PropType<AnyDataTableBinding>, required: true },
    label: { type: String as PropType<string | undefined>, default: undefined },
    rowNumbers: { type: Boolean, default: true },
    columnLetters: { type: Boolean, default: false },
    ...surfaceProps,
  },
  setup(props, { slots }) {
    const header = () =>
      h(VtHeader, null, {
        before: () =>
          props.rowNumbers ? h("th", { class: "vt-row-number", "aria-hidden": "true" }) : null,
        header: ({ column }: { column: TableColumn<unknown> }) =>
          props.columnLetters
            ? [
                h(
                  "span",
                  { class: "vt-column-letter" },
                  columnLabel(props.table.columns.indexOf(column)),
                ),
                column.header,
              ]
            : column.header,
      });
    return () =>
      h("div", surfaceAttrs(props), [
        h("div", { class: "vt-progress", role: "presentation" }),
        h("div", { class: "vt-scroll" }, [
          h(
            DataGridRoot,
            { table: props.table, label: props.label, class: "vt-table vt-grid" },
            {
              default: (slotProps: Record<string, unknown>) =>
                slots.default?.(slotProps) ?? [
                  header(),
                  h(GridBody, { rowNumbers: props.rowNumbers }),
                ],
            },
          ),
        ]),
      ]);
  },
});
