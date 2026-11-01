import { getRowItemKey, type SortInfo, type TableColumn, type TableRow } from "@vueye-table/core";
import {
  injectDataTable,
  provideDataTable,
  useTableLocale,
  useDataGrid,
  type AnyDataTableBinding,
  type DataTableBinding,
} from "@vueye-table/vue";
import {
  defineComponent,
  Fragment,
  h,
  mergeProps,
  isVNode,
  cloneVNode,
  shallowRef,
  type PropType,
  type ShallowRef,
  type SlotsType,
  type VNode,
  type ComponentPublicInstance,
  type VNodeChild,
} from "vue";

import {
  provideColumnLayout,
  injectColumnLayout,
  provideHeaderColumn,
  resizingProps,
  DataTableColumnResizer,
} from "./column-layout";
import { injectEditingGrid } from "./editing";
import { groupRow, type GroupSlots } from "./grouped-rows";
import {
  createDetails,
  DataTableTreeCell,
  hierarchyProps,
  hierarchyRowAttrs,
  injectHierarchy,
  provideHierarchy,
  resolveTreeColumn,
  treeKeydown,
  type DetailSlotProps,
} from "./hierarchy";
import { loadSentinel } from "./loading";
import {
  provideRowLayout,
  injectRowLayout,
  injectPinnedRow,
  groupingProps,
  DataTablePinnedRow,
} from "./row-layout";
import {
  asProp,
  columnProp,
  flag,
  rowProp,
  columnLayoutProps,
  provideColumnOffset,
  injectColumnOffset,
} from "./shared";
import {
  createComponentVirtual,
  injectVirtual,
  renderColumns,
  renderRows,
  rowSpacer,
  virtualProps,
  virtualOptions,
  virtualRow,
  virtualColgroup,
  physicalColumnCount,
  VirtualContent,
  type ComponentVirtualBinding,
} from "./virtual";

/**
 * Provides a table to the components inside it and renders the table element. Without a default
 * slot it renders a complete header and body.
 */
export const DataTableRoot = defineComponent({
  name: "DataTableRoot",
  slots: Object as SlotsType<{
    default?: (props: { table: DataTableBinding<unknown> }) => VNode[];
  }>,
  props: {
    table: { type: Object as PropType<AnyDataTableBinding>, required: true },
    as: asProp("table"),
    ...virtualProps,
    ...hierarchyProps,
    ...columnLayoutProps,
    ...resizingProps,
    ...groupingProps,
  },
  setup(props, { slots }) {
    provideDataTable(props.table);
    provideColumnOffset(() => props.leadingColumns);
    const hierarchy = provideHierarchy(props.table, props);
    const element = shallowRef<HTMLElement>();
    const layout = provideColumnLayout(props.table, props, () => element.value);
    const rowLayout = provideRowLayout(props.table, props, () => element.value);
    const editingGrid = injectEditingGrid();
    const virtualGrid = props.virtualColumns
      ? (editingGrid ?? useDataGrid(props.table))
      : editingGrid;
    const render = (virtual?: ComponentVirtualBinding) =>
      h(
        props.as,
        {
          ref: element,
          style: layout.style(
            virtual?.columns ? virtual.columns.totalSize + virtual.gutter : undefined,
          ),
          "data-column-layout": flag(layout.enabled()),
          role: props.table.tree || props.table.grouped ? "treegrid" : undefined,
          "aria-rowcount":
            rowLayout.count ??
            (props.table.tree ? props.table.processedRows.length : props.table.rowCount) + 1,
          "aria-colcount": props.table.columns.length + props.leadingColumns,
          "aria-busy":
            props.table.loadState === "loading" || props.table.loadState === "streaming"
              ? "true"
              : undefined,
          "data-empty": flag(
            props.table.renderItems.length === 0 &&
              props.table.topRows.length === 0 &&
              props.table.bottomRows.length === 0,
          ),
          onKeydown: (event: KeyboardEvent) => treeKeydown(event, hierarchy, virtual),
          ...(virtual ? { "data-virtual": "" } : {}),
        },
        [
          virtual?.columns
            ? virtualColgroup(props.table.columns, virtual, layout.width, layout.leadingWidths())
            : layout.colgroup(),
          slots.default?.({ table: props.table }) ?? [h(DataTableHeader), h(DataTableBody)],
        ],
      );
    return () =>
      props.virtual
        ? h(VirtualContent, {
            table: props.table,
            ...(virtualGrid ? { grid: virtualGrid } : {}),
            virtualColumns: props.virtualColumns,
            gutter: layout.leadingWidths().reduce((sum, width) => sum + width, 0),
            options: virtualOptions(props),
            tableElement: () => element.value,
            render,
          })
        : render();
  },
});

export const DataTableCaption = defineComponent({
  name: "DataTableCaption",
  slots: Object as SlotsType<{ default?: () => VNode[] }>,
  props: { as: asProp("caption") },
  setup(props, { slots }) {
    return () => h(props.as, slots.default?.());
  },
});

/** The header section. Without a slot it renders one header cell per visible column. */
export const DataTableHeader = defineComponent({
  name: "DataTableHeader",
  slots: Object as SlotsType<{
    default?: (props: { columns: readonly TableColumn<unknown>[] }) => VNode[];
  }>,
  props: { as: asProp("thead") },
  setup(props, { slots }) {
    const table = injectDataTable("<DataTableHeader>");
    const virtual = injectVirtual();
    return () =>
      h(
        props.as,
        slots.default?.({ columns: table.columns }) ??
          h(DataTableHeaderRow, () =>
            virtual?.columns
              ? h(DataTableVirtualColumns, null, {
                  default: ({ column }: { column: TableColumn<unknown> }) => [
                    h(DataTableHeaderCell, { key: column.id, column }),
                  ],
                })
              : table.columns.map((column) => h(DataTableHeaderCell, { key: column.id, column })),
          ),
      );
  },
});

export const DataTableHeaderRow = defineComponent({
  name: "DataTableHeaderRow",
  slots: Object as SlotsType<{ default?: () => VNode[] }>,
  props: { as: asProp("tr") },
  setup(props, { slots }) {
    return () => h(props.as, { "aria-rowindex": 1 }, slots.default?.());
  },
});

/** Shared header/body column slice, with native spacer cells for omitted columns. */
export const DataTableVirtualColumns = defineComponent({
  name: "DataTableVirtualColumns",
  slots: Object as SlotsType<{
    default?: (props: { column: TableColumn<unknown>; index: number }) => VNode[];
  }>,
  props: { as: { type: String as PropType<"th" | "td">, default: "th" } },
  setup(props, { slots }) {
    const table = injectDataTable("<DataTableVirtualColumns>");
    const virtual = injectVirtual();
    return () =>
      h(
        Fragment,
        renderColumns(
          table.columns,
          virtual,
          (column, index) => slots.default?.({ column, index }),
          props.as,
        ),
      );
  },
});

/**
 * A column header with `aria-sort`. Without a slot it shows the header text inside a sort button
 * for sortable columns.
 */
export const DataTableHeaderCell = defineComponent({
  name: "DataTableHeaderCell",
  slots: Object as SlotsType<{
    default?: (props: {
      column: TableColumn<unknown>;
      sort: SortInfo | undefined;
      toggleSort: (multi?: boolean) => void;
    }) => VNode[];
  }>,
  props: { column: columnProp, as: asProp("th") },
  setup(props, { slots }) {
    const table = injectDataTable("<DataTableHeaderCell>");
    const columnOffset = injectColumnOffset();
    const layout = injectColumnLayout();
    const rows = injectRowLayout();
    provideHeaderColumn(() => props.column);
    return () => {
      const { column } = props;
      const sort = table.getSort(column.id);
      const ariaSort = sort
        ? sort.direction === "asc"
          ? "ascending"
          : "descending"
        : column.sortable
          ? "none"
          : undefined;
      const content =
        slots.default?.({
          column,
          sort,
          toggleSort: (multi = false) => table.toggleSort(column.id, { multi }),
        }) ??
        (column.sortable ? h(DataTableSortButton, { column }, () => column.header) : column.header);
      return h(
        props.as,
        {
          scope: "col",
          "aria-sort": ariaSort,
          "data-column": column.id,
          "data-align": column.align,
          "data-sortable": flag(column.sortable),
          "data-sort": sort?.direction,
          ...layout?.attrs(column, true),
          style: [
            columnStyle(column),
            layout?.attrs(column, true)["style"],
            rows?.headerStyle(!!column.pinned),
          ],
          "aria-colindex": table.columns.indexOf(column) + columnOffset() + 1,
        },
        [content, layout?.resizable() && column.resizable ? h(DataTableColumnResizer) : null],
      );
    };
  },
});

export function columnStyle(column: TableColumn<unknown>): Record<string, string> | undefined {
  const style: Record<string, string> = {};
  if (column.width !== undefined) {
    style["width"] = `${column.width}px`;
  }
  if (column.minWidth !== undefined) {
    style["minWidth"] = `${column.minWidth}px`;
  }
  return Object.keys(style).length > 0 ? style : undefined;
}

/**
 * Toggles a column's sort. Shift-click adds the column to the existing sort instead of replacing
 * it. The slot receives the current sort so it can draw an indicator.
 */
export const DataTableSortButton = defineComponent({
  name: "DataTableSortButton",
  slots: Object as SlotsType<{
    default?: (props: { sort: SortInfo | undefined }) => VNode[];
    indicator?: (props: { sort: SortInfo | undefined }) => VNode[];
  }>,
  props: { column: columnProp, as: asProp("button") },
  setup(props, { slots }) {
    const table = injectDataTable("<DataTableSortButton>");
    const locale = useTableLocale();
    return () => {
      const sort = table.getSort(props.column.id);
      const next = !sort ? "ascending" : sort.direction === "asc" ? "descending" : "unsorted";
      return h(
        props.as,
        {
          type: props.as === "button" ? "button" : undefined,
          "data-sort": sort?.direction,
          "aria-label": locale().messages.sortBy(props.column.header, next),
          onClick: (event: MouseEvent) =>
            table.toggleSort(props.column.id, { multi: event.shiftKey }),
        },
        [slots.default?.({ sort }) ?? props.column.header, slots.indicator?.({ sort })],
      );
    };
  },
});

/**
 * The body section. Without a slot it renders a row per row on the page, and the `empty` slot in
 * a full-width row when there are none.
 */
export const DataTableBody = defineComponent({
  name: "DataTableBody",
  inheritAttrs: false,
  slots: Object as SlotsType<
    {
      default?: (props: { rows: readonly TableRow<unknown>[] }) => VNode[];
      empty?: () => VNode[];
      detail?: (props: { row: TableRow<unknown>; rowIndex: number }) => VNode[];
      row?: (props: DetailSlotProps) => VNodeChild;
    } & GroupSlots
  >,
  props: {
    as: asProp("tbody"),
    ...virtualProps,
    colspan: { type: Number as PropType<number | undefined>, default: undefined },
  },
  setup(props, { slots, attrs }) {
    const table = injectDataTable("<DataTableBody>");
    const locale = useTableLocale();
    const virtual = injectVirtual();
    const rowLayout = injectRowLayout();
    const details = createDetails(
      table,
      () => slots.detail,
      () => props.colspan ?? table.columns.length,
    );
    return () => {
      if (props.virtual && !virtual)
        return h(VirtualDataTableBody, mergeProps(props, attrs), slots);
      if (virtual)
        return pinnedTableSections(
          table,
          renderTableBody(
            table,
            virtual,
            props.as,
            props.colspan,
            slots,
            details,
            undefined,
            rowLayout,
          ),
          props.as,
          slots,
          attrs,
        );
      let content: VNodeChild[] | VNode | undefined = slots.default?.({ rows: table.rows });
      if (!content) {
        content =
          table.renderItems.length === 0 && slots.empty
            ? h("tr", { "data-empty": "" }, [
                h("td", { colspan: Math.max(1, table.columns.length) }, slots.empty()),
              ])
            : (rowLayout?.items ?? table.renderItems).map((item) =>
                item.kind === "row"
                  ? slots.row
                    ? h(Fragment, { key: item.key }, [slots.row(item)])
                    : h(DataTableRow, { key: item.key, row: item.row, rowIndex: item.rowIndex })
                  : item.kind === "detail"
                    ? details.render(item.row, item.rowIndex)
                    : groupRow(
                        item,
                        slots,
                        rowLayout?.aggregatePosition ?? "group",
                        rowLayout?.footer(item.key),
                      ),
              );
      }
      const visibleDetails = new Set(
        table.renderItems.filter((item) => item.kind === "detail").map((item) => item.row.key),
      );
      const retained = slots.default ? [] : details.retained(visibleDetails);
      const sentinel = loadSentinel(table, props.colspan ?? table.columns.length, locale());
      return pinnedTableSections(
        table,
        h(props.as, { "data-row-region": "centre" }, [
          ...(Array.isArray(content) ? content : content ? [content] : []),
          ...retained,
          ...(sentinel ? [sentinel] : []),
        ]),
        props.as,
        slots,
        attrs,
      );
    };
  },
});

type TableBodySlots = GroupSlots & {
  default?: (props: { rows: readonly TableRow<unknown>[] }) => VNode[];
  empty?: () => VNode[];
  detail?: (props: { row: TableRow<unknown>; rowIndex: number }) => VNode[];
  row?: (props: DetailSlotProps) => VNodeChild;
};
function pinnedTableSections(
  table: DataTableBinding<unknown>,
  centre: VNode,
  as: string,
  slots: TableBodySlots,
  attrs: Record<string, unknown> = {},
): VNode {
  const body = cloneVNode(centre, { ...attrs, "data-row-region": "centre" });
  const region = (side: "top" | "bottom"): VNode | null => {
    const rows = side === "top" ? table.topRows : table.bottomRows;
    return rows.length
      ? h(
          as,
          { "data-row-region": side, class: attrs["class"] },
          rows.map((row, index) => {
            const rowIndex =
              side === "top" ? index : table.topRows.length + table.rows.length + index;
            return h(
              DataTablePinnedRow,
              { key: getRowItemKey(row.key), row, side },
              {
                default: () => {
                  const child =
                    slots.row?.({ row, rowIndex }) ?? h(DataTableRow, { row, rowIndex });
                  return [isVNode(child) ? child : h(Fragment, null, [child])];
                },
              },
            );
          }),
        )
      : null;
  };
  return table.topRows.length || table.bottomRows.length
    ? h(Fragment, [region("top"), body, region("bottom")])
    : body;
}
function renderTableBody(
  table: DataTableBinding<unknown>,
  virtual: ComponentVirtualBinding,
  as: string,
  colspan: number | undefined,
  slots: TableBodySlots,
  details: ReturnType<typeof createDetails>,
  element?: ShallowRef<HTMLElement | undefined>,
  rowLayout?: ReturnType<typeof injectRowLayout>,
): VNode {
  const width = physicalColumnCount(
    virtual,
    table.columns.length,
    Math.max(0, (colspan ?? table.columns.length) - table.columns.length),
  );
  const attrs = { "data-row-region": "centre", ...(element ? { ref: element } : {}) };
  const content = slots.default?.({
    rows: virtual.rowItems.flatMap((item) =>
      item.renderItem.kind === "row" ? [item.renderItem.row] : [],
    ),
  });
  if (table.renderItems.length === 0 && slots.empty)
    return h(
      as,
      attrs,
      h("tr", { "data-empty": "" }, [h("td", { colspan: Math.max(1, width) }, slots.empty())]),
    );
  if (content)
    return h(as, attrs, [
      rowSpacer(virtual.rows.paddingStart, width, "gap-start"),
      ...content,
      rowSpacer(virtual.rows.paddingEnd, width, "gap-end"),
      ...(loadSentinel(table, width) ? [loadSentinel(table, width)] : []),
    ]);
  return h(as, attrs, [
    ...renderRows(virtual, width, (item) =>
      item.renderItem.kind === "row"
        ? slots.row
          ? h(Fragment, { key: item.key }, [slots.row(item.renderItem)])
          : h(DataTableRow, {
              key: item.key,
              row: item.renderItem.row,
              rowIndex: item.renderItem.rowIndex,
            })
        : item.renderItem.kind === "detail"
          ? details.render(item.renderItem.row, item.renderItem.rowIndex)
          : groupRow(
              item.renderItem,
              slots,
              rowLayout?.aggregatePosition ?? "group",
              rowLayout?.footer(item.key),
            ),
    ),
    ...(table.bottomRows.length
      ? [
          rowSpacer(
            Math.max(0, virtual.rows.viewportSize - virtual.rows.totalSize),
            width,
            "pin-fill",
          ),
        ]
      : []),
    ...details.retained(
      new Set(
        virtual.rowItems.flatMap((item) =>
          item.renderItem.kind === "detail" ? [item.renderItem.row.key] : [],
        ),
      ),
    ),
    ...(loadSentinel(table, width) ? [loadSentinel(table, width)] : []),
  ]);
}
const VirtualDataTableBody = defineComponent({
  name: "DataTableVirtualBody",
  inheritAttrs: false,
  props: {
    as: asProp("tbody"),
    ...virtualProps,
    colspan: { type: Number as PropType<number | undefined>, default: undefined },
  },
  slots: Object as SlotsType<TableBodySlots>,
  setup(props, { slots, attrs }) {
    const table = injectDataTable("<DataTableBody>");
    const rowLayout = injectRowLayout();
    const element = shallowRef<HTMLElement>();
    const virtual = createComponentVirtual(table, virtualOptions(props), () =>
      element.value?.closest("table"),
    );
    const details = createDetails(
      table,
      () => slots.detail,
      () => props.colspan ?? table.columns.length,
    );
    return () =>
      pinnedTableSections(
        table,
        renderTableBody(
          table,
          virtual,
          props.as,
          props.colspan,
          slots,
          details,
          element,
          rowLayout,
        ),
        props.as,
        slots,
        attrs,
      );
  },
});

/** A body row; `aria-selected` and `data-selected` follow the selection. */
export const DataTableRow = defineComponent({
  name: "DataTableRow",
  slots: Object as SlotsType<{
    default?: (props: {
      row: TableRow<unknown>;
      selected: boolean;
      columns: readonly TableColumn<unknown>[];
    }) => VNode[];
  }>,
  props: {
    row: rowProp,
    as: asProp("tr"),
    rowIndex: { type: Number as PropType<number | undefined>, default: undefined },
    /**
     * A page's own attributes for the row, from `rowAttributes`. They come before the row's own,
     * so `data-key`, selection, tree, and focus attributes always win; class and style merge.
     */
    attributes: {
      type: Object as PropType<Readonly<Record<string, unknown>> | undefined>,
      default: undefined,
    },
  },
  setup(props, { slots }) {
    const table = injectDataTable("<DataTableRow>");
    const virtual = injectVirtual();
    const hierarchy = injectHierarchy();
    const rowLayout = injectRowLayout();
    return () => {
      const { row } = props;
      const selected = table.isSelected(row.key);
      const item = virtual ? virtualRow(virtual, row) : undefined;
      const position =
        props.rowIndex ??
        (item?.renderItem.kind === "row" ? item.renderItem.rowIndex : table.gridRows.indexOf(row));
      return h(
        props.as,
        mergeProps(props.attributes ?? {}, {
          "aria-rowindex":
            rowLayout?.index(row.key) ??
            (position === -1 ? undefined : table.pageStart + position + 1),
          "aria-selected": table.selectionMode === "none" ? undefined : String(selected),
          "aria-level": rowLayout?.level(row.key),
          "data-selected": flag(selected),
          "data-key": String(row.key),
          "data-dirty": flag(row.isDirty),
          ...hierarchyRowAttrs(table, row, hierarchy),
          tabindex: table.tree
            ? (hierarchy?.focusKey ?? table.gridRows[0]?.key) === row.key
              ? 0
              : -1
            : undefined,
          onFocus: () => {
            if (hierarchy) hierarchy.focus.value = row.key;
          },
          ...(virtual && item
            ? {
                ref: (element: Element | ComponentPublicInstance | null) =>
                  virtual.rows.measureElement(element, item.key),
                "data-virtual-row": "",
              }
            : {}),
        }),
        slots.default?.({ row, selected, columns: table.columns }) ??
          renderColumns(
            table.columns,
            virtual,
            (column) => h(DataTableCell, { key: column.id, row, column }),
            "td",
          ),
      );
    };
  },
});

/** A body cell. The slot receives the raw value and the formatted text. */
export const DataTableCell = defineComponent({
  name: "DataTableCell",
  slots: Object as SlotsType<{
    default?: (props: {
      row: TableRow<unknown>;
      column: TableColumn<unknown>;
      value: unknown;
      display: string;
    }) => VNode[];
  }>,
  props: {
    row: rowProp,
    column: columnProp,
    as: asProp("td"),
    tree: { type: Boolean, default: true },
  },
  setup(props, { slots }) {
    const table = injectDataTable("<DataTableCell>");
    const columnOffset = injectColumnOffset();
    const hierarchy = injectHierarchy();
    const layout = injectColumnLayout();
    const pin = injectPinnedRow();
    return () => {
      const { row, column } = props;
      const value = row.getValue(column.id);
      const display = row.getDisplay(column.id);
      const content = () => slots.default?.({ row, column, value, display }) ?? display;
      return h(
        props.as,
        {
          "data-column": column.id,
          "data-align": column.align,
          ...layout?.attrs(column),
          ...(pin ? mergeProps(layout?.attrs(column) ?? {}, pin.attrs(!!column.pinned)) : {}),
          "aria-colindex": table.columns.indexOf(column) + columnOffset() + 1,
        },
        props.tree && table.tree && column.id === resolveTreeColumn(table, hierarchy?.treeColumn)
          ? h(DataTableTreeCell, { row }, { default: content })
          : content(),
      );
    };
  },
});

/** Renders its slot only when no row passes the search and filters. */
export const DataTableEmpty = defineComponent({
  name: "DataTableEmpty",
  slots: Object as SlotsType<{ default?: () => VNode[] }>,
  props: { as: asProp("div") },
  setup(props, { slots }) {
    const table = injectDataTable("<DataTableEmpty>");
    return () => (table.rowCount === 0 ? h(props.as, { role: "status" }, slots.default?.()) : null);
  },
});
