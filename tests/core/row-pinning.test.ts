import {
  createTable,
  type TableOptions,
  type RowPinSide,
  type TableState,
} from "@vueye-table/core";
import { describe, expect, it, vi } from "vitest";

interface Entry {
  id: number;
  label: string;
  amount: number;
}
const data: readonly Entry[] = Object.freeze(
  Array.from({ length: 6 }, (_, index) =>
    Object.freeze({ id: index + 1, label: `Item ${index + 1}`, amount: (index + 1) * 10 }),
  ),
);
function make(options: Partial<TableOptions<Entry>> = {}) {
  return createTable({
    data,
    columns: [{ id: "label" }, { id: "amount", editable: true }],
    initialState: {
      rowPinning: { top: [4, 1], bottom: [6] },
      pagination: { page: 1, pageSize: 2 },
    },
    ...options,
  });
}

describe("row pinning", () => {
  it("retains pruning issues when a controlled owner echoes the normalized state", () => {
    let table: ReturnType<typeof make>;
    table = make({ onStateChange: (next) => table.setState(next) });
    table.removeData([4]);
    expect(table.getState().rowPinning.top).toEqual([1]);
    expect(
      table
        .getSnapshot()
        .issues.some((problem) => problem.code === "stale_pinned_row" && problem.rowKey === 4),
    ).toBe(true);
    table.setData(data);
    table.reset();
    expect(table.getSnapshot().issues.some((problem) => problem.code === "stale_pinned_row")).toBe(
      false,
    );
  });
  it("infers the parser type from another pinned row when the centre is empty", () => {
    const table = createTable({
      data: [
        { id: 1, value: null },
        { id: 2, value: 5 },
      ],
      columns: [{ id: "value", editable: true }],
      initialState: { rowPinning: { top: [1], bottom: [2] } },
    });
    expect(table.paste({ row: 0, column: 0 }, "7").status).toBe("applied");
    expect(table.getSnapshot().topRows[0]?.original.value).toBe(7);
  });
  it("filters tree pins independently of expansion when keepPinnedRows is false", () => {
    interface Node {
      id: number;
      label: string;
      children?: readonly Node[];
    }
    const table = createTable<Node>({
      data: [
        {
          id: 1,
          label: "Root",
          children: [
            { id: 2, label: "Child A" },
            { id: 3, label: "Child B" },
          ],
        },
        { id: 4, label: "Other" },
      ],
      columns: [{ id: "label" }],
      getChildren: (row) => row.children,
      keepPinnedRows: false,
      initialState: { rowPinning: { top: [2], bottom: [4] } },
    });
    expect(table.getSnapshot().topRows[0]?.key).toBe(2);
    expect(table.getSnapshot().rows.map((row) => row.key)).toEqual([1]);
    table.search("Child B");
    expect(table.getSnapshot().topRows).toEqual([]);
    expect(table.getSnapshot().bottomRows).toEqual([]);
    expect(table.getSnapshot().rows.map((row) => row.key)).toEqual([1, 3]);
    table.search("");
    expect(table.getSnapshot().topRows[0]?.depth).toBe(1);
  });
  it("counts manual fallback rows and all-pinned pages without including pins in pagination", () => {
    const manual = make({ manual: true });
    expect(manual.getSnapshot().rowCount).toBe(3);
    const table = make({
      paginate: false,
      initialState: { rowPinning: { top: [1, 2, 3, 4, 5, 6], bottom: [] } },
    });
    const snapshot = table.getSnapshot();
    expect(snapshot.rows).toEqual([]);
    expect(snapshot.gridRows).toHaveLength(6);
    expect([snapshot.rowCount, snapshot.pageCount, snapshot.pageStart, snapshot.pageEnd]).toEqual([
      0, 1, 0, 0,
    ]);
    table.toggleAll("page");
    expect(table.getSnapshot().pageSelection).toBe("all");
  });
  it("reuses filtering and sorting when a pin changes", () => {
    const filter = vi.fn<(value: number) => boolean>((value) => value >= 20);
    const compare = vi.fn<(left: number, right: number) => number>((left, right) => left - right);
    const table = make({
      columns: [{ id: "amount", filter, compare }],
      initialState: {
        filters: { amount: true },
        sorting: [{ column: "amount", direction: "asc" }],
      },
    });
    table.getSnapshot();
    const filters = filter.mock.calls.length;
    const comparisons = compare.mock.calls.length;
    table.pinRow(4, "top");
    table.getSnapshot();
    table.pinRow(5, "bottom");
    table.getSnapshot();
    expect(filter).toHaveBeenCalledTimes(filters);
    expect(compare).toHaveBeenCalledTimes(comparisons);
  });
  it("leaves data undo independent of a pruned pin", () => {
    const table = make();
    table.removeRows([4]);
    expect(table.getState().rowPinning.top).toEqual([1]);
    expect(table.getSnapshot().issues.some((problem) => problem.code === "stale_pinned_row")).toBe(
      true,
    );
    table.undo();
    expect(table.getSnapshot().getRow(4)?.original.amount).toBe(40);
    expect(table.getState().rowPinning.top).toEqual([1]);
  });
  it("keeps ordered pins outside centre pagination and exposes visual grid coordinates", () => {
    const table = make();
    const snapshot = table.getSnapshot();
    expect(snapshot.topRows.map((row) => row.key)).toEqual([4, 1]);
    expect(snapshot.bottomRows.map((row) => row.key)).toEqual([6]);
    expect(snapshot.rows.map((row) => row.key)).toEqual([2, 3]);
    expect(snapshot.processedRows.map((row) => row.key)).toEqual([2, 3, 5]);
    expect(snapshot.gridRows.map((row) => row.key)).toEqual([4, 1, 2, 3, 6]);
    expect(
      snapshot.renderItems.flatMap((item) => (item.kind === "row" ? [item.rowIndex] : [])),
    ).toEqual([2, 3]);
    expect([snapshot.rowCount, snapshot.pageCount, snapshot.totalRowCount]).toEqual([3, 2, 6]);
    expect(snapshot.getRow(4)).toBe(snapshot.topRows[0]);
    table.sort("amount", "desc");
    expect(table.getSnapshot().rows.map((row) => row.key)).toEqual([5, 3]);
    table.nextPage();
    expect(table.getSnapshot().gridRows.map((row) => row.key)).toEqual([4, 1, 2, 6]);
    expect(table.getSnapshot().pageStart).toBe(3);
  });
  it("keeps pins visible outside search and filters by default", () => {
    const table = make();
    table.search("Item 2");
    expect(table.getSnapshot().gridRows.map((row) => row.key)).toEqual([4, 1, 2, 6]);
    expect(table.getSnapshot().rowCount).toBe(1);
    table.filter("amount", { min: 100 });
    expect(table.getSnapshot().gridRows.map((row) => row.key)).toEqual([4, 1, 6]);
    expect([
      table.getSnapshot().rowCount,
      table.getSnapshot().pageCount,
      table.getSnapshot().pageStart,
    ]).toEqual([0, 1, 0]);
  });
  it("lets filters hide pins without returning them to the centre", () => {
    const table = make({ keepPinnedRows: false });
    table.search("Item 2");
    expect(table.getSnapshot().topRows).toEqual([]);
    expect(table.getSnapshot().bottomRows).toEqual([]);
    expect(table.getSnapshot().gridRows.map((row) => row.key)).toEqual([2]);
    expect(table.getState().rowPinning).toEqual({ top: [4, 1], bottom: [6] });
    table.search("");
    expect(table.getSnapshot().topRows.map((row) => row.key)).toEqual([4, 1]);
    table.filter("amount", { min: 30 });
    expect(table.getSnapshot().topRows.map((row) => row.key)).toEqual([4]);
  });
  it("moves and unpins by key, skips no-ops, and does not echo controlled state", () => {
    const onStateChange = vi.fn<() => void>();
    const table = make({ onStateChange });
    table.pinRow(4, "top");
    expect(onStateChange).not.toHaveBeenCalled();
    table.pinRow(4, "bottom");
    expect(table.getState().rowPinning).toEqual({ top: [1], bottom: [6, 4] });
    table.pinRow(4, false);
    table.pinRow(4, false);
    expect(onStateChange).toHaveBeenCalledTimes(2);
    table.setState({ rowPinning: { top: [2], bottom: [] } });
    expect(table.getSnapshot().topRows[0]?.key).toBe(2);
    expect(onStateChange).toHaveBeenCalledTimes(2);
    table.reset();
    expect(table.getState().rowPinning).toEqual({ top: [4, 1], bottom: [6] });
    expect(Object.isFrozen(table.getState().rowPinning.top)).toBe(true);
  });
  it("normalizes invalid state, duplicate pins, and typed keys with issues", () => {
    const table = make({ initialState: { rowPinning: { top: [1, 1, 99], bottom: [1, 2] } } });
    expect(table.getState().rowPinning).toEqual({ top: [1], bottom: [2] });
    expect(table.getSnapshot().issues.map((problem) => problem.code)).toEqual(
      expect.arrayContaining(["duplicate_row_pin", "stale_pinned_row"]),
    );
    table.setState({ rowPinning: { top: [Number.NaN], bottom: [] } });
    expect(table.getState().rowPinning).toEqual({ top: [], bottom: [] });
    expect(
      table.getSnapshot().issues.some((problem) => problem.code === "invalid_row_pinning"),
    ).toBe(true);
    table.setState({ rowPinning: null } as unknown as Partial<TableState>);
    expect(table.getState().rowPinning.top).toEqual([]);
    const typed = createTable({
      data: [{ id: 1 }, { id: "1" }],
      columns: [{ id: "id" }],
      initialState: { rowPinning: { top: [1], bottom: ["1"] } },
    });
    expect(typed.getSnapshot().gridRows.map((row) => row.key)).toEqual([1, "1"]);
  });
  it("ignores invalid operations and reports unknown client pin keys", () => {
    const onStateChange = vi.fn<() => void>();
    const table = make({ onStateChange });
    table.pinRow(2, "start" as RowPinSide);
    expect(table.getState().rowPinning.top).toEqual([4, 1]);
    table.pinRow(Number.NaN, "top");
    expect(table.getState().rowPinning.top).toEqual([4, 1]);
    table.pinRow(99, "top");
    expect(table.getState().rowPinning.top).toEqual([4, 1]);
    expect(
      table
        .getSnapshot()
        .issues.some((problem) => problem.code === "stale_pinned_row" && problem.rowKey === 99),
    ).toBe(true);
    expect(onStateChange).not.toHaveBeenCalled();
  });
  it("prunes removed pins before observers and reports stale keys", () => {
    const onStateChange = vi.fn<() => void>();
    let observed: readonly number[] = [];
    let table: ReturnType<typeof make>;
    table = make({
      onStateChange,
      onDataChange: () => {
        observed = table.getState().rowPinning.top as readonly number[];
      },
    });
    table.removeData([4]);
    expect(observed).toEqual([1]);
    expect(table.getState().rowPinning.top).toEqual([1]);
    expect(
      table
        .getSnapshot()
        .issues.some((problem) => problem.code === "stale_pinned_row" && problem.rowKey === 4),
    ).toBe(true);
    expect(onStateChange).toHaveBeenCalledTimes(1);
    table.setData(data.slice(1, 4));
    expect(table.getState().rowPinning).toEqual({ top: [], bottom: [] });
  });
  it("keeps edited and streamed pins current by key without mutating caller data", async () => {
    const table = make();
    table.select([4]);
    table.edit({ rowKey: 4, column: "amount", value: 45 });
    expect(table.getSnapshot().topRows[0]?.original.amount).toBe(45);
    expect(table.getSnapshot().topRows[0]?.isDirty).toBe(true);
    expect(table.getSelectedRows()[0]?.key).toBe(4);
    table.undo();
    expect(table.getSnapshot().topRows[0]?.original.amount).toBe(40);
    table.redo();
    expect(data[3]?.amount).toBe(40);
    table.markSaved();
    table.upsertData([{ ...data[3]!, amount: 70 }]);
    expect(table.getSnapshot().topRows[0]?.original.amount).toBe(70);
    async function* source() {
      yield [{ ...data[5]!, amount: 90 }];
    }
    await table.stream(source(), { mode: "upsert" });
    expect(table.getSnapshot().bottomRows[0]?.original.amount).toBe(90);
  });
  it("copies and pastes through top, centre and bottom grid regions", () => {
    const table = make({ columns: [{ id: "amount", editable: true }] });
    expect(table.copy({ top: 0, bottom: 4, left: 0, right: 0 })).toBe("40\n10\n20\n30\n60");
    const result = table.paste({ row: 0, column: 0 }, "41\n11\n21\n31\n61");
    expect(result.changes.map((change) => change.rowKey)).toEqual([4, 1, 2, 3, 6]);
    expect(table.getSnapshot().gridRows.map((row) => row.original.amount)).toEqual([
      41, 11, 21, 31, 61,
    ]);
    expect(table.clear({ top: 4, bottom: 4, left: 0, right: 0 }).changes[0]?.rowKey).toBe(6);
  });
  it("includes visible pins once in page/all selection and export", () => {
    const table = make({ columns: [{ id: "label" }] });
    table.search("Item 2");
    table.toggleAll();
    expect(table.getState().selection).toEqual([4, 1, 2, 6]);
    expect(table.getSnapshot().allSelection).toBe("all");
    expect(table.getSnapshot().pageSelection).toBe("all");
    expect(table.exportRows({ headers: false, pageOnly: true })).toBe(
      "Item 4\nItem 1\nItem 2\nItem 6",
    );
    expect(table.exportRows({ headers: false })).toBe("Item 4\nItem 1\nItem 2\nItem 6");
    table.toggleAll("page");
    expect(table.getState().selection).toEqual([]);
  });
  it("keeps grouping and aggregate membership in the centre", () => {
    const table = make({
      columns: [
        { id: "label", groupValue: () => "All" },
        { id: "amount", aggregate: "sum" },
      ],
      initialState: { grouping: ["label"], rowPinning: { top: [1], bottom: [6] } },
    });
    const group = table.getSnapshot().renderItems[0]!;
    if (group.kind !== "group") throw Error("Expected centre group");
    expect(group.leafCount).toBe(4);
    expect(group.getAggregate("amount")).toBe(140);
    expect(table.getSnapshot().rowCount).toBe(1);
    table.collapseAllGroups();
    expect(table.getSnapshot().gridRows.map((row) => row.key)).toEqual([1, 6]);
    expect(table.exportRows({ groups: true, headers: false }).split("\n")).toHaveLength(7);
  });
  it("retains unresolved manual keys and resolves them when the host supplies records", () => {
    const table = make({
      manual: true,
      data: data.slice(0, 2),
      rowCount: 10,
      initialState: { rowPinning: { top: [4], bottom: [6] } },
    });
    expect(table.getSnapshot().topRows).toEqual([]);
    expect(table.getState().rowPinning.top).toEqual([4]);
    expect(table.getSnapshot().issues.map((problem) => problem.code)).toContain(
      "unresolved_pinned_row",
    );
    table.setData([data[3]!, data[5]!, data[2]!]);
    expect(table.getSnapshot().gridRows.map((row) => row.key)).toEqual([4, 3, 6]);
    expect(table.getSnapshot().rowCount).toBe(10);
    expect(
      table.getSnapshot().issues.some((problem) => problem.code === "unresolved_pinned_row"),
    ).toBe(false);
  });
  it("presents a pinned tree node alone at its own depth and prunes dropped descendants", () => {
    interface Node {
      id: number;
      label: string;
      children?: readonly Node[];
    }
    const table = createTable<Node>({
      data: [
        {
          id: 1,
          label: "Root",
          children: [
            { id: 2, label: "Child A" },
            { id: 3, label: "Child B" },
          ],
        },
        { id: 4, label: "Other" },
      ],
      columns: [{ id: "label" }],
      getChildren: (row) => row.children,
      initialState: {
        expanded: true,
        rowPinning: { top: [2], bottom: [4] },
        pagination: { page: 1, pageSize: 1 },
      },
    });
    expect(table.getSnapshot().topRows.map((row) => [row.key, row.depth])).toEqual([[2, 1]]);
    expect(table.getSnapshot().rows.map((row) => row.key)).toEqual([1, 3]);
    expect(table.getSnapshot().rowCount).toBe(1);
    table.pinRow(1, "top");
    expect(table.getSnapshot().topRows.map((row) => row.key)).toEqual([2, 1]);
    expect(table.getSnapshot().rows.map((row) => row.key)).toEqual([3]);
    table.upsertData([{ id: 1, label: "Root", children: [{ id: 3, label: "Child B" }] }]);
    expect(table.getState().rowPinning.top).toEqual([1]);
    expect(
      table
        .getSnapshot()
        .issues.some((problem) => problem.code === "stale_pinned_row" && problem.rowKey === 2),
    ).toBe(true);
  });
  it("keeps unpaginated centre rows and defaults unchanged with no pins", () => {
    const table = make({ paginate: false, initialState: {} });
    const snapshot = table.getSnapshot();
    expect(snapshot.gridRows).toBe(snapshot.rows);
    expect(snapshot.rows).toHaveLength(6);
    expect(snapshot.state.rowPinning).toEqual({ top: [], bottom: [] });
    table.pinRow(1, "top");
    table.pinRow(6, "bottom");
    expect(table.getSnapshot().rows).toHaveLength(4);
    expect(table.getSnapshot().gridRows).toHaveLength(6);
  });
});
