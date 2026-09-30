import type { ColumnDef, RowKey, TableRow, TableState } from "@vueye-table/core";
import {
  DataTableBody,
  DataTableCaption,
  DataTableCell,
  DataTableRow,
  DataTableSelectAll,
  DataTableSelectRow,
} from "@vueye-table/headless";
import {
  VtColumnVisibility,
  VtEmpty,
  VtHeader,
  VtPageSize,
  VtPagination,
  VtSearch,
  VtStatus,
  VtToolbar,
} from "@vueye-table/styled";
import { provideDataTable, useDataTable, type DataTableBinding } from "@vueye-table/vue";
import { computed, defineComponent, h, type PropType, type SlotsType, type VNodeChild } from "vue";

import {
  commonProps,
  controlledState,
  createColumnResolver,
  emitStateChanges,
  stateEmits,
} from "./shared";

/** Slot props of `cell.<column id>` and `cell`. */
export interface CellSlotProps {
  readonly item: unknown;
  readonly row: TableRow<unknown>;
  readonly value: unknown;
  readonly display: string;
  readonly column: { readonly id: string; readonly header: string };
}

/** Slot props of `status`, the "1–10 of 57 rows" line. */
export interface StatusSlotProps {
  readonly start: number;
  readonly end: number;
  readonly rowCount: number;
  readonly totalRowCount: number;
  readonly selectedCount: number;
}

/**
 * A complete data table: search, column visibility, sorting, selection, pagination, a live
 * status line, loading and empty states, and theming. Every piece of state is available as a
 * `v-model`, and `manual` hands searching, sorting, and paging to a server.
 */
export const VueyeTable = defineComponent({
  name: "VueyeTable",
  props: {
    data: { type: Array as PropType<readonly unknown[]>, required: true },
    ...commonProps,
    /** `true` or `"multiple"` for checkboxes, `"single"` for one row at a time. */
    selectable: {
      type: [Boolean, String] as PropType<boolean | "single" | "multiple">,
      default: false,
    },
    selected: { type: Array as PropType<readonly RowKey[]>, default: undefined },
    /** The data is one page from a server; `rowCount` is the total. */
    manual: { type: Boolean, default: false },
    rowCount: { type: Number as PropType<number | undefined>, default: undefined },
    /** Shown instead of the empty state while `loading` and there are no rows yet. */
    loadingText: { type: String, default: "Loading…" },
  },
  emits: {
    ...Object.fromEntries(stateEmits.map((name) => [name, null])),
    "state-change": (_state: TableState) => true,
    "row-click": (_item: unknown, _row: TableRow<unknown>) => true,
  } as {
    [K in (typeof stateEmits)[number]]: null;
  } & {
    "state-change": (state: TableState) => boolean;
    "row-click": (item: unknown, row: TableRow<unknown>) => boolean;
  },
  slots: Object as SlotsType<
    {
      [key: `cell.${string}`]: CellSlotProps;
      [key: `header.${string}`]: { column: { id: string; header: string } };
    } & {
      toolbar: { table: unknown };
      empty: Record<string, never>;
      loading: Record<string, never>;
      footer: { table: unknown };
      status: StatusSlotProps;
    }
  >,
  setup(props, { emit, slots, expose }) {
    const selectionMode = computed(() =>
      props.selectable === false ? "none" : props.selectable === "single" ? "single" : "multiple",
    );
    const initialPagination = {
      page: props.page ?? 1,
      pageSize: props.pageSize ?? props.pageSizeOptions[0] ?? 10,
    };
    const resolveColumns = createColumnResolver();
    let binding: DataTableBinding<unknown> | undefined;
    const table = useDataTable<unknown>({
      data: () => props.data,
      columns: () => resolveColumns(props.columns, props.data) as readonly ColumnDef<unknown>[],
      rowKey: props.rowKey as never,
      manual: props.manual,
      rowCount: () => props.rowCount,
      selectionMode: selectionMode.value,
      selectScope: props.selectScope,
      initialState: { pagination: initialPagination },
      state: () =>
        controlledState(props, binding?.table.getState().pagination ?? initialPagination),
      onStateChange(state, previous) {
        emitStateChanges(emit as never, state, previous);
        emit("state-change", state);
      },
    });
    binding = table;
    provideDataTable(table);
    expose({ table });

    const selectable = (): boolean => selectionMode.value !== "none";

    const cell = (row: TableRow<unknown>, column: (typeof table.columns)[number]): VNodeChild => {
      const slot = slots[`cell.${column.id}`];
      return h(
        DataTableCell,
        { key: column.id, row, column },
        slot
          ? {
              default: ({ value, display }: { value: unknown; display: string }) =>
                slot({ item: row.original, row, value, display, column }),
            }
          : undefined,
      );
    };

    const body = (): VNodeChild => {
      const width = table.columns.length + (selectable() ? 1 : 0);
      if (table.rows.length === 0) {
        // While the first page is loading there is nothing to match yet, so say that instead.
        const content = props.loading
          ? (slots.loading?.({}) ?? h(VtEmpty, { text: props.loadingText }))
          : (slots.empty?.({}) ?? h(VtEmpty));
        return h("tr", { "data-empty": "" }, [h("td", { colspan: Math.max(1, width) }, content)]);
      }
      return table.rows.map((row) =>
        h(
          DataTableRow,
          { key: row.key, row, onClick: () => emit("row-click", row.original, row) },
          () => [
            selectable()
              ? h(
                  "td",
                  {
                    class: "vt-selection-cell",
                    onClick: (event: Event) => event.stopPropagation(),
                  },
                  [h(DataTableSelectRow, { row })],
                )
              : null,
            ...table.columns.map((column) => cell(row, column)),
          ],
        ),
      );
    };

    const headerSlots = () => {
      const forwarded: Record<string, unknown> = {};
      for (const column of table.columns) {
        const slot = slots[`header.${column.id}`];
        if (slot) {
          forwarded[`header.${column.id}`] = () => slot({ column });
        }
      }
      return {
        ...forwarded,
        before: () =>
          selectable()
            ? h(
                "th",
                { class: "vt-selection-cell", scope: "col" },
                selectionMode.value === "multiple" ? [h(DataTableSelectAll)] : [],
              )
            : null,
      };
    };

    return () =>
      h(
        "div",
        {
          class: "vt-surface vueye-table",
          "data-density": props.density,
          "data-striped": props.striped ? "" : undefined,
          "data-bordered": props.bordered ? "" : undefined,
          "data-hover": props.hover ? "" : undefined,
          "data-sticky-header": props.stickyHeader ? "" : undefined,
          "data-loading": props.loading ? "" : undefined,
          "data-vt-theme": props.theme,
          "aria-busy": props.loading ? "true" : undefined,
          style: props.maxHeight ? { "--vt-max-height": props.maxHeight } : undefined,
        },
        [
          h("div", { class: "vt-root" }, [
            props.searchable || props.columnToggle || slots.toolbar
              ? h(VtToolbar, () => [
                  props.searchable ? h(VtSearch, { placeholder: props.searchPlaceholder }) : null,
                  h("div", { class: "vt-toolbar-spacer" }),
                  slots.toolbar?.({ table }),
                  props.columnToggle ? h(VtColumnVisibility) : null,
                ])
              : null,
            h("div", { class: "vt-progress", role: "presentation" }),
            h("div", { class: "vt-scroll" }, [
              h(
                "table",
                {
                  class: "vt-table",
                  "aria-rowcount": table.rowCount + 1,
                  "aria-colcount": table.columns.length,
                },
                [
                  props.caption ? h(DataTableCaption, () => props.caption) : null,
                  h(VtHeader, null, headerSlots()),
                  h(DataTableBody, { class: "vt-body" }, () => body()),
                ],
              ),
            ]),
            props.pagination || slots.footer
              ? h(VtToolbar, { class: "vt-footer" }, () => [
                  h(
                    VtStatus,
                    null,
                    slots.status
                      ? { default: (status: StatusSlotProps) => slots.status?.(status) }
                      : props.loading && table.rows.length === 0
                        ? { default: () => props.loadingText }
                        : undefined,
                  ),
                  slots.footer?.({ table }),
                  props.pagination
                    ? h("div", { class: "vt-footer-controls" }, [
                        h(VtPageSize, { options: props.pageSizeOptions }),
                        h(VtPagination),
                      ])
                    : null,
                ])
              : null,
          ]),
        ],
      );
  },
});
