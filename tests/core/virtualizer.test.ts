import { createTable, createVirtualizer, type RowKey, type VirtualWindow } from "@vueye-table/core";
import { describe, expect, it, vi } from "vitest";

describe("createVirtualizer", () => {
  it("looks up measured offscreen items without changing the viewport", () => {
    const virtual = createVirtualizer({ count: 100, estimateSize: 40 });
    virtual.setViewport(0, 80);
    const before = virtual.getWindow();
    expect(virtual.getItem(99)).toEqual({ index: 99, key: 99, start: 3960, size: 40 });
    expect(virtual.getWindow()).toBe(before);
    for (const index of [-1, 100, NaN, 1.5]) expect(virtual.getItem(index)).toBeUndefined();
    virtual.measure(0, 80);
    expect(virtual.getItem(99)?.start).toBe(4000);
    expect(Object.isFrozen(virtual.getItem(99))).toBe(true);
  });
  it("calculates fixed sizes, overscan and padding without including the next boundary item", () => {
    const virtual = createVirtualizer({ count: 100_000, estimateSize: 40, overscan: 2 });
    expect(virtual.getWindow().items).toEqual([]);
    virtual.setViewport(400, 120);
    const view = virtual.getWindow();
    expect(view.items.map((item) => item.index)).toEqual([8, 9, 10, 11, 12, 13, 14]);
    expect(view.items[0]).toEqual({ index: 8, key: 8, start: 320, size: 40 });
    expect(view.totalSize).toBe(4_000_000);
    expect(view.paddingStart).toBe(320);
    expect(view.paddingEnd).toBe(4_000_000 - 600);
    expect(view.startIndex).toBe(8);
    expect(view.endIndex).toBe(14);
    expect(virtual.getWindow()).toBe(view);
    expect(Object.isFrozen(view.items[0])).toBe(true);
  });

  it("clamps both ends, includes partially visible items and supports empty datasets", () => {
    const virtual = createVirtualizer({ count: 5, estimateSize: 10, overscan: 0 });
    virtual.setViewport(5, 10);
    expect(virtual.getWindow().items.map((item) => item.index)).toEqual([0, 1]);
    virtual.setViewport(999, 10);
    expect(virtual.getWindow().offset).toBe(40);
    expect(virtual.getWindow().items.map((item) => item.index)).toEqual([4]);
    virtual.setViewport(0, 100);
    expect(virtual.getWindow().items).toHaveLength(5);
    virtual.setOptions({ count: 0, estimateSize: 10 });
    expect(virtual.getWindow()).toMatchObject({
      items: [],
      totalSize: 0,
      startIndex: 0,
      endIndex: -1,
      paddingEnd: 0,
    });
    expect(virtual.getOffsetForIndex(10)).toBe(0);
  });

  it("uses default overscan and updates count and estimates", () => {
    const virtual = createVirtualizer({ count: 20, estimateSize: 10 });
    virtual.setViewport(100, 10);
    expect(virtual.getWindow().items).toHaveLength(11);
    virtual.setOptions({ count: 2, estimateSize: 20, overscan: 0 });
    expect(virtual.getWindow().offset).toBe(30);
    expect(virtual.getWindow().totalSize).toBe(40);
    virtual.setOptions({ count: 4, estimateSize: 20, overscan: 0 });
    expect(virtual.getWindow().totalSize).toBe(80);
  });

  it("supports all scroll alignments and keeps visible items in place with auto", () => {
    const virtual = createVirtualizer({ count: 10, estimateSize: 20, overscan: 0 });
    virtual.setViewport(40, 60);
    expect(virtual.getOffsetForIndex(3)).toBe(40);
    expect(virtual.getOffsetForIndex(0)).toBe(0);
    expect(virtual.getOffsetForIndex(8)).toBe(120);
    expect(virtual.getOffsetForIndex(5, "start")).toBe(100);
    expect(virtual.getOffsetForIndex(5, "center")).toBe(80);
    expect(virtual.getOffsetForIndex(5, "end")).toBe(60);
    expect(virtual.getOffsetForIndex(99, "start")).toBe(140);
    expect(virtual.getOffsetForIndex(-99, "end")).toBe(0);
    virtual.measure(3, 100);
    expect(virtual.getOffsetForIndex(3, "end")).toBe(100);
  });

  it("caches estimates and invalidates offsets only after a changed measurement", () => {
    const estimate = vi.fn<(index: number) => number>((index) => [10, 20, 30, 40][index]!);
    const virtual = createVirtualizer({ count: 4, estimateSize: estimate, overscan: 0 });
    virtual.setViewport(10, 20);
    expect(virtual.getWindow().items).toEqual([{ index: 1, key: 1, start: 10, size: 20 }]);
    virtual.setViewport(30, 30);
    expect(virtual.getWindow().items).toEqual([{ index: 2, key: 2, start: 30, size: 30 }]);
    expect(estimate).toHaveBeenCalledTimes(4);
    virtual.measure(2, 50);
    expect(virtual.getWindow().totalSize).toBe(120);
    expect(virtual.getOffsetForIndex(1, "start")).toBe(10);
    expect(virtual.getOffsetForIndex(3, "start")).toBe(80);
    expect(estimate).toHaveBeenCalledTimes(4);
    virtual.setOptions({ count: 3, estimateSize: estimate, overscan: 0 });
    expect(virtual.getWindow().totalSize).toBe(80);
    virtual.setOptions({ count: 4, estimateSize: estimate, overscan: 0 });
    expect(virtual.getWindow().totalSize).toBe(120);
    virtual.measure(0, 5);
    expect(virtual.getWindow().totalSize).toBe(115);
    expect(virtual.getOffsetForIndex(1, "start")).toBe(5);
  });

  it("retains measured sizes by typed key across sorting and removal/restoration", () => {
    let keys: RowKey[] = [1, "1", "detail:1"];
    const options = () => ({
      count: keys.length,
      estimateSize: 10,
      getKey: (index: number) => keys[index]!,
      overscan: 0,
    });
    const virtual = createVirtualizer(options());
    virtual.measure(1, 25);
    virtual.measure("detail:1", 60);
    virtual.setViewport(0, 100);
    expect(virtual.getWindow().items.map((item) => item.size)).toEqual([25, 10, 60]);
    keys = ["detail:1", "1"];
    virtual.setOptions(options());
    expect(virtual.getWindow().items.map((item) => item.size)).toEqual([60, 10]);
    keys = ["1", 1, "detail:1"];
    virtual.setOptions(options());
    expect(virtual.getWindow().items.map((item) => item.size)).toEqual([10, 25, 60]);
    virtual.setOptions({ count: 3, estimateSize: () => 12, getKey: (index) => keys[index]! });
    expect(virtual.getWindow().items.map((item) => item.size)).toEqual([12, 25, 60]);
  });

  it("notifies subscribers once and ignores repeated viewport and size values", () => {
    const virtual = createVirtualizer({ count: 10, estimateSize: 10 });
    const listener = vi.fn<(view: VirtualWindow) => void>();
    const stop = virtual.subscribe(listener);
    virtual.setViewport(0, 20);
    virtual.setViewport(0, 20);
    virtual.measure(0, 10);
    virtual.measure("absent", 200);
    expect(listener).toHaveBeenCalledTimes(1);
    virtual.measure(0, 20);
    virtual.measure(0, 20);
    expect(listener).toHaveBeenCalledTimes(2);
    virtual.setOptions({ count: 8, estimateSize: 10 });
    expect(listener).toHaveBeenCalledTimes(3);
    stop();
    virtual.setViewport(20, 20);
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it("recovers invalid options, sizes and viewports with bounded diagnostics", () => {
    const onIssue = vi.fn<(problem: { readonly code: string }) => void>();
    const virtual = createVirtualizer({ count: -1, estimateSize: 0, overscan: -2, onIssue });
    expect(virtual.getWindow().issues.map((problem) => problem.code)).toEqual([
      "invalid_virtual_option",
      "invalid_virtual_size",
    ]);
    expect(onIssue).toHaveBeenCalledTimes(2);
    virtual.setOptions({ count: 3, estimateSize: () => NaN, overscan: Infinity, onIssue });
    virtual.setViewport(-3, NaN);
    expect(virtual.getWindow().viewportSize).toBe(0);
    expect(virtual.getWindow().totalSize).toBe(120);
    expect(virtual.getWindow().issues).toHaveLength(3);
    virtual.setViewport(Infinity, -5);
    virtual.setViewport(0, 40);
    virtual.measure(0, -1);
    virtual.measure(1, Infinity);
    expect(virtual.getWindow().items[0]?.size).toBe(40);
    expect(virtual.getOffsetForIndex(NaN)).toBe(0);
    expect(virtual.getOffsetForIndex(1.5)).toBe(40);
  });

  it("recovers invalid measured sizes independently from estimates", () => {
    const virtual = createVirtualizer({ count: 2, estimateSize: 10 });
    virtual.measure(0, 0);
    expect(virtual.getWindow().issues[0]?.code).toBe("invalid_virtual_size");
    virtual.setOptions({ count: 2, estimateSize: 10 });
    expect(virtual.getWindow().issues).toEqual([]);
  });

  it("replaces duplicate or invalid keys with unique keys without changing valid ones", () => {
    const supplied = ["same", "same", '["virtual",1]', null, Infinity];
    const virtual = createVirtualizer({
      count: 5,
      estimateSize: 10,
      getKey: (index) => supplied[index] as RowKey,
    });
    virtual.setViewport(0, 100);
    const keys = virtual.getWindow().items.map((item) => item.key);
    expect(new Set(keys).size).toBe(5);
    expect(keys[0]).toBe("same");
    expect(virtual.getWindow().issues.map((problem) => problem.code)).toEqual([
      "duplicate_virtual_key",
      "invalid_virtual_option",
    ]);
    virtual.setOptions({
      count: 3,
      estimateSize: 10,
      getKey: (index) => ['["virtual",2]', "same", "same"][index]!,
    });
    expect(virtual.getWindow().items[2]?.key).toBe('["virtual",2]:');
  });
});

describe("unpaginated tables", () => {
  const data = Object.freeze(
    Array.from({ length: 30 }, (_, index) => ({ id: index, value: index })),
  );

  it("presents all processed rows by identity and disables page operations", () => {
    const table = createTable({
      data,
      columns: [{ id: "value" }],
      paginate: false,
      initialState: { pagination: { page: 3, pageSize: 4 } },
    });
    let snapshot = table.getSnapshot();
    expect(snapshot.rows).toBe(snapshot.processedRows);
    expect(snapshot).toMatchObject({
      paginate: false,
      page: 1,
      pageCount: 1,
      pageSize: 30,
      pageStart: 1,
      pageEnd: 30,
      canNextPage: false,
      canPreviousPage: false,
    });
    table.nextPage();
    table.previousPage();
    table.setPageSize(2);
    expect(table.getSnapshot()).toBe(snapshot);
    expect(table.getState().pagination).toEqual({ page: 3, pageSize: 4 });
    table.filter("value", { min: 20 });
    table.sort("value", "desc");
    snapshot = table.getSnapshot();
    expect(snapshot.rows).toBe(snapshot.processedRows);
    expect(snapshot.rows[0]?.original.value).toBe(29);
    expect(snapshot.pageSize).toBe(10);
    table.search("absent");
    expect(table.getSnapshot()).toMatchObject({
      pageSize: 1,
      pageStart: 0,
      pageEnd: 0,
      pageCount: 1,
    });
    expect(data[0]?.value).toBe(0);
  });

  it("keeps default pagination and retains manual source totals without fabricating rows", () => {
    const paged = createTable({ data, columns: [{ id: "value" }] });
    expect(paged.getSnapshot().paginate).toBe(true);
    expect(paged.getSnapshot().rows).toHaveLength(10);
    const manual = createTable({
      data: data.slice(0, 2),
      columns: [{ id: "value" }],
      manual: true,
      rowCount: 1000,
      paginate: false,
      initialState: { pagination: { page: 5, pageSize: 0 } },
    });
    expect(manual.getSnapshot()).toMatchObject({
      page: 1,
      pageCount: 1,
      rowCount: 1000,
      totalRowCount: 1000,
      pageSize: 2,
      issues: [],
    });
    expect(manual.getSnapshot().rows).toHaveLength(2);
    expect(manual.getSnapshot().rows).toBe(manual.getSnapshot().processedRows);
  });
});
