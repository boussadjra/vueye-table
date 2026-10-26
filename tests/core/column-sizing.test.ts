import { clampColumnWidth, createTable, type TableState } from "@vueye-table/core";
import { describe, expect, it, vi } from "vitest";

import { people, type Person } from "../fixtures";

function sizedTable(options: Partial<Parameters<typeof createTable<Person>>[0]> = {}) {
  return createTable<Person>({
    data: people,
    columns: [
      { id: "name.first", width: 160, minWidth: 80, maxWidth: 320 },
      { id: "age", width: 80, resizable: false },
      { id: "city" },
    ],
    ...options,
  });
}

const widthOf = (table: ReturnType<typeof sizedTable>, id: string): number | undefined =>
  table.getSnapshot().getColumn(id)?.width;

describe("column sizing", () => {
  it("resolves the definition's sizing options", () => {
    const column = sizedTable().getSnapshot().getColumn("name.first")!;
    expect(column).toMatchObject({
      width: 160,
      defaultWidth: 160,
      minWidth: 80,
      maxWidth: 320,
      resizable: true,
      isResized: false,
    });
    expect(sizedTable().getSnapshot().getColumn("age")?.resizable).toBe(false);
    expect(sizedTable().getState().columnSizing).toEqual({});
  });

  it("resizes a column and keeps the width within its bounds", () => {
    const onStateChange = vi.fn<(state: TableState) => void>();
    const table = sizedTable({ onStateChange });
    table.resizeColumn("name.first", 200);
    expect(table.getState().columnSizing).toEqual({ "name.first": 200 });
    const column = table.getSnapshot().getColumn("name.first")!;
    expect(column).toMatchObject({ width: 200, defaultWidth: 160, isResized: true });
    expect(table.getSnapshot().columns[0]).toBe(column);
    expect(table.getSnapshot().allColumns[0]).toBe(column);

    table.resizeColumn("name.first", 1000);
    expect(widthOf(table, "name.first")).toBe(320);
    table.resizeColumn("name.first", 10);
    expect(widthOf(table, "name.first")).toBe(80);
    table.resizeColumn("city", 240.5);
    expect(table.getState().columnSizing).toEqual({ "name.first": 80, city: 240.5 });
    expect(onStateChange).toHaveBeenCalledTimes(4);
  });

  it("skips no-op resizes and drops entries equal to the definition's width", () => {
    const onStateChange = vi.fn<(state: TableState) => void>();
    const table = sizedTable({ onStateChange });
    table.resizeColumn("name.first", 200);
    const state = table.getState();
    table.resizeColumn("name.first", 200);
    expect(table.getState()).toBe(state);
    table.resizeColumn("name.first", 160);
    expect(table.getState().columnSizing).toEqual({});
    expect(widthOf(table, "name.first")).toBe(160);
    expect(table.getSnapshot().getColumn("name.first")?.isResized).toBe(false);
    table.resizeColumn("name.first", 160);
    expect(onStateChange).toHaveBeenCalledTimes(2);
  });

  it("ignores unknown and non-resizable columns and invalid widths", () => {
    const onStateChange = vi.fn<(state: TableState) => void>();
    const table = sizedTable({ onStateChange });
    table.resizeColumn("missing", 100);
    table.resizeColumn("age", 120);
    for (const width of [0, -10, Number.NaN, Number.POSITIVE_INFINITY, "120" as never]) {
      table.resizeColumn("city", width);
    }
    expect(onStateChange).not.toHaveBeenCalled();
    expect(table.getState().columnSizing).toEqual({});
  });

  it("resets one column, every column, and the whole state", () => {
    const table = sizedTable({ initialState: { columnSizing: { city: 90 } } });
    table.resizeColumn("name.first", 200);
    table.resetColumnSize("city");
    expect(table.getState().columnSizing).toEqual({ "name.first": 200 });
    const state = table.getState();
    table.resetColumnSize("city");
    table.resetColumnSize("missing");
    expect(table.getState()).toBe(state);
    table.resizeColumn("city", 100);
    table.resetColumnSize();
    expect(table.getState().columnSizing).toEqual({});
    table.resizeColumn("city", 100);
    table.reset();
    expect(table.getState().columnSizing).toEqual({ city: 90 });
    expect(widthOf(table, "city")).toBe(90);
  });

  it("does not change the page or re-run search, filters, and sorting", () => {
    const compare = vi.fn<(left: number | null, right: number | null) => number>(
      (left, right) => (left ?? 0) - (right ?? 0),
    );
    const filter = vi.fn<() => boolean>(() => true);
    const table = createTable<Person>({
      data: people,
      columns: [{ id: "age", compare, filter }, { id: "city" }],
      initialState: {
        sorting: [{ column: "age", direction: "asc" }],
        filters: { age: "any" },
        pagination: { page: 2, pageSize: 3 },
      },
    });
    const before = table.getSnapshot();
    compare.mockClear();
    filter.mockClear();
    table.resizeColumn("city", 300);
    const after = table.getSnapshot();
    expect(after).not.toBe(before);
    expect(after.page).toBe(2);
    expect(after.rows).toEqual(before.rows);
    expect(after.getColumn("age")).toBe(before.getColumn("age"));
    expect(compare).not.toHaveBeenCalled();
    expect(filter).not.toHaveBeenCalled();
  });

  it("applies widths from setState without echoing them", () => {
    const onStateChange = vi.fn<(state: TableState) => void>();
    const table = sizedTable({ onStateChange });
    table.setState({ columnSizing: { city: 150 } });
    expect(widthOf(table, "city")).toBe(150);
    const state = table.getState();
    table.setState({ columnSizing: { city: 150 } });
    expect(table.getState()).toBe(state);
    table.setState({ columnSizing: { "name.first": 999 } });
    expect(widthOf(table, "name.first")).toBe(320);
    expect(table.getState().columnSizing).toEqual({ "name.first": 999 });
    expect(onStateChange).not.toHaveBeenCalled();
    expect(Object.isFrozen(table.getState().columnSizing)).toBe(true);
  });

  it("reports unusable entries and keeps the definition's width", () => {
    const table = sizedTable({
      initialState: {
        columnSizing: { missing: 100, age: 120, city: -5, "name.first": Number.NaN },
      },
    });
    const snapshot = table.getSnapshot();
    expect(snapshot.getColumn("age")?.width).toBe(80);
    expect(snapshot.getColumn("city")?.width).toBeUndefined();
    expect(snapshot.getColumn("name.first")?.width).toBe(160);
    expect(snapshot.issues.map((problem) => [problem.code, problem.column])).toEqual([
      ["unknown_column", "missing"],
      ["column_not_resizable", "age"],
      ["invalid_column_size", "city"],
      ["invalid_column_size", "name.first"],
    ]);
  });

  it("keeps widths through ordering and visibility changes", () => {
    const table = sizedTable();
    table.resizeColumn("city", 140);
    table.moveColumn("city", 0);
    table.toggleColumn("age", false);
    expect(table.getSnapshot().columns.map((column) => [column.id, column.width])).toEqual([
      ["city", 140],
      ["name.first", 160],
    ]);
  });

  it("clamps with minWidth winning over a smaller maxWidth", () => {
    expect(clampColumnWidth({ minWidth: undefined, maxWidth: undefined }, 42)).toBe(42);
    expect(clampColumnWidth({ minWidth: 100, maxWidth: 50 }, 10)).toBe(100);
    expect(clampColumnWidth({ minWidth: 100, maxWidth: 50 }, 500)).toBe(100);
  });
});
