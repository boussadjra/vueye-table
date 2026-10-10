import type {
  CellChange,
  ColumnDef,
  TableIssue,
  TableState,
  TableRow,
  EditResult,
} from "@vueye-table/core";
import type {
  GridCellSlotProps,
  TableStatusSlotProps,
  DetailSlotProps,
  CellEditorSlotProps,
} from "@vueye-table/headless";
import {
  VtGrid,
  VtPageSize,
  VtPagination,
  VtSearch,
  VtStatus,
  VtLoadMore,
  VtToolbar,
} from "@vueye-table/styled";
import {
  provideDataTable,
  provideTableLocale,
  useDataTable,
  useTableLocale,
  type DataTableBinding,
} from "@vueye-table/vue";
import { computed, defineComponent, h, type PropType, type SlotsType, type VNode } from "vue";

import {
  commonProps,
  controlledState,
  createColumnResolver,
  emitStateChanges,
  stateEmitValidators,
  expansionOptions,
  emitExpansionChanges,
  CellContent,
  editingOptions,
  editingEmits,
} from "./shared";

/**
 * An editable spreadsheet over an array. Cells are edited in place with the keyboard or a double
 * click, ranges are selected with Shift or by dragging, and copy, cut, paste, clear, undo, and
 * redo work like a spreadsheet application. Every edit produces a new array through
 * `update:data`; the array passed in is never mutated.
 */
export const VueyeGrid = defineComponent({
  name: "VueyeGrid",
  slots: Object as SlotsType<
    {
      [key: `cell.${string}`]: GridCellSlotProps & { readonly item: unknown };
      [key: `editor.${string}`]: CellEditorSlotProps;
    } & {
      default?: (props: Record<string, unknown>) => VNode[];
      status?: (props: TableStatusSlotProps) => VNode[];
      expanded?: (props: DetailSlotProps) => VNode[];
    }
  >,
  props: {
    data: { type: Array as PropType<readonly unknown[]>, default: () => [] },
    ...commonProps,
    searchable: { type: Boolean, default: false },
    columnToggle: { type: Boolean, default: false },
    /** Page the grid. By default every row is on one page. */
    pagination: { type: Boolean, default: false },
    /** Columns are editable unless their definition says otherwise. Set `false` to lock all. */
    editable: { type: Boolean, default: true },
    rowNumbers: { type: Boolean, default: true },
    columnLetters: { type: Boolean, default: false },
    /** The grid's accessible name. Defaults to the messages' `spreadsheet`. */
    label: { type: String as PropType<string | undefined>, default: undefined },
    /** Show undo, redo, and CSV export buttons. */
    toolbar: { type: Boolean, default: true },
  },
  emits: {
    ...editingEmits,
    ...stateEmitValidators,
    "state-change": (_state: TableState) => true,
    "update:data": (_data: readonly unknown[]) => true,
    edit: (_changes: readonly CellChange<unknown>[]) => true,
    "edit-error": (_issues: readonly TableIssue[]) => true,
    export: (_csv: string) => true,
    expand: (_item: unknown, _row: TableRow<unknown>) => true,
    collapse: (_item: unknown, _row: TableRow<unknown>) => true,
  },
  setup(props, { emit, slots, expose, attrs }) {
    const inherited = useTableLocale();
    const locale = provideTableLocale(() => ({ locale: props.locale, messages: props.messages }));
    const resolveColumns = createColumnResolver();
    let previousColumns:
      | { source: readonly unknown[]; editable: boolean; columns: readonly ColumnDef<unknown>[] }
      | undefined;
    const columns = computed(() => {
      const source = resolveColumns(props.columns, props.data);
      if (previousColumns?.source === source && previousColumns.editable === props.editable)
        return previousColumns.columns;
      const resolved = source.map(
        (column) =>
          ({
            ...column,
            editable: props.editable ? (column.editable ?? true) : false,
          }) as ColumnDef<unknown>,
      );
      previousColumns = { source, editable: props.editable, columns: resolved };
      return resolved;
    });
    const everyRow = (): number => Math.max(1, props.data.length);
    const initialPagination = {
      page: props.page ?? 1,
      pageSize: props.pagination ? (props.pageSize ?? props.pageSizeOptions[0] ?? 10) : everyRow(),
    };
    let binding: DataTableBinding<unknown> | undefined;
    const table = useDataTable<unknown>({
      ...expansionOptions(props, !!slots.expanded),
      ...editingOptions(props),
      data: () => props.data,
      source: computed(() => props.source),
      loadMore: computed(() => props.loadMore),
      endThreshold: props.endThreshold,
      manual: props.manual,
      rowCount: () => props.rowCount,
      columns,
      rowKey: props.rowKey as never,
      locale: props.locale ?? inherited().locale,
      normalizeText: props.normalizeText,
      paginate:
        props.paginate ??
        (props.source || props.loadMore ? false : props.virtual ? props.pagination : true),
      selectionMode: "none",
      initialState: { pagination: initialPagination },
      state: () => {
        const controlled = controlledState(
          props,
          binding?.table.getState().pagination ?? initialPagination,
        );
        return {
          ...controlled,
          selection: undefined,
          pagination: props.pagination ? controlled.pagination : { page: 1, pageSize: everyRow() },
        };
      },
      onEditIssues(issues) {
        emit("edit-error", issues);
        emit("edit-issues", issues);
      },
      onDataChange(data, changes) {
        emit("update:data", data);
        emit("edit", changes);
      },
      onStateChange(state, previous) {
        emitStateChanges(emit as never, state, previous);
        emitExpansionChanges(emit, state, previous, binding?.table.getSnapshot());
        emit("state-change", state);
      },
    });
    binding = table;
    provideDataTable(table);
    expose({ table });

    // `cell.<id>` slots also receive the row's data as `item`, as they do on `<VueyeTable>`.
    const gridSlots = (): Record<string, unknown> => {
      const forwarded: Record<string, unknown> = {};
      if (slots.expanded) forwarded["expanded"] = slots.expanded;
      for (const [name, slot] of Object.entries(slots)) {
        if (name === "default" && slot) {
          forwarded[name] = slot;
        } else if (name.startsWith("cell.")) {
          const cellSlot = slots[name as `cell.${string}`];
          forwarded[name] = (cellProps: GridCellSlotProps) =>
            cellSlot ? h(CellContent, { ...cellProps, render: cellSlot }) : cellProps.display;
        } else if (name.startsWith("editor.")) {
          forwarded[name] = slot;
        }
      }
      return forwarded;
    };

    const button = (label: string, disabled: boolean, onClick: () => void) =>
      h("button", { type: "button", class: "vt-button", disabled, onClick }, label);

    return () =>
      h("div", { class: "vt-theme vueye-grid", "data-vt-theme": props.theme }, [
        props.toolbar || props.searchable || props.addRow
          ? h(VtToolbar, () => [
              props.searchable
                ? h(VtSearch, {
                    placeholder: props.searchPlaceholder ?? locale().messages.searchPlaceholder,
                  })
                : null,
              props.addRow
                ? button(locale().messages.addRow, false, () => {
                    table.insertRows();
                  })
                : null,
              h("div", { class: "vt-toolbar-spacer" }),
              props.toolbar
                ? [
                    button(locale().messages.undo, !table.canUndo, () => table.undo()),
                    button(locale().messages.redo, !table.canRedo, () => table.redo()),
                    button(locale().messages.exportCsv, false, () =>
                      emit("export", table.exportRows()),
                    ),
                  ]
                : null,
            ])
          : null,
        h(
          VtGrid,
          {
            table,
            label: props.label ?? locale().messages.spreadsheet,
            "aria-describedby": attrs["aria-describedby"],
            rowNumbers: props.rowNumbers,
            rowActions: props.editable || props.removeRows,
            removable: props.removeRows,
            onSave: (result: unknown) => emit("save", result as EditResult<unknown>),
            onCancel: (key: unknown) => emit("cancel", key as string | number),
            columnLetters: props.columnLetters,
            density: props.density,
            striped: props.striped,
            bordered: props.bordered,
            hover: false,
            stickyHeader: props.stickyHeader,
            loading:
              props.loading || table.loadState === "loading" || table.loadState === "streaming",
            theme: props.theme,
            virtual: props.virtual,
            virtualColumns: props.virtualColumns,
            height: props.height,
            rowHeight: props.rowHeight,
            overscan: props.overscan,
            columnWidth: props.columnWidth,
            treeColumn: props.treeColumn,
            keepAliveDetail: props.keepAliveDetail,
            ...(props.maxHeight ? { style: { "--vt-max-height": props.maxHeight } } : {}),
          },
          gridSlots(),
        ),
        props.pagination || table.loadingMode || slots.status || table.tree
          ? h(VtToolbar, { class: "vt-footer" }, () => [
              h(
                VtStatus,
                null,
                slots.status
                  ? { default: (status: TableStatusSlotProps) => slots.status?.(status) }
                  : undefined,
              ),
              ...(table.loadingMode ? [h(VtLoadMore)] : []),
              props.pagination && table.paginate
                ? h("div", { class: "vt-footer-controls" }, [
                    h(VtPageSize, { options: props.pageSizeOptions }),
                    h(VtPagination),
                  ])
                : null,
            ])
          : null,
      ]);
  },
});
