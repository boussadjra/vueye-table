import type { GridDirection, TableColumn, TableRow } from "@vueye-table/core";
import {
  injectDataGrid,
  injectDataTable,
  provideDataGrid,
  provideDataTable,
  useDataGrid,
  type DataGridBinding,
  type AnyDataTableBinding,
  type DataTableBinding,
} from "@vueye-table/vue";
import {
  defineComponent,
  h,
  inject,
  nextTick,
  onMounted,
  provide,
  ref,
  useId,
  watch,
  type InjectionKey,
  type PropType,
  type SlotsType,
  type VNode,
  type VNodeChild,
} from "vue";

import { asProp, columnProp, flag, rowProp } from "./shared";
import { columnStyle, DataTableHeader } from "./table";

interface GridContext {
  readonly id: string;
  /** Return keyboard focus to the grid, after an edit ends from the keyboard. */
  focus(): void;
}

const gridContextKey: InjectionKey<GridContext> = Symbol("vueye-table-grid-context");

function useGrid(consumer: string): { grid: DataGridBinding<unknown>; context: GridContext } {
  const grid = injectDataGrid();
  const context = inject(gridContextKey, undefined);
  if (!grid || !context) {
    throw new Error(`${consumer} must be rendered inside <DataGridRoot>.`);
  }
  return { grid, context };
}

export function cellId(gridId: string, row: number, column: number): string {
  return `${gridId}-r${row}-c${column}`;
}

/**
 * A spreadsheet grid over a table. The grid element keeps keyboard focus and points at the active
 * cell with `aria-activedescendant`; arrows, Tab, Home, End, Enter, F2, Delete, Escape, typing,
 * undo, redo, and clipboard copy, cut, and paste all work on the selected range.
 */
export const DataGridRoot = defineComponent({
  name: "DataGridRoot",
  slots: Object as SlotsType<{
    default?: (props: {
      table: DataTableBinding<unknown>;
      grid: DataGridBinding<unknown>;
    }) => VNode[];
  }>,
  props: {
    table: { type: Object as PropType<AnyDataTableBinding>, required: true },
    as: asProp("table"),
    label: { type: String as PropType<string | undefined>, default: undefined },
  },
  setup(props, { slots, expose }) {
    provideDataTable(props.table);
    const grid = useDataGrid(props.table);
    provideDataGrid(grid);
    const element = ref<HTMLElement>();
    const id = `vt-grid-${useId()}`;
    const focus = (): void => {
      void nextTick(() => element.value?.focus());
    };
    provide(gridContextKey, { id, focus });
    expose({ grid, focus });

    const onKeydown = (event: KeyboardEvent): void => {
      if (event.target !== element.value) {
        return;
      }
      if (grid.handleKey(event)) {
        event.preventDefault();
      }
    };
    const onCopy = (event: ClipboardEvent, cut = false): void => {
      if (grid.editor || !grid.range || !event.clipboardData) {
        return;
      }
      event.clipboardData.setData("text/plain", grid.copy());
      event.preventDefault();
      if (cut) {
        grid.clear();
      }
    };
    const onPaste = (event: ClipboardEvent): void => {
      const text = event.clipboardData?.getData("text/plain");
      if (grid.editor || text === undefined || text === "") {
        return;
      }
      event.preventDefault();
      grid.paste(text);
    };

    return () => {
      const focusPosition = grid.selection?.focus;
      return h(
        props.as,
        {
          ref: element,
          id,
          role: "grid",
          tabindex: 0,
          "aria-label": props.label,
          "aria-multiselectable": "true",
          "aria-rowcount": props.table.rows.length + 1,
          "aria-colcount": props.table.columns.length,
          "aria-activedescendant":
            focusPosition && !grid.editor
              ? cellId(id, focusPosition.row, focusPosition.column)
              : undefined,
          onKeydown,
          onCopy: (event: ClipboardEvent) => onCopy(event),
          onCut: (event: ClipboardEvent) => onCopy(event, true),
          onPaste,
        },
        slots.default?.({ table: props.table, grid }) ?? [h(DataTableHeader), h(DataGridBody)],
      );
    };
  },
});

/** Slot props of a grid cell's content, while it is not being edited. */
export interface GridCellSlotProps {
  readonly row: TableRow<unknown>;
  readonly column: TableColumn<unknown>;
  readonly value: unknown;
  readonly display: string;
  readonly editable: boolean;
}

/**
 * The grid body: a row of cells per row on the page. The `cell` slot draws the content of every
 * cell that is not being edited; the `rowHeader` slot adds a leading cell to each row.
 */
export const DataGridBody = defineComponent({
  name: "DataGridBody",
  slots: Object as SlotsType<{
    default?: (props: { rows: readonly TableRow<unknown>[] }) => VNode[];
    rowHeader?: (props: { row: TableRow<unknown>; index: number }) => VNode[];
    cell?: (props: GridCellSlotProps) => VNodeChild;
  }>,
  props: { as: asProp("tbody") },
  setup(props, { slots }) {
    const table = injectDataTable("<DataGridBody>");
    return () =>
      h(
        props.as,
        slots.default?.({ rows: table.rows }) ??
          table.rows.map((row, rowIndex) =>
            h(
              "tr",
              {
                key: row.key,
                role: "row",
                "aria-rowindex": rowIndex + 2,
                "data-key": String(row.key),
              },
              [
                slots.rowHeader?.({ row, index: rowIndex }),
                ...table.columns.map((column, columnIndex) =>
                  h(
                    DataGridCell,
                    { key: column.id, row, column, rowIndex, columnIndex },
                    slots.cell
                      ? { default: (cellProps: GridCellSlotProps) => slots.cell?.(cellProps) }
                      : undefined,
                  ),
                ),
              ],
            ),
          ),
      );
  },
});

/** The text box shown in a cell while it is edited. */
const DataGridEditor = defineComponent({
  name: "DataGridEditor",
  props: { label: { type: String, required: true } },
  setup(props) {
    const { grid, context } = useGrid("<DataGridEditor>");
    const input = ref<HTMLInputElement>();
    onMounted(() => {
      const element = input.value;
      if (element) {
        element.focus();
        element.setSelectionRange(element.value.length, element.value.length);
      }
    });
    const finish = (then?: "up" | "down" | "left" | "right"): void => {
      grid.commitEdit(then);
      context.focus();
    };
    return () =>
      h("input", {
        ref: input,
        value: grid.editor?.draft ?? "",
        "aria-label": props.label,
        "data-editor": "",
        onInput: (event: Event) => grid.updateDraft((event.target as HTMLInputElement).value),
        onBlur: () => {
          if (grid.editor) {
            grid.commitEdit();
          }
        },
        onKeydown: (event: KeyboardEvent) => {
          if (event.key === "Enter") {
            event.preventDefault();
            finish(event.shiftKey ? "up" : "down");
          } else if (event.key === "Tab") {
            event.preventDefault();
            finish(event.shiftKey ? "left" : "right");
          } else if (event.key === "Escape") {
            event.preventDefault();
            grid.cancelEdit();
            context.focus();
          }
        },
      });
  },
});

/**
 * A grid cell. A click selects it, Shift-click or dragging extends the range, and a double click
 * edits it. The `editor` slot replaces the default text box.
 */
export const DataGridCell = defineComponent({
  name: "DataGridCell",
  slots: Object as SlotsType<{
    default?: (props: GridCellSlotProps) => VNodeChild;
    editor?: (props: {
      draft: string;
      update: (draft: string) => void;
      commit: (then?: GridDirection) => unknown;
      cancel: () => void;
    }) => VNode[];
  }>,
  props: {
    row: rowProp,
    column: columnProp,
    as: asProp("td"),
    /** The row's position on the page. Found by searching the rows when left out. */
    rowIndex: { type: Number as PropType<number | undefined>, default: undefined },
    /** The column's position among the visible columns. Found by searching when left out. */
    columnIndex: { type: Number as PropType<number | undefined>, default: undefined },
  },
  setup(props, { slots }) {
    const table = injectDataTable("<DataGridCell>");
    const { grid, context } = useGrid("<DataGridCell>");
    const element = ref<HTMLElement>();
    const position = () => ({
      row: props.rowIndex ?? table.rows.indexOf(props.row),
      column: props.columnIndex ?? table.columns.indexOf(props.column),
    });

    watch(
      () => grid.isFocused(position()),
      (focused) => {
        if (focused) {
          element.value?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
        }
      },
    );

    return () => {
      const at = position();
      const { row, column } = props;
      const editing = grid.isEditing(at);
      const editable = column.isEditable(row.original);
      const value = row.getValue(column.id);
      const display = row.getDisplay(column.id);
      let content;
      if (editing) {
        content =
          slots.editor?.({
            draft: grid.editor?.draft ?? "",
            update: (draft: string) => grid.updateDraft(draft),
            commit: (then?: GridDirection) => grid.commitEdit(then),
            cancel: () => grid.cancelEdit(),
          }) ?? h(DataGridEditor, { label: `Edit ${column.header}` });
      } else {
        content = slots.default?.({ row, column, value, display, editable }) ?? display;
      }
      return h(
        props.as,
        {
          ref: element,
          id: cellId(context.id, at.row, at.column),
          role: "gridcell",
          "aria-selected": String(grid.isSelected(at)),
          "aria-readonly": editable ? undefined : "true",
          "aria-colindex": at.column + 1,
          "data-column": column.id,
          "data-align": column.align,
          "data-focused": flag(grid.isFocused(at)),
          "data-selected": flag(grid.isSelected(at)),
          "data-editing": flag(editing),
          "data-readonly": flag(!editable),
          style: columnStyle(column),
          onMousedown: (event: MouseEvent) => {
            if (editing || event.button !== 0) {
              return;
            }
            grid.focusCell(at, { extend: event.shiftKey });
            context.focus();
          },
          onMouseenter: (event: MouseEvent) => {
            if (event.buttons === 1 && !grid.editor) {
              grid.focusCell(at, { extend: true });
            }
          },
          onDblclick: () => {
            grid.focusCell(at);
            grid.startEdit();
          },
        },
        content,
      );
    };
  },
});
