import {
  clampPosition,
  columnLabel,
  createUndoStack,
  fromA1,
  gridCommand,
  moveSelection,
  parseDelimited,
  rangeContains,
  selectCell,
  selectionRange,
  toA1,
  toDelimited,
} from "@vueye-table/core";
import { describe, expect, it } from "vitest";

const bounds = { rows: 4, columns: 3 };

describe("grid selection", () => {
  it("moves, extends, and jumps inside the bounds", () => {
    let selection = selectCell({ row: 0, column: 0 });
    selection = moveSelection(selection, "down", bounds);
    selection = moveSelection(selection, "right", bounds, { extend: true });
    expect(selection).toEqual({ anchor: { row: 1, column: 0 }, focus: { row: 1, column: 1 } });
    selection = moveSelection(selection, "down", bounds, { extend: true, toEdge: true });
    expect(selectionRange(selection)).toEqual({ top: 1, left: 0, bottom: 3, right: 1 });
    selection = moveSelection(selection, "up", bounds, { toEdge: true });
    expect(selection.focus).toEqual({ row: 0, column: 1 });
    selection = moveSelection(selection, "left", bounds, { toEdge: true });
    selection = moveSelection(selection, "left", bounds);
    expect(selection.focus).toEqual({ row: 0, column: 0 });
    selection = moveSelection(selection, "right", bounds, { toEdge: true });
    expect(selection.focus).toEqual({ row: 0, column: 2 });
    selection = moveSelection(selection, "up", bounds);
    expect(selection.focus).toEqual({ row: 0, column: 2 });
  });

  it("clamps into the grid and tests containment", () => {
    expect(clampPosition({ row: 10, column: -2 }, bounds)).toEqual({ row: 3, column: 0 });
    expect(clampPosition({ row: 1, column: 1 }, { rows: 0, columns: 0 })).toEqual({
      row: 0,
      column: 0,
    });
    const range = { top: 1, left: 1, bottom: 2, right: 2 };
    expect(rangeContains(range, { row: 2, column: 1 })).toBe(true);
    expect(rangeContains(range, { row: 0, column: 1 })).toBe(false);
  });

  it("names cells like a spreadsheet", () => {
    expect(columnLabel(0)).toBe("A");
    expect(columnLabel(25)).toBe("Z");
    expect(columnLabel(26)).toBe("AA");
    expect(columnLabel(701)).toBe("ZZ");
    expect(toA1({ row: 2, column: 1 })).toBe("B3");
    expect(fromA1("b3")).toEqual({ row: 2, column: 1 });
    expect(fromA1("AA10")).toEqual({ row: 9, column: 26 });
    expect(fromA1("A0")).toBeUndefined();
    expect(fromA1("3B")).toBeUndefined();
  });
});

describe("gridCommand", () => {
  it("maps hierarchy keys only in an explicitly supplied tree context", () => {
    expect(gridCommand({ key: "ArrowRight" }, { canExpand: true, expanded: false })).toEqual({
      type: "tree",
      action: "expand",
    });
    expect(gridCommand({ key: "ArrowRight" }, { canExpand: true, expanded: true })).toEqual({
      type: "tree",
      action: "child",
    });
    expect(gridCommand({ key: "ArrowLeft" }, { canExpand: true, expanded: true })).toEqual({
      type: "tree",
      action: "collapse",
    });
    expect(gridCommand({ key: "ArrowLeft" }, { canExpand: false, expanded: false })).toEqual({
      type: "tree",
      action: "parent",
    });
    expect(gridCommand({ key: "*", shiftKey: true }, { canExpand: true, expanded: false })).toEqual(
      { type: "tree", action: "siblings" },
    );
    expect(
      gridCommand({ key: "ArrowRight", shiftKey: true }, { canExpand: true, expanded: false }),
    ).toMatchObject({ type: "move", options: { extend: true } });
    expect(
      gridCommand({ key: "ArrowLeft", ctrlKey: true }, { canExpand: true, expanded: false }),
    ).toMatchObject({ type: "move", options: { toEdge: true } });
    expect(gridCommand({ key: "ArrowRight" }, { canExpand: false, expanded: false })).toMatchObject(
      { type: "move" },
    );
  });
  it("maps keys spreadsheet style", () => {
    expect(gridCommand({ key: "ArrowDown", shiftKey: true })).toEqual({
      type: "move",
      direction: "down",
      options: { extend: true, toEdge: false },
    });
    expect(gridCommand({ key: "ArrowLeft", metaKey: true })).toMatchObject({
      options: { toEdge: true },
    });
    expect(gridCommand({ key: "Tab", shiftKey: true })).toMatchObject({ direction: "left" });
    expect(gridCommand({ key: "Tab" })).toMatchObject({ direction: "right" });
    expect(gridCommand({ key: "Home" })).toMatchObject({
      direction: "left",
      options: { toEdge: true },
    });
    expect(gridCommand({ key: "End", shiftKey: true })).toMatchObject({
      direction: "right",
      options: { extend: true },
    });
    expect(gridCommand({ key: "Enter" })).toEqual({ type: "edit" });
    expect(gridCommand({ key: "F2" })).toEqual({ type: "edit" });
    expect(gridCommand({ key: "x" })).toEqual({ type: "edit", initial: "x" });
    expect(gridCommand({ key: "x", altKey: true })).toBeUndefined();
    expect(gridCommand({ key: "Delete" })).toEqual({ type: "clear" });
    expect(gridCommand({ key: "Backspace" })).toEqual({ type: "clear" });
    expect(gridCommand({ key: "Escape" })).toEqual({ type: "cancel" });
    expect(gridCommand({ key: "a", ctrlKey: true })).toEqual({ type: "selectAll" });
    expect(gridCommand({ key: "z", ctrlKey: true })).toEqual({ type: "undo" });
    expect(gridCommand({ key: "Z", metaKey: true, shiftKey: true })).toEqual({ type: "redo" });
    expect(gridCommand({ key: "y", ctrlKey: true })).toEqual({ type: "redo" });
    expect(gridCommand({ key: "c", ctrlKey: true })).toBeUndefined();
    expect(gridCommand({ key: "Shift" })).toBeUndefined();
  });
});

describe("delimited text", () => {
  it("round-trips quotes, delimiters, and line breaks", () => {
    const matrix = [
      ["plain", 'say "hi"', "a\tb"],
      ["line\nbreak", "", "x"],
    ];
    const text = toDelimited(matrix);
    expect(text).toBe('plain\t"say ""hi"""\t"a\tb"\n"line\nbreak"\t\tx');
    expect(parseDelimited(text)).toEqual(matrix);
  });

  it("reads CRLF, CSV, and a trailing line break", () => {
    expect(parseDelimited("a,b\r\nc,d\r\n", ",")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
    expect(parseDelimited("")).toEqual([]);
    expect(parseDelimited("a\t")).toEqual([["a", ""]]);
    expect(toDelimited([["1,5", "x"]], ",")).toBe('"1,5",x');
  });
});

describe("createUndoStack", () => {
  it("drops the oldest entries past its limit", () => {
    const undoStack = createUndoStack<number>(2);
    undoStack.record(1);
    undoStack.record(2);
    undoStack.record(3);
    expect(undoStack.undo()).toBe(3);
    expect(undoStack.undo()).toBe(2);
    expect(undoStack.undo()).toBeUndefined();
    expect(undoStack.redo()).toBe(2);
    undoStack.clear();
    expect(undoStack.canUndo).toBe(false);
    expect(undoStack.canRedo).toBe(false);
    expect(undoStack.redo()).toBeUndefined();
  });
});
