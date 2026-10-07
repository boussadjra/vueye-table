import {
  clampPosition,
  gridCommand,
  moveSelection,
  rangeContains,
  selectCell,
  selectionRange,
  type CellPosition,
  type CellRange,
  type CopyOptions,
  type EditResult,
  type GridBounds,
  type GridDirection,
  type GridKey,
  type GridSelection,
  type MoveOptions,
  type TableColumn,
  type TableRow,
} from "@vueye-table/core";
import { computed, shallowRef, watch, type ComputedRef } from "vue";

import type { DataTableBinding } from "./use-data-table";

/** The cell being edited and the text typed so far. */
export interface GridEditor {
  readonly position: CellPosition;
  readonly draft: string;
}

/**
 * Spreadsheet interaction over a table: a selected range, keyboard navigation, in-cell editing,
 * copy, paste, and clearing. Positions refer to the current page and the visible columns.
 */
export interface DataGridBinding<TRow> {
  readonly selection: GridSelection | undefined;
  readonly range: CellRange | undefined;
  readonly editor: GridEditor | undefined;
  readonly bounds: ComputedRef<GridBounds>;
  /** The latest edit outcome, to show a rejected value. */
  readonly lastResult: EditResult<TRow> | undefined;
  cellAt(position: CellPosition): { row: TableRow<TRow>; column: TableColumn<TRow> } | undefined;
  isFocused(position: CellPosition): boolean;
  isSelected(position: CellPosition): boolean;
  isEditing(position: CellPosition): boolean;
  focusCell(position: CellPosition, options?: { readonly extend?: boolean | undefined }): void;
  move(direction: GridDirection, options?: MoveOptions): void;
  selectAll(): void;
  /** Start editing the focused cell, with its current text or with `initial`. */
  startEdit(initial?: string): boolean;
  updateDraft(draft: string): void;
  /** Write the draft through the table, then move the focus if asked. */
  commitEdit(then?: GridDirection): EditResult<TRow> | undefined;
  cancelEdit(): void;
  /** The selected range as tab-separated text. */
  copy(options?: CopyOptions): string;
  /** Paste tab-separated text at the top-left of the selection. */
  paste(text: string): EditResult<TRow> | undefined;
  clear(): EditResult<TRow> | undefined;
  /** Handle a key press. Returns `true` when the grid used it, so the caller can prevent the default. */
  handleKey(event: GridKey): boolean;
}

export function useDataGrid<TRow>(table: DataTableBinding<TRow>): DataGridBinding<TRow> {
  const selection = shallowRef<GridSelection | undefined>();
  const editor = shallowRef<GridEditor | undefined>();
  const lastResult = shallowRef<EditResult<TRow> | undefined>();
  const bounds = computed<GridBounds>(() => ({
    rows: table.rows.length,
    columns: table.columns.length,
  }));
  const range = computed(() => (selection.value ? selectionRange(selection.value) : undefined));

  const same = (left: CellPosition | undefined, right: CellPosition): boolean =>
    left !== undefined && left.row === right.row && left.column === right.column;

  // Searching, filtering, paging, or hiding a column can shrink the grid under the selection.
  // Keep the selection on cells that exist, and drop an edit whose cell is gone.
  watch(bounds, (next) => {
    const current = selection.value;
    if (current && (next.rows === 0 || next.columns === 0)) {
      selection.value = undefined;
    } else if (current) {
      const anchor = clampPosition(current.anchor, next);
      const focus = clampPosition(current.focus, next);
      if (!same(current.anchor, anchor) || !same(current.focus, focus)) {
        selection.value = { anchor, focus };
      }
    }
    const position = editor.value?.position;
    if (position && (position.row >= next.rows || position.column >= next.columns)) {
      editor.value = undefined;
    }
  });

  const cellAt: DataGridBinding<TRow>["cellAt"] = (position) => {
    const row = table.rows[position.row];
    const column = table.columns[position.column];
    return row && column ? { row, column } : undefined;
  };

  const ensureSelection = (): GridSelection | undefined => {
    if (bounds.value.rows === 0 || bounds.value.columns === 0) {
      return undefined;
    }
    selection.value ??= selectCell({ row: 0, column: 0 });
    return selection.value;
  };

  const grid: DataGridBinding<TRow> = {
    get selection() {
      return selection.value;
    },
    get range() {
      return range.value;
    },
    get editor() {
      return editor.value;
    },
    get lastResult() {
      return lastResult.value;
    },
    bounds,
    cellAt,
    isFocused: (position) => same(selection.value?.focus, position),
    isSelected: (position) => (range.value ? rangeContains(range.value, position) : false),
    isEditing: (position) => same(editor.value?.position, position),
    focusCell(position, { extend = false } = {}) {
      const target = clampPosition(position, bounds.value);
      if (editor.value && !same(editor.value.position, target)) {
        grid.commitEdit();
      }
      selection.value =
        extend && selection.value
          ? { anchor: selection.value.anchor, focus: target }
          : selectCell(target);
    },
    move(direction, options) {
      const current = ensureSelection();
      if (current) {
        selection.value = moveSelection(current, direction, bounds.value, options);
      }
    },
    selectAll() {
      if (bounds.value.rows > 0 && bounds.value.columns > 0) {
        selection.value = {
          anchor: { row: 0, column: 0 },
          focus: { row: bounds.value.rows - 1, column: bounds.value.columns - 1 },
        };
      }
    },
    startEdit(initial) {
      const focus = ensureSelection()?.focus;
      const cell = focus ? cellAt(focus) : undefined;
      if (!focus || !cell || !cell.column.isEditable(cell.row.original)) {
        return false;
      }
      editor.value = { position: focus, draft: initial ?? cell.row.getDisplay(cell.column.id) };
      return true;
    },
    updateDraft(draft) {
      if (editor.value) {
        editor.value = { position: editor.value.position, draft };
      }
    },
    commitEdit(then) {
      const current = editor.value;
      if (!current) {
        return undefined;
      }
      const cell = cellAt(current.position);
      editor.value = undefined;
      if (!cell) {
        return undefined;
      }
      const result = table.edit({
        rowKey: cell.row.key,
        column: cell.column.id,
        input: current.draft,
      });
      lastResult.value = result;
      if (then) {
        grid.move(then);
      }
      return result;
    },
    cancelEdit() {
      editor.value = undefined;
    },
    copy(options) {
      return range.value ? table.copy(range.value, options) : "";
    },
    paste(text) {
      if (!range.value) {
        return undefined;
      }
      const result = table.paste({ row: range.value.top, column: range.value.left }, text);
      lastResult.value = result;
      return result;
    },
    clear() {
      if (!range.value) {
        return undefined;
      }
      const result = table.clear(range.value);
      lastResult.value = result;
      return result;
    },
    handleKey(event) {
      if (editor.value) {
        return false;
      }
      const command = gridCommand(event);
      switch (command?.type) {
        case "move":
          grid.move(command.direction, command.options);
          return true;
        case "edit":
          return grid.startEdit(command.initial);
        case "clear":
          grid.clear();
          return true;
        case "selectAll":
          grid.selectAll();
          return true;
        case "undo":
          return table.undo();
        case "redo":
          return table.redo();
        case "cancel":
          if (selection.value) {
            selection.value = selectCell(selection.value.focus);
          }
          return true;
        default:
          return false;
      }
    },
  };
  return grid;
}
