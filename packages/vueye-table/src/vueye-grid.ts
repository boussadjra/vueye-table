import type { CellChange, ColumnDef, TableIssue } from "@vueye-table/core";
import {
  VtGrid,
  VtPageSize,
  VtPagination,
  VtSearch,
  VtStatus,
  VtToolbar,
} from "@vueye-table/styled";
import { provideDataTable, useDataTable } from "@vueye-table/vue";
import { computed, defineComponent, h, type PropType, type SlotsType, type VNode } from "vue";

import { commonProps, controlledState, resolveColumns, stateEmits } from "./shared";

/**
 * An editable spreadsheet over an array. Cells are edited in place with the keyboard or a double
 * click, ranges are selected with Shift or by dragging, and copy, cut, paste, clear, undo, and
 * redo work like a spreadsheet application. Every edit produces a new array through
 * `update:data`; the array passed in is never mutated.
 */
export const VueyeGrid = defineComponent({
  name: "VueyeGrid",
  slots: Object as SlotsType<{ default?: (props: Record<string, unknown>) => VNode[] }>,
  props: {
    data: { type: Array as PropType<readonly unknown[]>, required: true },
    ...commonProps,
    searchable: { type: Boolean, default: false },
    columnToggle: { type: Boolean, default: false },
    /** Page the grid. By default every row is on one page. */
    pagination: { type: Boolean, default: false },
    /** Columns are editable unless their definition says otherwise. Set `false` to lock all. */
    editable: { type: Boolean, default: true },
    rowNumbers: { type: Boolean, default: true },
    columnLetters: { type: Boolean, default: false },
    label: { type: String, default: "Spreadsheet" },
    /** Show undo, redo, and CSV export buttons. */
    toolbar: { type: Boolean, default: true },
  },
  emits: {
    ...Object.fromEntries(stateEmits.map((name) => [name, null])),
    "update:data": (_data: readonly unknown[]) => true,
    edit: (_changes: readonly CellChange<unknown>[]) => true,
    "edit-error": (_issues: readonly TableIssue[]) => true,
    export: (_csv: string) => true,
  } as { [K in (typeof stateEmits)[number]]: null } & {
    "update:data": (data: readonly unknown[]) => boolean;
    edit: (changes: readonly CellChange<unknown>[]) => boolean;
    "edit-error": (issues: readonly TableIssue[]) => boolean;
    export: (csv: string) => boolean;
  },
  setup(props, { emit, slots, expose }) {
    const columns = computed(() =>
      resolveColumns(props.columns, props.data).map(
        (column) =>
          ({
            ...column,
            editable: props.editable ? (column.editable ?? true) : false,
          }) as ColumnDef<unknown>,
      ),
    );
    const everyRow = (): number => Math.max(1, props.data.length);
    const initialPagination = {
      page: props.page ?? 1,
      pageSize: props.pagination ? (props.pageSize ?? props.pageSizeOptions[0] ?? 10) : everyRow(),
    };
    const table = useDataTable<unknown>({
      data: () => props.data,
      columns,
      rowKey: props.rowKey as never,
      selectionMode: "none",
      initialState: { pagination: initialPagination },
      state: () => ({
        ...controlledState(props, initialPagination),
        pagination: props.pagination ? undefined : { page: 1, pageSize: everyRow() },
      }),
      onEditIssues(issues) {
        emit("edit-error", issues);
      },
      onDataChange(data, changes) {
        emit("update:data", data);
        emit("edit", changes);
      },
      onStateChange(state, previous) {
        if (state.pagination.page !== previous.pagination.page) {
          emit("update:page", state.pagination.page);
        }
        if (state.sorting !== previous.sorting) {
          emit("update:sorting", state.sorting);
        }
        if (state.search !== previous.search) {
          emit("update:search", state.search);
        }
      },
    });
    provideDataTable(table);
    expose({ table });

    const button = (label: string, disabled: boolean, onClick: () => void) =>
      h("button", { type: "button", class: "vt-button", disabled, onClick }, label);

    return () =>
      h("div", { class: "vt-theme vueye-grid", "data-vt-theme": props.theme }, [
        props.toolbar || props.searchable
          ? h(VtToolbar, () => [
              props.searchable ? h(VtSearch, { placeholder: props.searchPlaceholder }) : null,
              h("div", { class: "vt-toolbar-spacer" }),
              props.toolbar
                ? [
                    button("Undo", !table.canUndo, () => table.undo()),
                    button("Redo", !table.canRedo, () => table.redo()),
                    button("Export CSV", false, () => emit("export", table.exportRows())),
                  ]
                : null,
            ])
          : null,
        h(
          VtGrid,
          {
            table,
            label: props.label,
            rowNumbers: props.rowNumbers,
            columnLetters: props.columnLetters,
            density: props.density,
            striped: props.striped,
            bordered: props.bordered,
            hover: false,
            stickyHeader: props.stickyHeader,
            loading: props.loading,
            theme: props.theme,
            ...(props.maxHeight ? { style: { "--vt-max-height": props.maxHeight } } : {}),
          },
          slots.default ? { default: slots.default } : undefined,
        ),
        props.pagination
          ? h(VtToolbar, { class: "vt-footer" }, () => [
              h(VtStatus),
              h("div", { class: "vt-footer-controls" }, [
                h(VtPageSize, { options: props.pageSizeOptions }),
                h(VtPagination),
              ]),
            ])
          : null,
      ]);
  },
});
