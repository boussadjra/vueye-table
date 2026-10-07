import {
  clampPosition,
  gridCommand,
  moveSelection,
  rangeContains,
  selectCell,
  selectionRange,
  typeOf,
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
  type EditorSpec,
  type RowKey,
} from "@vueye-table/core";
import { computed, shallowRef, watch, type ComputedRef } from "vue";

import { rejectedDraft } from "./row-draft";
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
  readonly table: DataTableBinding<TRow>;
  readonly selection: GridSelection | undefined;
  readonly range: CellRange | undefined;
  readonly editor: GridEditor | undefined;
  readonly bounds: ComputedRef<GridBounds>;
  /** The latest edit outcome, to show a rejected value. */
  readonly lastResult: EditResult<TRow> | undefined;
  /** Serializable editor metadata for an editable cell; no component resolution. */
  editorFor(position: CellPosition): EditorSpec | undefined;
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
  let editing:
    | { readonly key: RowKey; readonly column: TableColumn<TRow>; readonly original: TRow }
    | undefined;
  let resultToken: object | undefined;
  const record = (result: EditResult<TRow>): EditResult<TRow> => {
    const token = {};
    resultToken = token;
    lastResult.value = result;
    void result.completion?.then((final) => {
      if (resultToken === token) lastResult.value = final;
      return undefined;
    });
    return result;
  };
  const bounds = computed<GridBounds>(() => ({
    rows: table.rows.length,
    columns: table.columns.length,
  }));
  const range = computed(() => (selection.value ? selectionRange(selection.value) : undefined));

  const same = (left: CellPosition | undefined, right: CellPosition): boolean =>
    left !== undefined && left.row === right.row && left.column === right.column;

  // Searching, filtering, paging, or hiding a column can shrink the grid under the selection.
  // Keep the selection on cells that exist, and drop an edit whose cell is gone.
  watch(
    () => table.snapshot,
    () => {
      const next = bounds.value;
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
      const active = editing;
      if (active && editor.value) {
        const row = table.rows.findIndex((candidate) => candidate.key === active.key);
        const column = table.columns.findIndex((candidate) => candidate.id === active.column.id);
        if (
          row < 0 ||
          column < 0 ||
          table.getRow(active.key)?.original !== active.original ||
          table.getColumn(active.column.id)?.definition !== active.column.definition
        ) {
          editor.value = undefined;
          editing = undefined;
          record(
            rejectedDraft(
              active.key,
              "The edited cell changed or left the visible grid. Start a new edit.",
            ),
          );
        } else if (!same(editor.value.position, { row, column })) {
          editor.value = { ...editor.value, position: { row, column } };
          selection.value = selectCell({ row, column });
        }
      }
    },
    { flush: "sync" },
  );

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
    table,
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
    editorFor(position) {
      const cell = cellAt(position);
      if (!cell || !cell.column.isEditable(cell.row.original)) return undefined;
      const spec = cell.column.definition.editor;
      if (
        spec &&
        ["text", "number", "select", "checkbox", "date"].includes(spec.kind) &&
        (spec.options === undefined ||
          (Array.isArray(spec.options) &&
            spec.options.every(
              (value) => value === null || ["string", "number", "boolean"].includes(typeof value),
            )))
      ) {
        return Object.freeze({
          kind: spec.kind,
          ...(spec.options ? { options: Object.freeze([...spec.options]) } : {}),
          ...(spec.min !== undefined ? { min: spec.min } : {}),
          ...(spec.max !== undefined ? { max: spec.max } : {}),
          ...(spec.maxLength !== undefined ? { maxLength: spec.maxLength } : {}),
          ...(spec.pattern !== undefined ? { pattern: spec.pattern } : {}),
        });
      }
      if (spec) {
        record(
          Object.freeze({
            status: "rejected",
            changes: Object.freeze([]),
            rowChanges: Object.freeze([]),
            pendingCells: Object.freeze([]),
            issues: Object.freeze([
              Object.freeze({
                code: "invalid_value",
                rowKey: cell.row.key,
                column: cell.column.id,
                message: "Invalid editor metadata; text metadata is used.",
              }),
            ]),
          }),
        );
        return Object.freeze({ kind: "text" });
      }
      const type =
        cell.column.definition.type ?? typeOf(cell.row.getValue(cell.column.id)) ?? "text";
      return Object.freeze({ kind: type === "boolean" ? "checkbox" : type });
    },
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
      editing = { key: cell.row.key, column: cell.column, original: cell.row.original };
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
      const active = editing;
      editor.value = undefined;
      editing = undefined;
      if (!active) {
        return undefined;
      }
      const result = record(
        table.edit(
          {
            rowKey: active.key,
            column: active.column.id,
            input: current.draft,
          },
          { expectedRows: new Map([[active.key, active.original]]) },
        ),
      );
      if (then) {
        grid.move(then);
      }
      return result;
    },
    cancelEdit() {
      editor.value = undefined;
      editing = undefined;
    },
    copy(options) {
      return range.value ? table.copy(range.value, options) : "";
    },
    paste(text) {
      if (!range.value) {
        return undefined;
      }
      const result = record(table.paste({ row: range.value.top, column: range.value.left }, text));
      return result;
    },
    clear() {
      if (!range.value) {
        return undefined;
      }
      const result = record(table.clear(range.value));
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
