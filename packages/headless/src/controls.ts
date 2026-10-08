import type {
  PageItem,
  SelectionCoverage,
  TableColumn,
  LoadState,
  TableIssue,
} from "@vueye-table/core";
import { injectDataTable } from "@vueye-table/vue";
import { defineComponent, h, onScopeDispose, type PropType, type SlotsType, type VNode } from "vue";

import { asProp, flag, rowProp } from "./shared";

function checkbox(props: {
  readonly checked: boolean;
  readonly indeterminate: boolean;
  readonly label: string;
  readonly disabled: boolean;
  readonly onChange: () => void;
}) {
  return h("input", {
    type: "checkbox",
    checked: props.checked,
    indeterminate: props.indeterminate,
    disabled: props.disabled,
    "aria-label": props.label,
    "data-state": props.indeterminate ? "indeterminate" : props.checked ? "checked" : "unchecked",
    onChange: props.onChange,
  });
}

/**
 * Selects or clears every row in the table's select-all scope. It shows the indeterminate state
 * when only some are selected. The slot receives the state to draw a custom control.
 */
export const DataTableSelectAll = defineComponent({
  name: "DataTableSelectAll",
  slots: Object as SlotsType<{
    default?: (props: { state: SelectionCoverage; toggle: () => void }) => VNode[];
  }>,
  props: { label: { type: String, default: "Select all rows" } },
  setup(props, { slots }) {
    const table = injectDataTable("<DataTableSelectAll>");
    return () => {
      const state = table.allSelection;
      const toggle = (): void => table.toggleAll();
      return (
        slots.default?.({ state, toggle }) ??
        checkbox({
          checked: state === "all",
          indeterminate: state === "some",
          label: props.label,
          disabled: table.selectionMode !== "multiple" || table.rows.length === 0,
          onChange: toggle,
        })
      );
    };
  },
});

/** Selects or clears one row. */
export const DataTableSelectRow = defineComponent({
  name: "DataTableSelectRow",
  slots: Object as SlotsType<{
    default?: (props: { selected: boolean; toggle: () => void }) => VNode[];
  }>,
  props: { row: rowProp, label: { type: String, default: "Select row" } },
  setup(props, { slots }) {
    const table = injectDataTable("<DataTableSelectRow>");
    return () => {
      const selected = table.isSelected(props.row.key);
      const toggle = (): void => table.toggleRow(props.row.key);
      return (
        slots.default?.({ selected, toggle }) ??
        checkbox({
          checked: selected,
          indeterminate: false,
          label: props.label,
          disabled: table.selectionMode === "none",
          onChange: toggle,
        })
      );
    };
  },
});

/**
 * A search box bound to the table's free-text search. `debounce` waits that many milliseconds
 * after the last keystroke before searching.
 */
export const DataTableSearch = defineComponent({
  name: "DataTableSearch",
  props: {
    debounce: { type: Number, default: 0 },
    label: { type: String, default: "Search" },
    placeholder: { type: String as PropType<string | undefined>, default: undefined },
  },
  setup(props) {
    const table = injectDataTable("<DataTableSearch>");
    let timer: ReturnType<typeof setTimeout> | undefined;
    onScopeDispose(() => clearTimeout(timer));
    return () =>
      h("input", {
        type: "search",
        value: table.state.search,
        placeholder: props.placeholder,
        "aria-label": props.label,
        onInput: (event: Event) => {
          const { value } = event.target as HTMLInputElement;
          clearTimeout(timer);
          if (props.debounce > 0) {
            timer = setTimeout(() => table.search(value), props.debounce);
          } else {
            table.search(value);
          }
        },
      });
  },
});

/**
 * Page navigation. The slot receives everything needed to draw custom controls; without one it
 * renders previous, numbered, and next buttons with `aria-current` on the current page.
 */
export const DataTablePagination = defineComponent({
  name: "DataTablePagination",
  slots: Object as SlotsType<{
    default?: (props: {
      page: number;
      pageCount: number;
      items: readonly PageItem[];
      canPrevious: boolean;
      canNext: boolean;
      goToPage: (page: number) => void;
      next: () => void;
      previous: () => void;
    }) => VNode[];
  }>,
  props: {
    as: asProp("nav"),
    label: { type: String, default: "Pagination" },
  },
  setup(props, { slots }) {
    const table = injectDataTable("<DataTablePagination>");
    return () => {
      const slotProps = {
        page: table.page,
        pageCount: table.pageCount,
        items: table.pageItems,
        canPrevious: table.canPreviousPage,
        canNext: table.canNextPage,
        goToPage: table.goToPage,
        next: table.nextPage,
        previous: table.previousPage,
      };
      const button = (
        label: string,
        content: string,
        disabled: boolean,
        onClick: () => void,
        current = false,
      ) =>
        h(
          "button",
          {
            type: "button",
            disabled,
            "aria-label": label,
            "aria-current": current ? "page" : undefined,
            "data-current": flag(current),
            onClick,
          },
          content,
        );
      return h(
        props.as,
        { "aria-label": props.label },
        slots.default?.(slotProps) ?? [
          button("Previous page", "‹", !table.canPreviousPage, table.previousPage),
          ...table.pageItems.map((item) =>
            item.type === "gap"
              ? h("span", { key: item.key, "aria-hidden": "true", "data-gap": "" }, "…")
              : button(
                  `Page ${item.page}`,
                  String(item.page),
                  false,
                  () => table.goToPage(item.page),
                  item.current,
                ),
          ),
          button("Next page", "›", !table.canNextPage, table.nextPage),
        ],
      );
    };
  },
});

/** A page size picker. */
export const DataTablePageSize = defineComponent({
  name: "DataTablePageSize",
  props: {
    options: { type: Array as PropType<readonly number[]>, default: () => [5, 10, 20, 50] },
    label: { type: String, default: "Rows per page" },
  },
  setup(props) {
    const table = injectDataTable("<DataTablePageSize>");
    return () => {
      const sizes = props.options.includes(table.pageSize)
        ? props.options
        : [...props.options, table.pageSize].toSorted((left, right) => left - right);
      return h(
        "select",
        {
          value: table.pageSize,
          "aria-label": props.label,
          onChange: (event: Event) =>
            table.setPageSize(Number((event.target as HTMLSelectElement).value)),
        },
        sizes.map((size) =>
          h("option", { key: size, value: size, selected: size === table.pageSize }, String(size)),
        ),
      );
    };
  },
});

/** A checkbox per column that shows or hides it. The slot receives the columns and `toggle`. */
export const DataTableColumnVisibility = defineComponent({
  name: "DataTableColumnVisibility",
  slots: Object as SlotsType<{
    default?: (props: {
      columns: readonly { column: TableColumn<unknown>; visible: boolean }[];
      toggle: (columnId: string, visible?: boolean) => void;
    }) => VNode[];
  }>,
  props: { as: asProp("fieldset"), legend: { type: String, default: "Columns" } },
  setup(props, { slots }) {
    const table = injectDataTable("<DataTableColumnVisibility>");
    return () => {
      const hidden = new Set(table.state.hiddenColumns);
      const columns = table.allColumns.map((column) => ({
        column,
        visible: !hidden.has(column.id),
      }));
      return h(
        props.as,
        slots.default?.({ columns, toggle: table.toggleColumn }) ?? [
          props.as === "fieldset" ? h("legend", props.legend) : null,
          ...columns.map(({ column, visible }) =>
            h("label", { key: column.id, "data-column": column.id }, [
              h("input", {
                type: "checkbox",
                checked: visible,
                disabled: visible && table.columns.length === 1,
                onChange: () => table.toggleColumn(column.id),
              }),
              column.header,
            ]),
          ),
        ],
      );
    };
  },
});

/**
 * A polite live region describing what is shown, such as "1–10 of 57 rows". Screen readers
 * announce it after a search, filter, or page change.
 */
export interface TableStatusSlotProps {
  readonly start: number;
  readonly end: number;
  readonly rowCount: number;
  readonly totalRowCount: number;
  readonly selectedCount: number;
  readonly loadState: LoadState;
  readonly loadedRowCount: number;
  readonly loadError: TableIssue | undefined;
  readonly canLoadMore: boolean;
  readonly retry: () => void;
  readonly loadNext: () => Promise<void>;
}
export const DataTableStatus = defineComponent({
  name: "DataTableStatus",
  slots: Object as SlotsType<{
    default?: (props: TableStatusSlotProps) => VNode[];
  }>,
  props: { as: asProp("p") },
  setup(props, { slots }) {
    const table = injectDataTable("<DataTableStatus>");
    return () => {
      const slotProps = {
        start: table.pageStart,
        end: table.pageEnd,
        rowCount: table.rowCount,
        totalRowCount: table.totalRowCount,
        selectedCount: table.selectedCount,
        loadState: table.loadState,
        loadedRowCount: table.loadedRowCount,
        loadError: table.loadError,
        canLoadMore: table.canLoadMore,
        retry: () => table.retry(),
        loadNext: () => table.loadNext(),
      };
      const count = `Loaded ${table.loadedRowCount.toLocaleString()} ${table.loadedRowCount === 1 ? "row" : "rows"}`;
      const text = table.loadingMode
        ? table.loadState === "error"
          ? `${count}. Could not load rows. Retry loading.`
          : table.loadState === "aborted"
            ? `${count}. Loading stopped.`
            : table.loadState === "loading" || table.loadState === "streaming"
              ? `${count}…`
              : `${count}${table.loadState === "done" ? ". All rows loaded." : "."}`
        : table.rowCount === 0
          ? "No rows"
          : `${table.pageStart}–${table.pageEnd} of ${table.rowCount} rows` +
            (table.selectedCount > 0 ? `, ${table.selectedCount} selected` : "");
      return h(
        props.as,
        { role: "status", "aria-live": "polite" },
        slots.default?.(slotProps) ?? text,
      );
    };
  },
});
