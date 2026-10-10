import type {
  ColumnDef,
  RowKey,
  SortInfo,
  TableRow,
  TableState,
  EditResult,
} from "@vueye-table/core";
import {
  DataTableBody,
  DataTableCaption,
  DataTableCell,
  DataTableRow,
  DataTableSelectAll,
  DataTableSelectRow,
  DataTableRoot,
  DataTableViewport,
  type TableStatusSlotProps,
  type DetailSlotProps,
  resolveTreeColumn,
  DataTableEditRoot,
  DataTableEditCell,
  type CellEditorSlotProps,
} from "@vueye-table/headless";
import {
  VtColumnVisibility,
  VtEmpty,
  VtHeader,
  VtPageSize,
  VtPagination,
  VtSearch,
  VtStatus,
  VtLoadMore,
  VtToolbar,
  VtExpandToggle,
  VtTreeCell,
  VtRowActions,
} from "@vueye-table/styled";
import {
  provideDataTable,
  provideTableLocale,
  useDataTable,
  useTableLocale,
  type DataTableBinding,
} from "@vueye-table/vue";
import {
  computed,
  defineComponent,
  h,
  mergeProps,
  type PropType,
  type SlotsType,
  type VNodeChild,
} from "vue";

import {
  commonProps,
  controlledState,
  createColumnResolver,
  emitStateChanges,
  stateEmitValidators,
  expansionOptions,
  emitExpansionChanges,
  CellContent,
  editingEmits,
  editingOptions,
} from "./shared";

/** Slot props of `cell.<column id>` and `cell`. */
export interface CellSlotProps {
  readonly item: unknown;
  readonly row: TableRow<unknown>;
  readonly value: unknown;
  readonly display: string;
  readonly column: { readonly id: string; readonly header: string };
}

/**
 * What a `<VueyeTable>` exposes on its template ref: the table binding, with every snapshot field
 * and operation. `useTemplateRef<VueyeTableExposed>("table")` reads it typed.
 */
export interface VueyeTableExposed {
  readonly table: DataTableBinding<unknown>;
}

/** Slot props of `status`, the "1–10 of 57 rows" line. */
export type StatusSlotProps = TableStatusSlotProps;

/**
 * Slot props of `header.<column id>`. The slot fills the header cell; on a sortable column it sits
 * inside the sort button, so the header still sorts on click and shows its indicator.
 */
export interface HeaderSlotProps {
  readonly column: { readonly id: string; readonly header: string };
  readonly sort: SortInfo | undefined;
  readonly toggleSort: (multi?: boolean) => void;
}

/**
 * A complete data table: search, column visibility, sorting, selection, pagination, a live
 * status line, loading and empty states, and theming. Every piece of state is available as a
 * `v-model`, and `manual` hands searching, sorting, and paging to a server.
 */
export const VueyeTable = defineComponent({
  name: "VueyeTable",
  inheritAttrs: false,
  props: {
    data: { type: Array as PropType<readonly unknown[]>, default: () => [] },
    ...commonProps,
    editMode: { type: String as PropType<"cell" | "row" | undefined>, default: undefined },
    /** `true` or `"multiple"` for checkboxes, `"single"` for one row at a time. */
    selectable: {
      type: [Boolean, String] as PropType<boolean | "single" | "multiple">,
      default: false,
    },
    selected: { type: Array as PropType<readonly RowKey[]>, default: undefined },
    /** The data is one page from a server; `rowCount` is the total. */
    /** Shown instead of the empty state while `loading` and there are no rows yet. */
    loadingText: { type: String as PropType<string | undefined>, default: undefined },
  },
  emits: {
    ...editingEmits,
    ...stateEmitValidators,
    "state-change": (_state: TableState) => true,
    "row-click": (_item: unknown, _row: TableRow<unknown>) => true,
    expand: (_item: unknown, _row: TableRow<unknown>) => true,
    collapse: (_item: unknown, _row: TableRow<unknown>) => true,
  },
  slots: Object as SlotsType<
    {
      [key: `cell.${string}`]: CellSlotProps;
      [key: `editor.${string}`]: CellEditorSlotProps;
      [key: `header.${string}`]: HeaderSlotProps;
    } & {
      toolbar: { table: unknown };
      empty: Record<string, never>;
      loading: Record<string, never>;
      footer: { table: unknown };
      status: StatusSlotProps;
      expanded: DetailSlotProps;
    }
  >,
  setup(props, { emit, slots, expose, attrs }) {
    const inherited = useTableLocale();
    const locale = provideTableLocale(() => ({ locale: props.locale, messages: props.messages }));
    const loadingText = (): string => props.loadingText ?? locale().messages.loading;
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
      ...expansionOptions(props, !!slots.expanded),
      ...editingOptions(props),
      data: () => props.data,
      source: computed(() => props.source),
      loadMore: computed(() => props.loadMore),
      endThreshold: props.endThreshold,
      columns: () => resolveColumns(props.columns, props.data) as readonly ColumnDef<unknown>[],
      rowKey: props.rowKey as never,
      locale: props.locale ?? inherited().locale,
      normalizeText: props.normalizeText,
      manual: props.manual,
      paginate: props.paginate ?? !(props.virtual || props.source || props.loadMore),
      rowCount: () => props.rowCount,
      selectionMode: selectionMode.value,
      selectScope: props.selectScope,
      initialState: { pagination: initialPagination },
      onDataChange(data, changes) {
        emit("update:data", data);
        emit("edit", changes);
      },
      onEditIssues(issues) {
        emit("edit-issues", issues);
        emit("edit-error", issues);
      },
      state: () =>
        controlledState(props, binding?.table.getState().pagination ?? initialPagination),
      onStateChange(state, previous) {
        emitStateChanges(emit as never, state, previous);
        emitExpansionChanges(emit, state, previous, binding?.table.getSnapshot());
        emit("state-change", state);
      },
    });
    binding = table;
    provideDataTable(table);
    expose({ table } satisfies VueyeTableExposed);
    const busy = (): boolean =>
      props.loading || table.loadState === "loading" || table.loadState === "streaming";

    const selectable = (): boolean => selectionMode.value !== "none";

    const cell = (
      row: TableRow<unknown>,
      column: (typeof table.columns)[number],
      rowIndex: number,
    ): VNodeChild => {
      const slot = slots[`cell.${column.id}`];
      const treeCell = table.tree && column.id === resolveTreeColumn(table, props.treeColumn);
      return h(
        props.editMode ? DataTableEditCell : DataTableCell,
        {
          key: column.id,
          row,
          column,
          tree: false,
          ...(props.editMode
            ? {
                rowIndex,
                onSave: (result: EditResult<unknown>) => emit("save", result),
                onCancel: (key: RowKey) => emit("cancel", key),
              }
            : {}),
        },
        {
          editor: slots[`editor.${column.id}`],
          default: ({ value, display }: { value: unknown; display: string }) => {
            const content = () =>
              slot ? h(CellContent, { row, column, value, display, render: slot }) : display;
            return treeCell ? h(VtTreeCell, { row }, { default: content }) : content();
          },
          $stable: true,
        },
      );
    };

    const hasDetails = (): boolean => !!slots.expanded && !table.tree;
    const hasActions = (): boolean => !!props.editMode || props.removeRows;
    const leadingColumns = (): number =>
      Number(hasActions()) + Number(hasDetails()) + Number(selectable());
    const width = (): number =>
      table.columns.length +
      (selectable() ? 1 : 0) +
      (hasDetails() ? 1 : 0) +
      (hasActions() ? 1 : 0);
    const emptyBody = (): VNodeChild => {
      if (table.rows.length === 0) {
        // While the first page is loading there is nothing to match yet, so say that instead.
        const content = busy()
          ? (slots.loading?.({}) ?? h(VtEmpty, { text: loadingText() }))
          : (slots.empty?.({}) ??
            h(VtEmpty, {
              text:
                table.loadingMode && table.loadState === "error"
                  ? locale().messages.couldNotLoadRows
                  : locale().messages.noMatchingRows,
            }));
        return h("tr", { "data-empty": "" }, [h("td", { colspan: Math.max(1, width()) }, content)]);
      }
      return null;
    };
    const cells = (row: TableRow<unknown>, rowIndex: number): VNodeChild[] => {
      const result = [
        hasActions()
          ? h(
              "td",
              {
                class: "vt-row-controls",
                "aria-colindex": 1,
                onClick: (event: Event) => event.stopPropagation(),
              },
              [
                h(VtRowActions, {
                  row,
                  editable: props.editMode === "row",
                  removable: props.removeRows,
                }),
              ],
            )
          : null,
        hasDetails()
          ? h("td", { class: "vt-expansion-cell", "aria-colindex": Number(hasActions()) + 1 }, [
              h(VtExpandToggle, { row }),
            ])
          : null,
        selectable()
          ? h(
              "td",
              {
                class: "vt-selection-cell",
                "aria-colindex": Number(hasActions()) + Number(hasDetails()) + 1,
                onClick: (event: Event) => event.stopPropagation(),
              },
              [h(DataTableSelectRow, { row })],
            )
          : null,
        ...table.columns.map((column) => cell(row, column, rowIndex)),
      ];
      return result;
    };
    const bodyRow = ({ row, rowIndex }: DetailSlotProps): VNodeChild =>
      h(
        DataTableRow,
        { key: row.key, row, rowIndex, onClick: () => emit("row-click", row.original, row) },
        { default: () => cells(row, rowIndex), $stable: true },
      );

    const headerSlots = () => {
      return {
        header: (header: HeaderSlotProps) =>
          slots[`header.${header.column.id}`]?.(header) ?? header.column.header,
        before: () => [
          hasActions()
            ? h(
                "th",
                { class: "vt-row-controls", scope: "col", "aria-colindex": 1 },
                locale().messages.rowActions,
              )
            : null,
          hasDetails()
            ? h("th", {
                class: "vt-expansion-cell",
                scope: "col",
                "aria-colindex": Number(hasActions()) + 1,
                "aria-label": locale().messages.details,
              })
            : null,
          selectable()
            ? h(
                "th",
                {
                  class: "vt-selection-cell",
                  scope: "col",
                  "aria-colindex": Number(hasActions()) + Number(hasDetails()) + 1,
                },
                selectionMode.value === "multiple" ? [h(DataTableSelectAll)] : [],
              )
            : null,
        ],
      };
    };

    const tableContent = (): VNodeChild => {
      const children = () => [
        props.caption ? h(DataTableCaption, () => props.caption) : null,
        h(VtHeader, null, headerSlots()),
        h(
          DataTableBody,
          { class: "vt-body", colspan: width() },
          {
            ...(table.rows.length === 0 ? { default: emptyBody } : {}),
            row: bodyRow,
            detail: slots.expanded
              ? (detail: DetailSlotProps) => slots.expanded?.(detail)
              : undefined,
          },
        ),
      ];
      return props.virtual
        ? h(
            DataTableViewport,
            {
              class: "vt-scroll",
              height: props.height ?? "24rem",
              style: { "--vt-row-height": `${props.rowHeight}px` },
            },
            {
              default: () =>
                h(
                  DataTableRoot,
                  {
                    table,
                    class: "vt-table",
                    leadingColumns: leadingColumns(),
                    virtual: props.virtual,
                    rowHeight: props.rowHeight,
                    overscan: props.overscan,
                    treeColumn: props.treeColumn,
                    keepAliveDetail: props.keepAliveDetail,
                  },
                  children,
                ),
            },
          )
        : h("div", { class: "vt-scroll" }, [
            h(
              DataTableRoot,
              {
                table,
                treeColumn: props.treeColumn,
                keepAliveDetail: props.keepAliveDetail,
                class: "vt-table",
                leadingColumns: leadingColumns(),
                "aria-busy": busy() ? "true" : undefined,
              },
              children,
            ),
          ]);
    };

    const surface = () =>
      h(
        "div",
        mergeProps(attrs, {
          class: "vt-surface vueye-table",
          "data-density": props.density,
          "data-striped": props.striped ? "" : undefined,
          "data-bordered": props.bordered ? "" : undefined,
          "data-hover": props.hover ? "" : undefined,
          "data-sticky-header": props.stickyHeader || props.virtual ? "" : undefined,
          "data-virtual": props.virtual ? "" : undefined,
          "data-loading": busy() ? "" : undefined,
          "data-vt-theme": props.theme,
          "aria-busy": props.loading ? "true" : undefined,
          style: props.maxHeight ? { "--vt-max-height": props.maxHeight } : undefined,
        }),
        [
          h("div", { class: "vt-root" }, [
            props.searchable || props.columnToggle || slots.toolbar || props.addRow
              ? h(VtToolbar, () => [
                  props.searchable
                    ? h(VtSearch, {
                        placeholder: props.searchPlaceholder ?? locale().messages.searchPlaceholder,
                      })
                    : null,
                  props.addRow
                    ? h(
                        "button",
                        { type: "button", class: "vt-button", onClick: () => table.insertRows() },
                        locale().messages.addRow,
                      )
                    : null,
                  h("div", { class: "vt-toolbar-spacer" }),
                  slots.toolbar?.({ table }),
                  props.columnToggle ? h(VtColumnVisibility) : null,
                ])
              : null,
            h("div", { class: "vt-progress", role: "presentation" }),
            tableContent(),
            (props.pagination && (!props.virtual || table.paginate)) ||
            slots.footer ||
            slots.status ||
            table.tree ||
            table.loadingMode
              ? h(VtToolbar, { class: "vt-footer" }, () => [
                  h(
                    VtStatus,
                    null,
                    slots.status
                      ? { default: (status: StatusSlotProps) => slots.status?.(status) }
                      : props.loading && table.rows.length === 0
                        ? { default: () => loadingText() }
                        : undefined,
                  ),
                  ...(table.loadingMode ? [h(VtLoadMore)] : []),
                  slots.footer?.({ table }),
                  props.pagination && table.paginate && (!props.virtual || table.paginate)
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
    return () =>
      props.editMode
        ? h(
            DataTableEditRoot,
            {
              table,
              mode: props.editMode,
              onSave: (result) => emit("save", result),
              onCancel: (key) => emit("cancel", key),
            },
            surface,
          )
        : surface();
  },
});
