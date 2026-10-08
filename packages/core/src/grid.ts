/**
 * Spreadsheet addressing and selection.
 *
 * A cell is addressed by its position in what is shown: the row index on the current page and the
 * column index among visible columns. A selection is an anchor, where it started, and a focus,
 * where it is now; the rectangle between them is the selected range.
 */

export interface CellPosition {
  readonly row: number;
  readonly column: number;
}

export interface CellRange {
  readonly top: number;
  readonly left: number;
  readonly bottom: number;
  readonly right: number;
}

export interface GridSelection {
  readonly anchor: CellPosition;
  readonly focus: CellPosition;
}

/** The size of the addressable grid. */
export interface GridBounds {
  readonly rows: number;
  readonly columns: number;
}

export type GridDirection = "up" | "down" | "left" | "right";

export interface MoveOptions {
  /** Keep the anchor and move only the focus, growing or shrinking the range. */
  readonly extend?: boolean | undefined;
  /** Jump to the edge of the grid in that direction. */
  readonly toEdge?: boolean | undefined;
}

function clamp(value: number, max: number): number {
  return Math.min(Math.max(0, value), Math.max(0, max - 1));
}

export function clampPosition(position: CellPosition, bounds: GridBounds): CellPosition {
  return { row: clamp(position.row, bounds.rows), column: clamp(position.column, bounds.columns) };
}

/** A selection of one cell. */
export function selectCell(position: CellPosition): GridSelection {
  return { anchor: position, focus: position };
}

/** Move the focus one step, or to the edge, staying inside the bounds. */
export function moveSelection(
  selection: GridSelection,
  direction: GridDirection,
  bounds: GridBounds,
  options: MoveOptions = {},
): GridSelection {
  const { row, column } = selection.focus;
  const far = options.toEdge === true;
  const next: CellPosition = clampPosition(
    {
      row:
        direction === "up"
          ? far
            ? 0
            : row - 1
          : direction === "down"
            ? far
              ? bounds.rows - 1
              : row + 1
            : row,
      column:
        direction === "left"
          ? far
            ? 0
            : column - 1
          : direction === "right"
            ? far
              ? bounds.columns - 1
              : column + 1
            : column,
    },
    bounds,
  );
  return options.extend === true
    ? { anchor: selection.anchor, focus: next }
    : { anchor: next, focus: next };
}

/** The rectangle a selection covers. */
export function selectionRange(selection: GridSelection): CellRange {
  return {
    top: Math.min(selection.anchor.row, selection.focus.row),
    left: Math.min(selection.anchor.column, selection.focus.column),
    bottom: Math.max(selection.anchor.row, selection.focus.row),
    right: Math.max(selection.anchor.column, selection.focus.column),
  };
}

export function rangeContains(range: CellRange, position: CellPosition): boolean {
  return (
    position.row >= range.top &&
    position.row <= range.bottom &&
    position.column >= range.left &&
    position.column <= range.right
  );
}

/** `0` is `"A"`, `25` is `"Z"`, `26` is `"AA"`. */
export function columnLabel(index: number): string {
  let label = "";
  let rest = index + 1;
  while (rest > 0) {
    const remainder = (rest - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    rest = Math.floor((rest - 1) / 26);
  }
  return label;
}

/** `{ row: 2, column: 1 }` is `"B3"`. */
export function toA1(position: CellPosition): string {
  return `${columnLabel(position.column)}${position.row + 1}`;
}

/** `"B3"` is `{ row: 2, column: 1 }`. Returns `undefined` for anything else. */
export function fromA1(reference: string): CellPosition | undefined {
  const match = /^([A-Z]+)([1-9]\d*)$/u.exec(reference.trim().toUpperCase());
  if (!match?.[1] || !match[2]) {
    return undefined;
  }
  let column = 0;
  for (const char of match[1]) {
    column = column * 26 + (char.charCodeAt(0) - 64);
  }
  return { row: Number(match[2]) - 1, column: column - 1 };
}

/** The keys of a keyboard event that grid navigation reads. */
export interface GridKey {
  readonly key: string;
  readonly shiftKey?: boolean | undefined;
  readonly ctrlKey?: boolean | undefined;
  readonly metaKey?: boolean | undefined;
  readonly altKey?: boolean | undefined;
}

/** What a key press asks a grid to do while no cell is being edited. */
export type GridCommand =
  | {
      readonly type: "tree";
      readonly action: "expand" | "collapse" | "child" | "parent" | "siblings";
    }
  | { readonly type: "move"; readonly direction: GridDirection; readonly options: MoveOptions }
  | { readonly type: "edit"; readonly initial?: string | undefined }
  | { readonly type: "clear" }
  | { readonly type: "selectAll" }
  | { readonly type: "undo" }
  | { readonly type: "redo" }
  | { readonly type: "cancel" };

const ARROWS: Readonly<Record<string, GridDirection>> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

/**
 * Map a key press to a grid command, spreadsheet style: arrows move (Shift extends, Ctrl or Cmd
 * jumps to the edge), Tab moves across, Home and End reach the row's ends, Enter or F2 edit,
 * a printable character starts editing with that character, Delete and Backspace clear, Escape
 * collapses the selection, and Ctrl or Cmd with A, Z, Y select all, undo, and redo.
 */
/** Hierarchy navigation is enabled only at the caller's designated tree column. */
export interface GridTreeContext {
  readonly canExpand: boolean;
  readonly expanded: boolean;
}

export function gridCommand(event: GridKey, tree?: GridTreeContext): GridCommand | undefined {
  const mod = event.ctrlKey === true || event.metaKey === true;
  const shift = event.shiftKey === true;
  if (tree && !mod && !event.altKey) {
    if (event.key === "*") return { type: "tree", action: "siblings" };
    if (!shift && event.key === "ArrowRight" && tree.canExpand)
      return { type: "tree", action: tree.expanded ? "child" : "expand" };
    if (!shift && event.key === "ArrowLeft")
      return { type: "tree", action: tree.canExpand && tree.expanded ? "collapse" : "parent" };
  }
  const direction = ARROWS[event.key];
  if (direction) {
    return { type: "move", direction, options: { extend: shift, toEdge: mod } };
  }
  switch (event.key) {
    case "Tab":
      return { type: "move", direction: shift ? "left" : "right", options: {} };
    case "Home":
    case "End":
      return {
        type: "move",
        direction: event.key === "Home" ? "left" : "right",
        options: { extend: shift, toEdge: true },
      };
    case "Enter":
    case "F2":
      return { type: "edit" };
    case "Delete":
    case "Backspace":
      return { type: "clear" };
    case "Escape":
      return { type: "cancel" };
    default:
      break;
  }
  if (mod) {
    const key = event.key.toLowerCase();
    if (key === "a") {
      return { type: "selectAll" };
    }
    if (key === "z") {
      return shift ? { type: "redo" } : { type: "undo" };
    }
    if (key === "y") {
      return { type: "redo" };
    }
    return undefined;
  }
  if (event.key.length === 1 && event.altKey !== true) {
    return { type: "edit", initial: event.key };
  }
  return undefined;
}
