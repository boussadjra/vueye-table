import {
  createTable,
  createVirtualizer,
  getRowItemKey,
  type TableStatePatch,
} from "@vueye-table/core";
import { describe, expect, it, vi } from "vitest";

const data = Object.freeze(
  [
    { id: 1, label: "Alpha", detail: true },
    { id: "1", label: "Beta", detail: true },
    { id: 3, label: "Gamma", detail: false },
  ].map((row) => Object.freeze(row)),
);
function make(options: Partial<Parameters<typeof createTable<(typeof data)[number]>>[0]> = {}) {
  return createTable({
    data,
    columns: [{ id: "label" }],
    getRowCanExpand: (row) => row.detail,
    initialState: { pagination: { page: 1, pageSize: 2 } },
    ...options,
  });
}
describe("row expansion", () => {
  it("defaults to closed and requires an expandable row", () => {
    const table = make({ getRowCanExpand: undefined });
    table.toggleExpanded(1);
    table.toggleExpanded("missing");
    expect(table.getState().expanded).toEqual([]);
    expect(table.getSnapshot().getRow(1)?.canExpand).toBe(false);
    expect(table.getSnapshot().renderItems).toHaveLength(2);
  });
  it("uses disjoint typed keys for data and detail items without changing data counts", () => {
    const table = make();
    table.expandAll();
    const snapshot = table.getSnapshot();
    expect(snapshot.renderItems.map((item) => item.kind)).toEqual([
      "row",
      "detail",
      "row",
      "detail",
    ]);
    expect(snapshot.renderItems.map((item) => item.rowIndex)).toEqual([0, 0, 1, 1]);
    expect(new Set(snapshot.renderItems.map((item) => item.key)).size).toBe(4);
    expect(snapshot.rows).toHaveLength(2);
    expect(snapshot.rowCount).toBe(3);
    expect(snapshot.pageCount).toBe(2);
    expect(snapshot.pageEnd).toBe(2);
    table.nextPage();
    expect(table.getSnapshot().renderItems).toHaveLength(1);
    expect(table.getSnapshot().getRow(3)?.isExpanded).toBe(false);
    expect(getRowItemKey(1)).not.toBe(getRowItemKey("1"));
    expect(getRowItemKey("detail:1")).not.toBe(getRowItemKey(1, "detail"));
  });
  it("toggles atomically and avoids duplicate callbacks", () => {
    const changed = vi.fn<() => void>();
    const table = make({ onStateChange: changed });
    const notified = vi.fn<() => void>();
    table.subscribe(notified);
    table.toggleExpanded(1);
    table.toggleExpanded(1, true);
    table.toggleExpanded(3);
    table.toggleExpanded(99);
    expect(changed).toHaveBeenCalledTimes(1);
    expect(notified).toHaveBeenCalledTimes(1);
    table.toggleExpanded("1");
    expect(table.getState().expanded).toEqual([1, "1"]);
    table.toggleExpanded(1);
    expect(table.getState().expanded).toEqual(["1"]);
    table.collapseAll();
    table.collapseAll();
    expect(table.getState().expanded).toEqual([]);
  });
  it("keeps absent keys through filters, replacement and reset", () => {
    const table = make({ initialState: { expanded: [1, "stale"] } });
    table.search("Beta");
    expect(table.getSnapshot().renderItems).toHaveLength(1);
    expect(table.getState().expanded).toEqual([1, "stale"]);
    table.setData([data[1]!]);
    expect(table.getSnapshot().getRow(1)).toBeUndefined();
    table.setData(data);
    table.search("");
    expect(table.getSnapshot().getRow(1)?.isExpanded).toBe(true);
    table.collapseAll();
    table.reset();
    expect(table.getState().expanded).toEqual([1, "stale"]);
    expect(Object.isFrozen(table.getState().expanded)).toBe(true);
    expect(data[0]).not.toHaveProperty("isExpanded");
  });
  it("keeps the all sentinel for new data, and materializes known keys when closing one", () => {
    const table = make();
    table.expandAll();
    expect(table.getState().expanded).toBe(true);
    table.setData([...data, { id: 4, label: "Delta", detail: true }]);
    expect(table.getSnapshot().getRow(4)?.isExpanded).toBe(true);
    table.toggleExpanded(1, false);
    expect(table.getState().expanded).toEqual(["1", 4]);
  });
  it("single mode chooses the last supplied key and opens one processed row for all", () => {
    const changed = vi.fn<() => void>();
    const table = make({
      expandMode: "single",
      initialState: { expanded: [1, "1"] },
      onStateChange: changed,
    });
    expect(table.getState().expanded).toEqual(["1"]);
    table.toggleExpanded(1);
    expect(table.getState().expanded).toEqual([1]);
    expect(changed).toHaveBeenCalledTimes(1);
    table.toggleExpanded(1, false);
    expect(table.getState().expanded).toEqual([]);
    table.search("Beta");
    table.expandAll();
    expect(table.getState().expanded).toEqual(["1"]);
    table.setState({ expanded: ["1", 1] });
    expect(table.getState().expanded).toEqual([1]);
    table.search("Gamma");
    table.expandAll();
    expect(table.getState().expanded).toEqual([]);
    expect(
      make({ expandMode: "single", initialState: { expanded: true } }).getState().expanded,
    ).toEqual([1]);
    expect(
      make({ expandMode: "single", data: [], initialState: { expanded: true } }).getState()
        .expanded,
    ).toEqual([]);
  });
  it.each([null, false, {}, "all", [NaN], [Infinity], [1, {}]])(
    "reports recovered malformed state %j",
    (expanded) => {
      const table = make({ initialState: { expanded } as unknown as TableStatePatch });
      expect(table.getState().expanded).toEqual([]);
      expect(table.getSnapshot().issues.map((issue) => issue.code)).toContain("invalid_expanded");
      table.search("Alpha");
      expect(table.getSnapshot().issues).toHaveLength(1);
      table.setState({ expanded: [] });
      expect(table.getSnapshot().issues).toHaveLength(0);
      const notified = vi.fn<() => void>();
      table.subscribe(notified);
      table.setState({ expanded } as unknown as TableStatePatch);
      expect(notified).toHaveBeenCalledTimes(1);
      expect(table.getSnapshot().issues).toHaveLength(1);
      table.reset();
      expect(table.getSnapshot().issues).toHaveLength(0);
    },
  );
  it("deduplicates state and preserves undefined patch semantics", () => {
    const changed = vi.fn<() => void>();
    const table = make({ onStateChange: changed });
    table.setState({ expanded: [1, 1, "1"] });
    expect(table.getState().expanded).toEqual([1, "1"]);
    expect(changed).not.toHaveBeenCalled();
    const state = table.getState();
    table.setState({ expanded: [1, "1"] });
    table.setState({ expanded: undefined });
    expect(table.getState()).toBe(state);
  });
  it("does not rerun sorting, filtering or accessors when expanding", () => {
    const compare = vi.fn<(left: string, right: string) => number>((left, right) =>
      left.localeCompare(right),
    );
    const filter = vi.fn<() => boolean>(() => true);
    const canExpand = vi.fn<() => boolean>(() => true);
    const table = make({
      columns: [{ id: "label", compare, filter }],
      getRowCanExpand: canExpand,
      initialState: { sorting: [{ column: "label", direction: "asc" }], filters: { label: "x" } },
    });
    const row = table.getSnapshot().rows[0]!;
    row.getValue("label");
    const calls = [
      compare.mock.calls.length,
      filter.mock.calls.length,
      canExpand.mock.calls.length,
    ];
    table.toggleExpanded(row.key);
    table.getSnapshot();
    expect([
      compare.mock.calls.length,
      filter.mock.calls.length,
      canExpand.mock.calls.length,
    ]).toEqual(calls);
    expect(table.getSnapshot().getRow(row.key)?.getValue("label")).toBe(row.getValue("label"));
  });
  it("gives detail rows independent stable measurement keys", () => {
    const table = make({ paginate: false });
    table.toggleExpanded(1);
    let items = table.getSnapshot().renderItems;
    const virtual = createVirtualizer({
      count: items.length,
      estimateSize: 40,
      getKey: (index) => items[index]!.key,
      overscan: 0,
    });
    virtual.measure(getRowItemKey(1, "detail"), 120);
    virtual.setViewport(0, 300);
    expect(virtual.getWindow().items.map((item) => item.size)).toEqual([40, 120, 40, 40]);
    table.collapseAll();
    items = table.getSnapshot().renderItems;
    virtual.setOptions({
      count: items.length,
      estimateSize: 40,
      getKey: (index) => items[index]!.key,
      overscan: 0,
    });
    table.toggleExpanded(1);
    items = table.getSnapshot().renderItems;
    virtual.setOptions({
      count: items.length,
      estimateSize: 40,
      getKey: (index) => items[index]!.key,
      overscan: 0,
    });
    expect(virtual.getWindow().items[1]?.size).toBe(120);
  });
});
