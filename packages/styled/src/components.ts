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
  DataTableLoadMore,
  DataTableViewport,
  DataTableVirtualColumns,
  injectVirtualRenderer,
  virtualProps,
  type GridCellSlotProps,
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
  ...virtualProps,
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
  readonly virtual: boolean | object;
}) {
  return {
    class: "vt-surface",
    "data-density": props.density,
    "data-striped": props.striped ? "" : undefined,
    "data-bordered": props.bordered ? "" : undefined,
    "data-hover": props.hover ? "" : undefined,
    "data-sticky-header": props.stickyHeader || props.virtual ? "" : undefined,
    "data-virtual": props.virtual ? "" : undefined,
    "data-loading": props.loading ? "" : undefined,
    "data-vt-theme": props.theme,
    "aria-busy": props.loading ? "true" : undefined,
  };
}

function scroller(
  props: {
    readonly virtual: boolean | object;
    readonly height: string | undefined;
    readonly rowHeight: number;
  },
  children: VNode[],
): VNode {
  return props.virtual
    ? h(
        DataTableViewport,
        {
          class: "vt-scroll",
          height: props.height ?? "24rem",
          style: { "--vt-row-height": `${props.rowHeight}px` },
        },
        { default: () => children },
      )
    : h("div", { class: "vt-scroll" }, children);
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
    const virtual = injectVirtualRenderer();
    const headerCell = (column: TableColumn<unknown>) =>
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
      );
    return () =>
      h(DataTableHeader, { class: "vt-head" }, () =>
        h(DataTableHeaderRow, () => [
          slots.before?.(),
          ...(virtual?.columns
            ? [
                h(DataTableVirtualColumns, null, {
                  default: ({ column }: { column: TableColumn<unknown> }) => [headerCell(column)],
                }),
              ]
            : table.columns.map(headerCell)),
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
      h(
        "div",
        surfaceAttrs({
          ...props,
          loading:
            props.loading ||
            props.table.loadState === "loading" ||
            props.table.loadState === "streaming",
        }),
        [
          h("div", { class: "vt-progress", role: "presentation" }),
          scroller(props, [
            h(
              DataTableRoot,
              {
                table: props.table,
                class: "vt-table",
                virtual: props.virtual,
                rowHeight: props.rowHeight,
                overscan: props.overscan,
              },
              {
                default: () => slots.default?.({ table: props.table }) ?? [h(VtHeader), h(VtBody)],
              },
            ),
          ]),
        ],
      );
  },
});

/** The styled body, with the empty state in a full-width row. */
export const VtBody = defineComponent({
  name: "VtBody",
  slots: Object as SlotsType<{
    default?: (props: { rows: readonly TableRow<unknown>[] }) => VNode[];
    empty?: () => VNode[];
  }>,
  props: { ...virtualProps },
  setup(props, { slots }) {
    const table = injectDataTable("<VtBody>");
    return () =>
      h(
        DataTableBody,
        { class: "vt-body", ...props },
        {
          ...slots,
          empty:
            slots.empty ??
            (() =>
              h(VtEmpty, {
                text:
                  table.loadingMode && table.loadState === "loading"
                    ? "Loading rows…"
                    : table.loadingMode && table.loadState === "error"
                      ? "Could not load rows."
                      : "No matching rows",
              })),
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

/**
 * A menu of column checkboxes behind a "Columns" button. Escape closes it and returns focus to
 * the button, and so does moving focus out of it.
 */
export const VtColumnVisibility = defineComponent({
  name: "VtColumnVisibility",
  props: { label: { type: String, default: "Columns" } },
  setup(props) {
    const close = (menu: HTMLDetailsElement, refocus: boolean): void => {
      if (!menu.open) {
        return;
      }
      menu.open = false;
      if (refocus) {
        menu.querySelector("summary")?.focus();
      }
    };
    return () =>
      h(
        "details",
        {
          class: "vt-menu",
          onKeydown: (event: KeyboardEvent) => {
            if (event.key === "Escape") {
              event.preventDefault();
              close(event.currentTarget as HTMLDetailsElement, true);
            }
          },
          onFocusout: (event: FocusEvent) => {
            const menu = event.currentTarget as HTMLDetailsElement;
            const next = event.relatedTarget as Node | null;
            // Some browsers move no focus when a checkbox label is clicked; only a known
            // destination outside the menu closes it.
            if (next !== null && !menu.contains(next)) {
              close(menu, false);
            }
          },
        },
        [
          h("summary", { class: "vt-button" }, [icon("columns"), props.label]),
          h(DataTableColumnVisibility, { as: "div", class: "vt-menu-panel" }),
        ],
      );
  },
});

export const VtPagination = withClass(DataTablePagination, "vt-pagination", "VtPagination");
export const VtStatus = withClass(DataTableStatus, "vt-status", "VtStatus");
export const VtLoadMore = withClass(DataTableLoadMore, "vt-button", "VtLoadMore");

/** A horizontal bar for controls above or below a table. */
export const VtToolbar = defineComponent({
  name: "VtToolbar",
  slots: Object as SlotsType<{ default?: () => VNode[] }>,
  setup(_props, { slots }) {
    return () => h("div", { class: "vt-theme vt-toolbar", role: "toolbar" }, slots.default?.());
  },
});

type CellSlot = (props: GridCellSlotProps) => VNodeChild;

const GridBody = defineComponent({
  name: "VtGridBody",
  props: {
    rowNumbers: { type: Boolean, default: true },
    /** Content slots per column id, as `cell.<id>` on `<VtGrid>`. */
    cells: {
      type: Object as PropType<Readonly<Record<string, CellSlot | undefined>>>,
      default: () => ({}),
    },
  },
  setup(props) {
    const table = injectDataTable("<VtGrid>");
    return () => {
      const cellSlots = props.cells;
      const hasCellSlots = Object.keys(cellSlots).length > 0;
      return h(
        DataGridBody,
        { class: "vt-body" },
        {
          rowHeader: ({ index }: { index: number }) =>
            props.rowNumbers
              ? h("th", { class: "vt-row-number", scope: "row" }, String(table.pageStart + index))
              : null,
          ...(hasCellSlots
            ? {
                cell: (cellProps: GridCellSlotProps) => {
                  const slot = cellSlots[cellProps.column.id];
                  return slot ? slot(cellProps) : cellProps.display;
                },
              }
            : {}),
        },
      );
    };
  },
});

/**
 * The styled spreadsheet grid, with optional row numbers and A, B, C column letters. A
 * `cell.<column id>` slot draws that column's cells while they are not being edited.
 */
export const VtGrid = defineComponent({
  name: "VtGrid",
  slots: Object as SlotsType<
    { [key: `cell.${string}`]: GridCellSlotProps } & {
      default?: (props: Record<string, unknown>) => VNode[];
    }
  >,
  props: {
    table: { type: Object as PropType<AnyDataTableBinding>, required: true },
    label: { type: String as PropType<string | undefined>, default: undefined },
    rowNumbers: { type: Boolean, default: true },
    columnLetters: { type: Boolean, default: false },
    ...surfaceProps,
  },
  setup(props, { slots, attrs }) {
    const cellSlots = (): Record<string, CellSlot> => {
      const found: Record<string, CellSlot> = {};
      for (const [name, slot] of Object.entries(slots)) {
        if (name.startsWith("cell.") && slot) {
          found[name.slice("cell.".length)] = slot as CellSlot;
        }
      }
      return found;
    };
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
      h(
        "div",
        surfaceAttrs({
          ...props,
          loading:
            props.loading ||
            props.table.loadState === "loading" ||
            props.table.loadState === "streaming",
        }),
        [
          h("div", { class: "vt-progress", role: "presentation" }),
          scroller(props, [
            h(
              DataGridRoot,
              {
                table: props.table,
                label: props.label,
                "aria-describedby": attrs["aria-describedby"],
                class: "vt-table vt-grid",
                virtual: props.virtual,
                virtualColumns: props.virtualColumns,
                rowHeight: props.rowHeight,
                overscan: props.overscan,
                columnWidth: props.columnWidth,
                gutter: props.rowNumbers ? 48 : 0,
              },
              {
                default: (slotProps: Record<string, unknown>) =>
                  slots.default?.(slotProps) ?? [
                    header(),
                    h(GridBody, { rowNumbers: props.rowNumbers, cells: cellSlots() }),
                  ],
              },
            ),
          ]),
        ],
      );
  },
});
