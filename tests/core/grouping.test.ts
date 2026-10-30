import {
  createTable,
  defineColumns,
  type TableGroup,
  type TableOptions,
  type TableState,
  type TableRenderItem,
} from "@vueye-table/core";
import { describe, expect, it, vi } from "vitest";

interface Sale {
  id: number;
  region: string | number;
  team: string;
  amount: number;
  budget: number;
}
const data: readonly Sale[] = Object.freeze([
  Object.freeze({ id: 1, region: "West", team: "B", amount: 10, budget: 20 }),
  Object.freeze({ id: 2, region: "East", team: "A", amount: 30, budget: 40 }),
  Object.freeze({ id: 3, region: "West", team: "A", amount: 20, budget: 30 }),
  Object.freeze({ id: 4, region: "East", team: "A", amount: 50, budget: 60 }),
]);
const columns = defineColumns<Sale>([
  { id: "region" },
  { id: "team" },
  { id: "amount", aggregate: "sum", editable: true },
  { id: "budget", aggregate: "mean" },
]);
function make(options: Partial<TableOptions<Sale>> = {}) {
  return createTable<Sale>({
    data,
    columns,
    initialState: { grouping: ["region", "team"] },
    ...options,
  });
}
function headers(items: readonly TableRenderItem<Sale>[]): TableGroup[] {
  return items.filter((item) => item.kind === "group");
}

describe("grouping", () => {
  it("nests typed groups without mutating data and keeps data grid coordinates separate", () => {
    const table = make();
    const snapshot = table.getSnapshot();
    expect(snapshot.grouped).toBe(true);
    expect(
      headers(snapshot.renderItems).map((group) => [group.value, group.depth, group.leafCount]),
    ).toEqual([
      ["West", 0, 2],
      ["B", 1, 1],
      ["A", 1, 1],
      ["East", 0, 2],
      ["A", 1, 2],
    ]);
    expect(snapshot.rows.map((row) => [row.key, row.depth])).toEqual([
      [1, 2],
      [3, 2],
      [2, 2],
      [4, 2],
    ]);
    expect(
      snapshot.renderItems.flatMap((item) => (item.kind === "row" ? [item.rowIndex] : [])),
    ).toEqual([0, 1, 2, 3]);
    const west = headers(snapshot.renderItems)[0]!;
    expect(west.getAggregate("amount")).toBe(30);
    expect(west.getAggregate("budget")).toBe(25);
    expect(west.getAggregateDisplay("amount")).toBe("30");
    expect(Object.isFrozen(west)).toBe(true);
    expect(snapshot.getRow(west.key)).toBeUndefined();
    expect(table.edit({ rowKey: west.key, column: "amount", value: 100 }).status).toBe("rejected");
    expect(data[0]!.amount).toBe(10);
  });

  it("orders groups by their sort rule and preserves sorted leaves", () => {
    const table = make();
    table.sort("amount", "desc");
    expect(table.getSnapshot().processedRows.map((row) => row.key)).toEqual([4, 2, 3, 1]);
    table.sort("region", "desc", { multi: true });
    expect(
      headers(table.getSnapshot().renderItems)
        .filter((group) => group.depth === 0)
        .map((group) => group.value),
    ).toEqual(["West", "East"]);
    expect(table.getSnapshot().processedRows.map((row) => row.key)).toEqual([3, 1, 4, 2]);
  });

  it.each([false, true])(
    "keeps empty groups last in both sort directions (custom bucket: %s)",
    (custom) => {
      const table = createTable({
        data: [
          { id: 1, category: null },
          { id: 2, category: "A" },
          { id: 3, category: "" },
          { id: 4, category: "B" },
        ],
        columns: [
          {
            id: "category",
            ...(custom ? { groupValue: (value: string | null) => value ?? "" } : {}),
          },
        ],
        initialState: { grouping: ["category"] },
      });
      table.sort("category", "desc");
      expect(
        table
          .getSnapshot()
          .renderItems.flatMap((item) => (item.kind === "group" ? [item.value] : [])),
      ).toEqual(["B", "A", ""]);
      expect(table.getSnapshot().rows.map((row) => row.key)).toEqual([4, 2, 1, 3]);
      table.sort("category", "asc");
      expect(
        table
          .getSnapshot()
          .renderItems.flatMap((item) => (item.kind === "group" ? [item.value] : [])),
      ).toEqual(["A", "B", ""]);
    },
  );

  it("handles explicit expansion across many distinct groups without repeated linear scans", () => {
    const table = createTable({
      data: Array.from({ length: 2000 }, (_, id) => ({ id, category: `Group ${id}` })),
      columns: [{ id: "category" }],
      paginate: false,
      initialState: { grouping: ["category"] },
    });
    const first = table.getSnapshot().renderItems[0]!;
    table.toggleGroup(first.key, false);
    const expandedGroups = table.getState().expandedGroups;
    let linearScans = 0;
    const includes = Array.prototype.includes;
    const spy = vi.spyOn(Array.prototype, "includes").mockImplementation(function (
      this: unknown[],
      value: unknown,
      fromIndex?: number,
    ) {
      if (this === expandedGroups) linearScans++;
      return includes.call(this, value, fromIndex);
    });
    try {
      const snapshot = table.getSnapshot();
      expect(snapshot.rows).toHaveLength(1999);
      expect(snapshot.getGroup(first.key)?.isExpanded).toBe(false);
      expect(snapshot.renderItems.at(-2)?.kind).toBe("group");
      expect(snapshot.getGroup(snapshot.renderItems.at(-2)!.key)?.isExpanded).toBe(true);
      expect(linearScans).toBeLessThanOrEqual(1);
    } finally {
      spy.mockRestore();
    }
  });

  it("counts root groups for pagination and aggregates all filtered leaves", () => {
    const table = make({
      initialState: { grouping: ["region"], pagination: { page: 1, pageSize: 1 } },
    });
    let snapshot = table.getSnapshot();
    expect([snapshot.rowCount, snapshot.pageCount, snapshot.pageStart, snapshot.pageEnd]).toEqual([
      2, 2, 1, 1,
    ]);
    expect(snapshot.rows.map((row) => row.key)).toEqual([1, 3]);
    expect(headers(snapshot.renderItems)[0]!.getAggregate("amount")).toBe(30);
    table.nextPage();
    snapshot = table.getSnapshot();
    expect(snapshot.rows.map((row) => row.key)).toEqual([2, 4]);
    expect([snapshot.pageStart, snapshot.pageEnd]).toEqual([2, 2]);
    table.filter("amount", { min: 40 });
    expect(headers(table.getSnapshot().renderItems)[0]!.getAggregate("amount")).toBe(50);
    expect(table.getSnapshot().rowCount).toBe(1);
  });

  it("paginates visible group headers and leaves in row mode, excluding details", () => {
    const table = make({
      paginateBy: "row",
      getRowCanExpand: () => true,
      initialState: { grouping: ["region"], expanded: true, pagination: { page: 1, pageSize: 2 } },
    });
    expect(table.getSnapshot().rowCount).toBe(6);
    expect(table.getSnapshot().renderItems.map((item) => item.kind)).toEqual([
      "group",
      "row",
      "detail",
    ]);
    table.nextPage();
    expect(table.getSnapshot().renderItems.map((item) => item.kind)).toEqual([
      "row",
      "detail",
      "group",
    ]);
    expect(table.getSnapshot().rows.map((row) => row.key)).toEqual([3]);
  });

  it("keeps collapse independent of row details, pagination and filtered data", () => {
    const table = make({ paginate: false, getRowCanExpand: () => true });
    const before = table.getSnapshot();
    const west = headers(before.renderItems)[0]!;
    table.toggleExpanded(1);
    table.toggleGroup(west.key, false);
    const collapsed = table.getSnapshot();
    expect(collapsed.rows.map((row) => row.key)).toEqual([2, 4]);
    expect(collapsed.processedRows).toHaveLength(4);
    expect(collapsed.getRow(1)?.depth).toBe(2);
    expect(collapsed.getGroup(west.key)?.isExpanded).toBe(false);
    expect(before.getGroup(west.key)?.isExpanded).toBe(true);
    expect(table.getState().expanded).toEqual([1]);
    table.toggleGroup(west.key);
    expect(table.getSnapshot().renderItems.some((item) => item.kind === "detail")).toBe(true);
    table.collapseAllGroups();
    expect(table.getSnapshot().rows).toHaveLength(0);
    expect(headers(table.getSnapshot().renderItems)).toHaveLength(2);
    expect(table.getSnapshot().pageStart).toBe(1);
    table.expandAllGroups();
    expect(table.getSnapshot().rows).toHaveLength(4);
  });

  it("selects a collapsed group's filtered leaves with partial coverage", () => {
    const table = make();
    const west = headers(table.getSnapshot().renderItems)[0]!;
    table.select([1]);
    expect(table.getSnapshot().getGroup(west.key)?.selection).toBe("some");
    table.collapseAllGroups();
    table.toggleGroupSelection(west.key);
    expect(table.getState().selection).toEqual([1, 3]);
    expect(table.getSnapshot().getGroup(west.key)?.selection).toBe("all");
    table.filter("amount", { min: 15 });
    table.toggleGroupSelection(west.key, false);
    expect(table.getState().selection).toEqual([1]);
    expect(table.getSnapshot().getGroup(west.key)?.selection).toBe("none");
    table.toggleGroupSelection("missing");
    expect(table.getState().selection).toEqual([1]);
  });

  it("moves edited leaves between groups and preserves identity through undo", () => {
    const table = make({ columns: [{ id: "region", editable: true }, ...columns.slice(1)] });
    table.select([1]);
    expect(table.edit({ rowKey: 1, column: "region", value: "East" }).status).toBe("applied");
    const east = headers(table.getSnapshot().renderItems).find((group) => group.value === "East")!;
    expect(east.leafCount).toBe(3);
    expect(east.getAggregate("amount")).toBe(90);
    expect(table.getSnapshot().getRow(1)?.isDirty).toBe(true);
    expect(table.getState().selection).toEqual([1]);
    table.undo();
    expect(headers(table.getSnapshot().renderItems)[0]!.value).toBe("West");
    expect(table.getSnapshot().getRow(1)?.original.region).toBe("West");
    table.redo();
    expect(table.getSnapshot().getRow(1)?.original.region).toBe("East");
  });

  it("runs bucket and aggregate callbacks only for changed leaves and groups during ingestion", () => {
    const bucket = vi.fn<(value: Sale["region"]) => Sale["region"]>((value) => value);
    const sum = vi.fn<(values: readonly number[]) => number>((values) =>
      values.reduce((total, value) => total + value, 0),
    );
    const table = make({
      columns: [
        { id: "region", groupValue: bucket },
        { id: "amount", aggregate: sum },
      ],
      initialState: { grouping: ["region"] },
    });
    const before = headers(table.getSnapshot().renderItems);
    expect(bucket).toHaveBeenCalledTimes(4);
    expect(sum).toHaveBeenCalledTimes(2);
    table.resizeColumn("amount", 120);
    table.toggleGroup(before[0]!.key, false);
    table.select([1]);
    table.goToPage(2);
    expect(bucket).toHaveBeenCalledTimes(4);
    expect(sum).toHaveBeenCalledTimes(2);
    table.appendData([{ id: 5, region: "East", team: "A", amount: 1, budget: 2 }]);
    table.getSnapshot();
    expect(bucket).toHaveBeenCalledTimes(5);
    expect(sum).toHaveBeenCalledTimes(3);
    expect(table.getSnapshot().getGroup(before[0]!.key)?.getAggregate).toBe(
      before[0]!.getAggregate,
    );
    table.upsertData([{ ...data[3]!, amount: 60 }]);
    table.getSnapshot();
    expect(bucket).toHaveBeenCalledTimes(6);
    expect(sum).toHaveBeenCalledTimes(4);
    table.removeData([2]);
    table.getSnapshot();
    expect(bucket).toHaveBeenCalledTimes(6);
    expect(sum).toHaveBeenCalledTimes(5);
    expect(table.getSnapshot().getGroup(before[1]!.key)?.getAggregate("amount")).toBe(61);
    expect(before[1]!.getAggregate("amount")).toBe(80);
  });

  it("handles prototype-like buckets and distinguishes numbers from strings", () => {
    const table = make({
      data: ["__proto__", 1, "1", "constructor"].map((region, id) => ({
        id,
        region,
        team: "A",
        amount: 1,
        budget: 2,
      })),
      initialState: { grouping: ["region"] },
    });
    const groups = headers(table.getSnapshot().renderItems);
    expect(groups.map((group) => group.value)).toEqual(["__proto__", 1, "1", "constructor"]);
    expect(new Set(table.getSnapshot().renderItems.map((item) => item.key)).size).toBe(8);
  });

  it("recovers unknown and non-groupable columns and invalid runtime state", () => {
    const onStateChange = vi.fn<() => void>();
    const table = make({
      onStateChange,
      columns: [{ id: "region", groupable: false }, ...columns.slice(1)],
      initialState: { grouping: ["missing", "region", "team", "team"] },
    });
    expect(table.getState().grouping).toEqual(["missing", "region", "team"]);
    expect(table.getSnapshot().issues.map((problem) => problem.code)).toEqual(
      expect.arrayContaining(["unknown_column", "column_not_groupable"]),
    );
    expect(headers(table.getSnapshot().renderItems).map((group) => group.columnId)).toEqual([
      "team",
      "team",
    ]);
    table.setState({ grouping: null, expandedGroups: [1] } as unknown as Partial<TableState>);
    expect(table.getSnapshot().grouped).toBe(false);
    expect(table.getSnapshot().issues.map((problem) => problem.code)).toEqual(
      expect.arrayContaining(["invalid_grouping", "invalid_expanded_groups"]),
    );
    expect(onStateChange).not.toHaveBeenCalled();
    table.setState({ grouping: ["team"], expandedGroups: true });
    expect(table.getSnapshot().issues.some((problem) => problem.code.startsWith("invalid_"))).toBe(
      false,
    );
    const snapshot = table.getSnapshot();
    table.groupBy(["team"]);
    expect(table.getSnapshot()).toBe(snapshot);
    table.groupBy([]);
    expect(table.getSnapshot().grouped).toBe(false);
    expect(onStateChange).toHaveBeenCalledTimes(1);
    table.reset();
    expect(table.getState().grouping).toEqual(["missing", "region", "team"]);
  });

  it("reports callback failures and renders empty aggregate cells", () => {
    const table = make({
      columns: [
        {
          id: "region",
          groupValue: () => {
            throw new Error("bucket failed");
          },
        },
        {
          id: "amount",
          aggregate: () => {
            throw new Error("aggregate failed");
          },
        },
      ],
      initialState: { grouping: ["region"] },
    });
    const snapshot = table.getSnapshot();
    expect(headers(snapshot.renderItems)[0]!.value).toBe("");
    expect(headers(snapshot.renderItems)[0]!.getAggregate("amount")).toBeUndefined();
    expect(headers(snapshot.renderItems)[0]!.getAggregateDisplay("amount")).toBe("");
    expect(snapshot.issues.filter((problem) => problem.code === "group_value_error")).toHaveLength(
      4,
    );
    expect(snapshot.issues.some((problem) => problem.code === "aggregate_error")).toBe(true);
    table.setColumns([
      { id: "region", groupValue: () => Number.NaN },
      {
        id: "amount",
        aggregate: "sum",
        formatAggregate: () => {
          throw new Error("formatter failed");
        },
      },
    ]);
    expect(table.getSnapshot().issues.map((problem) => problem.code)).toEqual(
      expect.arrayContaining(["invalid_group_value", "aggregate_error"]),
    );
  });

  it("supports built-in and custom aggregates, including ratios of totals", () => {
    const table = make({
      columns: [
        { id: "region" },
        ...(["sum", "count", "min", "max", "mean", "median", "unique"] as const).map(
          (aggregate) => ({ id: aggregate, accessor: (row: Sale) => row.amount, aggregate }),
        ),
        {
          id: "ratio",
          accessor: (row: Sale) => row.amount / row.budget,
          aggregate: (_values, rows) =>
            rows.reduce((sum, row) => sum + row.amount, 0) /
            rows.reduce((sum, row) => sum + row.budget, 0),
          formatAggregate: (value) => `${Number(value) * 100}%`,
        },
      ],
      initialState: { grouping: ["region"] },
    });
    const west = headers(table.getSnapshot().renderItems)[0]!;
    expect(
      ["sum", "count", "min", "max", "mean", "median", "unique", "ratio"].map((id) =>
        west.getAggregate(id),
      ),
    ).toEqual([30, 2, 10, 20, 15, 15, [10, 20], 0.6]);
    expect(west.getAggregateDisplay("ratio")).toBe("60%");
  });

  it("excludes non-finite and missing numeric values without coercing strings", () => {
    const table = createTable({
      data: [
        { id: 1, group: "A", value: null },
        { id: 2, group: "A", value: NaN },
        { id: 3, group: "A", value: "2" },
      ],
      columns: [{ id: "group" }, { id: "value", aggregate: "mean" }],
      initialState: { grouping: ["group"] },
    });
    const group = table.getSnapshot().renderItems[0]!;
    expect(group.kind).toBe("group");
    if (group.kind !== "group") throw Error("Expected group");
    expect(group.getAggregate("value")).toBeUndefined();
  });

  it("exports all grouped leaves and aggregate cells, escaping labels and custom text", () => {
    const table = make({
      data: [{ id: 1, region: "=West", team: "A", amount: 10, budget: 20 }],
      columns: [
        { id: "region" },
        { id: "amount", aggregate: "sum", formatAggregate: () => "=SUM(A1)" },
      ],
      initialState: { grouping: ["region"] },
    });
    table.collapseAllGroups();
    expect(table.exportRows({ headers: false })).toBe("'=West,10");
    expect(table.exportRows({ groups: true, headers: false, depth: true })).toBe(
      "0,'=West,'=SUM(A1)\n1,'=West,10",
    );
    expect(table.exportRows({ groups: true, pageOnly: true, headers: false })).toBe(
      "'=West,'=SUM(A1)",
    );
    expect(table.exportRows({ groups: true, headers: false, escapeFormulas: false })).toBe(
      "=West,=SUM(A1)\n=West,10",
    );
  });

  it("forwards manual grouping state without calculating partial-page aggregates", () => {
    const bucket = vi.fn<(value: Sale["region"]) => Sale["region"]>((value) => value);
    const table = make({
      manual: true,
      rowCount: 200,
      columns: [{ id: "region", groupValue: bucket }, ...columns.slice(1)],
    });
    expect(table.getSnapshot().grouped).toBe(false);
    expect(table.getSnapshot().rowCount).toBe(200);
    expect(bucket).not.toHaveBeenCalled();
    table.groupBy(["team"]);
    expect(table.getState().grouping).toEqual(["team"]);
    expect(table.getSnapshot().renderItems.every((item) => item.kind === "row")).toBe(true);
  });

  it("ignores grouping on tree tables with an issue", () => {
    const table = make({ getChildren: () => [], initialState: { grouping: ["region"] } });
    expect(table.getSnapshot().grouped).toBe(false);
    expect(
      table.getSnapshot().issues.some((problem) => problem.code === "grouping_with_tree"),
    ).toBe(true);
  });
  it("sorts custom month buckets without calling a raw date comparator on text", () => {
    const table = createTable({
      data: [
        { id: 1, date: new Date("2026-01-02") },
        { id: 2, date: new Date("2026-02-01") },
        { id: 3, date: new Date("2026-01-20") },
      ],
      columns: [
        {
          id: "date",
          compare: (left, right) => left.getTime() - right.getTime(),
          groupValue: (value) => value.toISOString().slice(0, 7),
        },
      ],
      initialState: { grouping: ["date"], sorting: [{ column: "date", direction: "desc" }] },
    });
    expect(
      table
        .getSnapshot()
        .renderItems.flatMap((item) => (item.kind === "group" ? [item.value] : [])),
    ).toEqual(["2026-02", "2026-01"]);
    expect(table.getSnapshot().rows.map((row) => row.key)).toEqual([2, 3, 1]);
  });
  it("updates grouped aggregates through a filtered async stream", async () => {
    const table = make({
      data: [],
      initialState: { grouping: ["region"], filters: { amount: { min: 15 } } },
    });
    async function* source() {
      yield data.slice(0, 2);
      yield data.slice(2);
    }
    await table.stream(source());
    const snapshot = table.getSnapshot();
    expect(snapshot.processedRows.map((row) => row.key)).toEqual([2, 4, 3]);
    expect(
      headers(snapshot.renderItems).map((group) => [group.value, group.getAggregate("amount")]),
    ).toEqual([
      ["East", 80],
      ["West", 20],
    ]);
  });
  it("keeps selection modes and empty grouping results consistent", () => {
    for (const selectionMode of ["none", "single"] as const) {
      const table = make({ selectionMode });
      const key = headers(table.getSnapshot().renderItems)[0]!.key;
      table.toggleGroupSelection(key);
      expect(table.getState().selection).toHaveLength(selectionMode === "none" ? 0 : 1);
      table.search("no matches");
      expect(table.getSnapshot().renderItems).toEqual([]);
      expect([
        table.getSnapshot().pageStart,
        table.getSnapshot().pageEnd,
        table.getSnapshot().rowCount,
      ]).toEqual([0, 0, 0]);
      expect(table.getSnapshot().pageCount).toBe(1);
      table.setColumns([{ id: "amount" }]);
      expect(table.getSnapshot().grouped).toBe(false);
      expect(table.getSnapshot().issues.some((problem) => problem.code === "unknown_column")).toBe(
        true,
      );
    }
  });
});
