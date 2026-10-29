import { createTable, type ColumnDef, type TableState } from "@vueye-table/core";
import { describe, expect, it, vi } from "vitest";

const data = Array.from({ length: 8 }, (_, id) => ({
  id,
  a: `A${id}`,
  b: `B${id}`,
  c: `C${id}`,
  d: `D${id}`,
  e: `E${id}`,
  f: `F${id}`,
}));
type Row = (typeof data)[number];
const columns: readonly ColumnDef<Row>[] = [
  { id: "a", width: 100, editable: true },
  { id: "b", width: 80, minWidth: 40, maxWidth: 200, editable: true },
  { id: "c", width: 120, editable: true },
  { id: "d", width: 140, editable: true },
  { id: "e", width: 60, editable: true },
  { id: "f", width: 90, editable: true },
];
function pinnedTable(options: Partial<Parameters<typeof createTable<Row>>[0]> = {}) {
  return createTable<Row>({ data, columns, rowKey: "id", ...options });
}
const ids = (table: ReturnType<typeof pinnedTable>) =>
  table.getSnapshot().columns.map((column) => column.id);

describe("column pinning", () => {
  it("defaults to empty regions and seeds pins from definitions unless state overrides them", () => {
    const ordinary = pinnedTable();
    expect(ordinary.getState().columnPinning).toEqual({ start: [], end: [] });
    expect(ordinary.getSnapshot()).toMatchObject({ pinnedStartWidth: 0, pinnedEndWidth: 0 });
    expect(ordinary.getSnapshot().getColumn("a")).toMatchObject({
      pinned: undefined,
      pinnable: true,
      pinOffset: 0,
      isPinnedEdge: false,
    });
    const definitions: readonly ColumnDef<Row>[] = [
      { id: "a", width: 100, pinned: "end" },
      { id: "b", width: 80, pinned: "start" },
    ];
    const table = pinnedTable({ columns: definitions });
    expect(ids(table)).toEqual(["b", "a"]);
    table.pinColumn("b", false);
    table.reset();
    expect(table.getState().columnPinning).toEqual({ start: ["b"], end: ["a"] });
    expect(
      pinnedTable({ columns: definitions, initialState: { columnPinning: { start: [], end: [] } } })
        .getSnapshot()
        .columns.map((column) => column.id),
    ).toEqual(["a", "b"]);
  });

  it("has one display order and measures end offsets from the logical outer edge", () => {
    const table = pinnedTable({
      initialState: {
        columnPinning: { start: ["b", "a"], end: ["e", "f"] },
        columnOrder: ["f", "d", "c", "a", "b", "e"],
      },
    });
    const snapshot = table.getSnapshot();
    expect(ids(table)).toEqual(["b", "a", "d", "c", "e", "f"]);
    expect(
      snapshot.columns.map((column) => [
        column.id,
        column.pinned,
        column.pinOffset,
        column.isPinnedEdge,
      ]),
    ).toEqual([
      ["b", "start", 0, false],
      ["a", "start", 80, true],
      ["d", undefined, 0, false],
      ["c", undefined, 0, false],
      ["e", "end", 90, true],
      ["f", "end", 0, false],
    ]);
    expect(snapshot).toMatchObject({ pinnedStartWidth: 180, pinnedEndWidth: 150 });
    expect(snapshot.getColumn("a")).toBe(snapshot.columns[1]);
    expect(snapshot.allColumns).toEqual(snapshot.columns);
    expect(Object.isFrozen(snapshot.columns)).toBe(true);
  });

  it("excludes hidden pins from offsets, totals and shadows while retaining their pin", () => {
    const table = pinnedTable({
      initialState: { columnPinning: { start: ["b", "a"], end: ["e", "f"] } },
    });
    table.toggleColumn("a", false);
    table.toggleColumn("f", false);
    expect(ids(table)).toEqual(["b", "c", "d", "e"]);
    expect(table.getSnapshot()).toMatchObject({ pinnedStartWidth: 80, pinnedEndWidth: 60 });
    expect(table.getSnapshot().getColumn("a")).toMatchObject({
      pinned: "start",
      pinOffset: 0,
      isPinnedEdge: false,
    });
    expect(table.getSnapshot().getColumn("b")?.isPinnedEdge).toBe(true);
    expect(table.getSnapshot().getColumn("e")).toMatchObject({ pinOffset: 0, isPinnedEdge: true });
    table.resizeColumn("f", 180);
    table.toggleColumn("f", true);
    expect(table.getSnapshot().getColumn("e")?.pinOffset).toBe(180);
    expect(table.getSnapshot().pinnedEndWidth).toBe(240);
  });

  it("uses effective resized widths, clamps, resets, and follows changed definitions", () => {
    const table = pinnedTable({
      initialState: { columnPinning: { start: ["b", "a"], end: ["e", "f"] } },
    });
    table.resizeColumn("b", 999);
    expect(table.getSnapshot().getColumn("a")?.pinOffset).toBe(200);
    table.resetColumnSize("b");
    expect(table.getSnapshot().getColumn("a")?.pinOffset).toBe(80);
    table.setState({ columnSizing: { f: 170 } });
    expect(table.getSnapshot().getColumn("e")?.pinOffset).toBe(170);
    table.setColumns(
      columns.map((column) => (column.id === "b" ? { ...column, width: 110 } : column)),
    );
    expect(table.getSnapshot().getColumn("a")?.pinOffset).toBe(110);
  });

  it("pins, changes sides and unpins without mutating caller-owned state or emitting no-ops", () => {
    const onStateChange = vi.fn<(state: TableState) => void>();
    const initial = { start: ["b"], end: ["f"] };
    const table = pinnedTable({ initialState: { columnPinning: initial }, onStateChange });
    const before = table.getSnapshot();
    table.pinColumn("b", "start");
    expect(table.getSnapshot()).toBe(before);
    const state = table.getState();
    table.setState({ columnPinning: { start: ["b"], end: ["f"] } });
    expect(table.getState()).toBe(state);
    table.pinColumn("a", "start");
    table.pinColumn("b", "end");
    expect(table.getState().columnPinning).toEqual({ start: ["a"], end: ["f", "b"] });
    table.pinColumn("a", false);
    expect(onStateChange).toHaveBeenCalledTimes(3);
    expect(initial).toEqual({ start: ["b"], end: ["f"] });
    expect(Object.isFrozen(initial.start)).toBe(false);
    expect(Object.isFrozen(table.getState().columnPinning)).toBe(true);
    expect(Object.isFrozen(table.getState().columnPinning.end)).toBe(true);
    table.setState({ columnPinning: { start: ["c"], end: [] } });
    expect(onStateChange).toHaveBeenCalledTimes(3);
    expect(JSON.parse(JSON.stringify(table.getState())).columnPinning).toEqual({
      start: ["c"],
      end: [],
    });
  });

  it("moves only inside the current region, using all-column display indices", () => {
    const table = pinnedTable({
      initialState: { columnPinning: { start: ["a", "b"], end: ["e", "f"] } },
    });
    table.moveColumn("a", 1);
    expect(table.getState().columnPinning.start).toEqual(["b", "a"]);
    table.moveColumn("d", 0);
    expect(ids(table)).toEqual(["b", "a", "d", "c", "e", "f"]);
    table.moveColumn("f", 0);
    expect(table.getState().columnPinning.end).toEqual(["f", "e"]);
    table.moveColumn("b", 99);
    expect(table.getState().columnPinning.start).toEqual(["a", "b"]);
    const state = table.getState();
    table.moveColumn("a", 0);
    table.moveColumn("missing", 0);
    table.moveColumn("a", Number.NaN);
    expect(table.getState()).toBe(state);
    expect(ids(table)).toEqual(["a", "b", "d", "c", "f", "e"]);
  });

  it("reports unknown, duplicate, conflicting and forbidden pins without rewriting host state", () => {
    const pinning = { start: ["a", "a", "b", "missing", "c"], end: ["b", "f"] };
    const table = pinnedTable({
      columns: columns.map((column) =>
        column.id === "c" ? { ...column, pinnable: false } : column,
      ),
      initialState: { columnPinning: pinning },
    });
    const snapshot = table.getSnapshot();
    expect(snapshot.issues.map((problem) => [problem.code, problem.column])).toEqual([
      ["unknown_column", "missing"],
      ["duplicate_column_pin", "a"],
      ["duplicate_column_pin", "b"],
      ["column_not_pinnable", "c"],
    ]);
    expect(snapshot.getColumn("b")?.pinned).toBeUndefined();
    expect(snapshot.getColumn("c")?.pinned).toBeUndefined();
    expect(table.getState().columnPinning).toEqual(pinning);
    table.pinColumn("b", "end");
    expect(table.getSnapshot().getColumn("b")?.pinned).toBe("end");
  });

  it("falls back to positive finite minWidth or 120 for unusable pinned widths", () => {
    const table = pinnedTable({
      columns: [
        { id: "a", minWidth: 70, pinned: "start" },
        { id: "b", pinned: "start" },
        { id: "c", width: Number.NaN, minWidth: 50, pinned: "end" },
        { id: "d", width: Infinity, minWidth: -1, pinned: "end" },
      ],
    });
    expect(table.getSnapshot().columns.map((column) => [column.width, column.pinOffset])).toEqual([
      [70, 0],
      [120, 70],
      [50, 120],
      [120, 0],
    ]);
    expect(table.getSnapshot()).toMatchObject({ pinnedStartWidth: 190, pinnedEndWidth: 170 });
    expect(table.getSnapshot().issues.map((problem) => problem.code)).toEqual(
      Array(4).fill("unsized_pinned_column"),
    );
  });

  it("reports rejected operations without state changes and clears their issue on a valid operation or reset", () => {
    const onStateChange = vi.fn<(state: TableState) => void>();
    const table = pinnedTable({
      columns: [{ id: "a", width: 100, pinnable: false }],
      onStateChange,
    });
    const listener = vi.fn<() => void>();
    table.subscribe(listener);
    table.pinColumn("missing", "start");
    const snapshot = table.getSnapshot();
    table.pinColumn("missing", "start");
    expect(table.getSnapshot()).toBe(snapshot);
    table.pinColumn("a", "start");
    expect(table.getSnapshot().issues[0]?.code).toBe("column_not_pinnable");
    table.pinColumn("a", "left" as never);
    expect(table.getSnapshot().issues[0]?.code).toBe("invalid_column_pinning");
    table.pinColumn("a", false);
    expect(table.getSnapshot().issues).toEqual([]);
    expect(onStateChange).not.toHaveBeenCalled();
    expect(listener).toHaveBeenCalledTimes(4);
    table.pinColumn("missing", false);
    table.reset();
    expect(table.getSnapshot().issues).toEqual([]);
  });

  it.each([null, [], { start: [], end: null }, { start: [42], end: [] }])(
    "recovers malformed pinning state %j",
    (columnPinning) => {
      const table = pinnedTable({ initialState: { columnPinning: columnPinning as never } });
      expect(table.getState().columnPinning).toEqual({ start: [], end: [] });
      expect(table.getSnapshot().issues[0]?.code).toBe("invalid_column_pinning");
      table.setState({ columnPinning: { start: [], end: [] } });
      expect(table.getSnapshot().issues).toEqual([]);
      table.setState({ columnPinning: columnPinning as never });
      expect(table.getSnapshot().issues[0]?.code).toBe("invalid_column_pinning");
    },
  );

  it("reports removed columns and restores their pin when their definition returns", () => {
    const table = pinnedTable({ initialState: { columnPinning: { start: ["b"], end: [] } } });
    table.setColumns(columns.filter((column) => column.id !== "b"));
    expect(table.getSnapshot().pinnedStartWidth).toBe(0);
    expect(table.getSnapshot().issues[0]).toMatchObject({ code: "unknown_column", column: "b" });
    table.setColumns(columns);
    expect(table.getSnapshot().pinnedStartWidth).toBe(80);
    expect(ids(table)[0]).toBe("b");
  });

  it("does not rerun filtering, sorting or pagination when view layout changes", () => {
    const compare = vi.fn<(a: string | null, b: string | null) => number>((a, b) =>
      (a ?? "").localeCompare(b ?? ""),
    );
    const filter = vi.fn<() => boolean>(() => true);
    const table = pinnedTable({
      columns: [{ id: "a", width: 100, compare, filter }, ...columns.slice(1)],
      initialState: {
        sorting: [{ column: "a", direction: "asc" }],
        filters: { a: "any" },
        pagination: { page: 2, pageSize: 3 },
      },
    });
    const before = table.getSnapshot();
    compare.mockClear();
    filter.mockClear();
    table.pinColumn("a", "end");
    table.resizeColumn("a", 150);
    table.toggleColumn("a", false);
    table.pinColumn("b", "start");
    table.moveColumn("c", 5);
    const after = table.getSnapshot();
    expect(after.page).toBe(2);
    expect(after.processedRows).toEqual(before.processedRows);
    expect(after.rows).toEqual(before.rows);
    expect(compare).not.toHaveBeenCalled();
    expect(filter).not.toHaveBeenCalled();
  });

  it("copies, pastes and exports across pinned regions in display order", () => {
    const table = pinnedTable({
      data: data.slice(0, 1),
      initialState: {
        columnPinning: { start: ["b", "a"], end: ["f", "e"] },
        columnOrder: ["d", "c"],
      },
    });
    expect(table.copy({ top: 0, bottom: 0, left: 0, right: 5 })).toBe("B0\tA0\tD0\tC0\tF0\tE0");
    expect(table.exportRows({ headers: false })).toBe("B0,A0,D0,C0,F0,E0");
    const result = table.paste({ row: 0, column: 1 }, "a-new\td-new\tc-new\tf-new");
    expect(result.status).toBe("applied");
    expect(table.getSnapshot().getRow(0)?.original).toMatchObject({
      a: "a-new",
      b: "B0",
      c: "c-new",
      d: "d-new",
      e: "E0",
      f: "f-new",
    });
    expect(data[0]?.a).toBe("A0");
  });
});
