import type { SortInfo, TableColumn, TableRow } from "@vueye-table/core";
import {
  injectDataTable,
  provideDataTable,
  type AnyDataTableBinding,
  type DataTableBinding,
} from "@vueye-table/vue";
import { defineComponent, h, type PropType, type SlotsType, type VNode } from "vue";

import { asProp, columnProp, flag, rowProp } from "./shared";

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
  },
  setup(props, { slots }) {
    provideDataTable(props.table);
    return () =>
      h(
        props.as,
        {
          "aria-rowcount": props.table.rowCount + 1,
          "aria-colcount": props.table.columns.length,
          "data-empty": flag(props.table.rowCount === 0),
        },
        slots.default?.({ table: props.table }) ?? [h(DataTableHeader), h(DataTableBody)],
      );
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
    return () =>
      h(
        props.as,
        slots.default?.({ columns: table.columns }) ??
          h(DataTableHeaderRow, () =>
            table.columns.map((column) => h(DataTableHeaderCell, { key: column.id, column })),
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
          style: columnStyle(column),
        },
        content,
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
    return () => {
      const sort = table.getSort(props.column.id);
      const next = !sort ? "ascending" : sort.direction === "asc" ? "descending" : "unsorted";
      return h(
        props.as,
        {
          type: props.as === "button" ? "button" : undefined,
          "data-sort": sort?.direction,
          "aria-label": `${props.column.header}, sort ${next}`,
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
  slots: Object as SlotsType<{
    default?: (props: { rows: readonly TableRow<unknown>[] }) => VNode[];
    empty?: () => VNode[];
  }>,
  props: { as: asProp("tbody") },
  setup(props, { slots }) {
    const table = injectDataTable("<DataTableBody>");
    return () => {
      let content: VNode[] | VNode | undefined = slots.default?.({ rows: table.rows });
      if (!content) {
        content =
          table.rows.length === 0 && slots.empty
            ? h("tr", { "data-empty": "" }, [
                h("td", { colspan: Math.max(1, table.columns.length) }, slots.empty()),
              ])
            : table.rows.map((row) => h(DataTableRow, { key: row.key, row }));
      }
      return h(props.as, content);
    };
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
  props: { row: rowProp, as: asProp("tr") },
  setup(props, { slots }) {
    const table = injectDataTable("<DataTableRow>");
    return () => {
      const { row } = props;
      const selected = table.isSelected(row.key);
      const position = table.rows.indexOf(row);
      return h(
        props.as,
        {
          "aria-rowindex": position === -1 ? undefined : table.pageStart + position + 1,
          "aria-selected": table.selectionMode === "none" ? undefined : String(selected),
          "data-selected": flag(selected),
          "data-key": String(row.key),
        },
        slots.default?.({ row, selected, columns: table.columns }) ??
          table.columns.map((column) => h(DataTableCell, { key: column.id, row, column })),
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
  props: { row: rowProp, column: columnProp, as: asProp("td") },
  setup(props, { slots }) {
    return () => {
      const { row, column } = props;
      const value = row.getValue(column.id);
      const display = row.getDisplay(column.id);
      return h(
        props.as,
        { "data-column": column.id, "data-align": column.align },
        slots.default?.({ row, column, value, display }) ?? display,
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
