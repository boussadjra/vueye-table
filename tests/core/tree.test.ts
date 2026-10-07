import {
  createTable,
  createVirtualizer,
  getRowItemKey,
  type TableOptions,
} from "@vueye-table/core";
import { describe, expect, it, vi } from "vitest";

interface Node {
  readonly id: number;
  readonly name: string;
  readonly parent?: number | null | undefined;
  readonly children?: readonly Node[] | undefined;
  readonly lazy?: boolean | undefined;
}
const data: readonly Node[] = [
  {
    id: 1,
    name: "B root",
    children: [
      { id: 2, name: "Z child", children: [{ id: 3, name: "Needle" }] },
      { id: 4, name: "A child" },
    ],
  },
  { id: 5, name: "A root", children: [{ id: 6, name: "Other" }] },
];
const columns = [{ id: "name", editable: true }] as const;
function make(options: Partial<TableOptions<Node>> = {}) {
  return createTable<Node>({
    data,
    columns,
    paginate: false,
    getChildren: (row) => row.children,
    setChildren: (row, children) => ({ ...row, children }),
    ...options,
  });
}
const keys = (table: ReturnType<typeof make>) => table.getSnapshot().rows.map((row) => row.key);
async function settle() {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function lazy(
  load = vi
    .fn<(row: unknown, signal: AbortSignal) => Promise<readonly Node[]>>()
    .mockResolvedValue([{ id: 7, name: "Loaded" }]),
) {
  const controllers: AbortController[] = [];
  const table = createTable<Node, AbortSignal>({
    data: [{ id: 1, name: "Lazy", lazy: true }],
    columns,
    paginate: false,
    getChildren: (row) => row.children,
    setChildren: (row, children) => ({ ...row, children }),
    hasChildren: (row) => row.lazy === true,
    loadChildren: load,
    createChildLoadController: () => {
      const controller = new AbortController();
      controllers.push(controller);
      return controller;
    },
  });
  return { table, load, controllers };
}

describe("tree data", () => {
  it("presents equivalent nested and adjacency hierarchies without detail items", () => {
    const nested = make();
    const flat = make({
      data: [
        { id: 1, name: "B root" },
        { id: 2, name: "Z child", parent: 1 },
        { id: 3, name: "Needle", parent: 2 },
        { id: 4, name: "A child", parent: 1 },
        { id: 5, name: "A root", parent: null },
        { id: 6, name: "Other", parent: 5 },
      ],
      getChildren: undefined,
      getParentKey: (row) => row.parent,
    });
    expect(keys(nested)).toEqual([1, 5]);
    nested.expandAll();
    flat.expandAll();
    const shape = (table: ReturnType<typeof make>) =>
      table.getSnapshot().rows.map(({ key, depth, parentKey, childCount, childStatus }) => ({
        key,
        depth,
        parentKey,
        childCount,
        childStatus,
      }));
    expect(shape(nested)).toEqual(shape(flat));
    expect(keys(nested)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(nested.getSnapshot().renderItems).toHaveLength(6);
    expect(nested.getSnapshot().getRow(3)).toMatchObject({ depth: 2, parentKey: 2, childCount: 0 });
    expect(Object.isFrozen(nested.getSnapshot().getRow(3))).toBe(true);
  });
  it("sorts siblings and preserves parent-first order", () => {
    const table = make();
    table.expandAll();
    table.sort("name", "asc");
    expect(keys(table)).toEqual([5, 6, 1, 4, 2, 3]);
    table.sort("name", "desc");
    expect(keys(table)).toEqual([1, 2, 3, 4, 5, 6]);
  });
  it("does not treat unloaded branches or repeated primitive values as leaves or cycles", () => {
    const table = make({
      data: [{ id: 1, name: "Match", lazy: true }],
      hasChildren: (row) => row.lazy === true,
      treeFilter: "strict",
    });
    table.search("Match");
    expect(keys(table)).toEqual([]);
    const primitives = createTable({
      data: ["same", "same"],
      columns: [],
      getChildren: () => undefined,
    });
    expect(primitives.getSnapshot().issues).toEqual([]);
  });
  it("searches descendants and opens their ancestors without changing expansion state", () => {
    const table = make();
    table.search("Needle");
    expect(keys(table)).toEqual([1, 2, 3]);
    expect(table.getState().expanded).toEqual([]);
    expect(table.getSnapshot().getRow(1)?.isExpanded).toBe(true);
    table.toggleExpanded(1, false);
    expect(keys(table)).toEqual([1, 2, 3]);
    table.search("");
    expect(keys(table)).toEqual([1, 5]);
    expect(table.getSnapshot().getRow(1)?.isExpanded).toBe(false);
    table.filter("name", "Needle");
    expect(keys(table)).toEqual([1, 2, 3]);
    table.clearFilters();
    expect(keys(table)).toEqual([1, 5]);
  });
  it("includes descendants of matching parents and only matching leaves in strict mode", () => {
    const descendants = make({ treeFilter: "descendants" });
    descendants.search("B root");
    expect(keys(descendants)).toEqual([1, 2, 3, 4]);
    descendants.search("Z child");
    expect(keys(descendants)).toEqual([1, 2, 3]);
    const strict = make({ treeFilter: "strict" });
    strict.search("child");
    expect(keys(strict)).toEqual([4]);
    expect(strict.getSnapshot().rows[0]?.depth).toBe(1);
    strict.search("root");
    expect(keys(strict)).toEqual([]);
    strict.search("");
    expect(keys(strict)).toEqual([1, 5]);
  });
  it("keeps root subtrees together, and can paginate visible rows", () => {
    const root = make({
      paginate: true,
      initialState: { pagination: { page: 1, pageSize: 1 }, expanded: true },
    });
    expect(keys(root)).toEqual([1, 2, 3, 4]);
    expect(root.getSnapshot()).toMatchObject({
      rowCount: 2,
      totalRowCount: 2,
      pageCount: 2,
      pageStart: 1,
      pageEnd: 1,
    });
    root.nextPage();
    expect(keys(root)).toEqual([5, 6]);
    expect(root.getSnapshot().pageEnd).toBe(2);
    root.setPageSize(2);
    expect(keys(root)).toEqual([1, 2, 3, 4, 5, 6]);
    const row = make({
      paginate: true,
      paginateBy: "row",
      initialState: { pagination: { page: 2, pageSize: 2 }, expanded: true },
    });
    expect(keys(row)).toEqual([3, 4]);
    expect(row.getSnapshot().rowCount).toBe(6);
    row.collapseAll();
    expect(row.getSnapshot().pageCount).toBe(1);
  });
  it("cascades selection through loaded children, including collapsed and filtered rows", () => {
    const table = make();
    table.select([1]);
    expect(new Set(table.getState().selection)).toEqual(new Set([1, 2, 4, 3]));
    expect(table.getSnapshot().selectedCount).toBe(4);
    expect(table.getSnapshot().getRow(1)?.selection).toBe("all");
    table.deselect([3]);
    expect(table.getSnapshot().getRow(1)?.selection).toBe("some");
    table.toggleRow(1);
    expect(table.getSnapshot().getRow(1)?.selection).toBe("all");
    table.search("Other");
    table.toggleAll();
    expect(table.getSnapshot().selectedCount).toBe(6);
    table.toggleAll();
    expect(table.getSnapshot().selectedCount).toBe(4);
    table.deselect([1]);
    expect(table.getSnapshot().selectedCount).toBe(0);
    expect(table.getSnapshot().getRow(1)?.selection).toBe("none");
    table.select([999]);
    expect(table.getSnapshot().selectedCount).toBe(0);
    table.clearSelection();
  });
  it("respects none and single selection, external state, and immutable old snapshots", () => {
    const none = make({ selectionMode: "none" });
    none.select([1]);
    expect(none.getSnapshot().selectedCount).toBe(0);
    const single = make({ selectionMode: "single" });
    single.select([1]);
    expect(single.getState().selection).toEqual([1]);
    const before = single.getSnapshot();
    single.setState({ selection: [3], expanded: [1] });
    expect(single.getSnapshot().getRow(1)?.selection).toBe("some");
    expect(before.getRow(1)?.isExpanded).toBe(false);
    expect(before.getRow(1)?.selection).toBe("some");
  });
  it("copies the root-to-child path, batches edits, and supports undo/redo by key", () => {
    const changed = vi.fn<(data: readonly Node[]) => void>();
    const table = make({ onDataChange: changed });
    expect(
      table.edit([
        { rowKey: 3, column: "name", value: "Updated" },
        { rowKey: 2, column: "name", value: "Parent" },
        { rowKey: 3, column: "name", input: "Again" },
      ]).status,
    ).toBe("applied");
    const next = changed.mock.calls[0]![0];
    expect(next[0]).not.toBe(data[0]);
    expect(next[0]?.children).not.toBe(data[0]?.children);
    expect(next[0]?.children?.[0]?.children?.[0]?.name).toBe("Again");
    expect(next[1]).toBe(data[1]);
    expect(next[0]?.children?.[1]).toBe(data[0]?.children?.[1]);
    expect(data[0]?.children?.[0]?.children?.[0]?.name).toBe("Needle");
    expect(table.undo()).toBe(true);
    expect(table.getSnapshot().getRow(3)?.original.name).toBe("Needle");
    expect(table.redo()).toBe(true);
    expect(table.getSnapshot().getRow(3)?.original.name).toBe("Again");
    expect(table.edit({ rowKey: 3, column: "name", value: "Again" }).status).toBe("unchanged");
  });
  it("edits adjacency children in the source array and diagnoses missing nested setters", () => {
    const changed = vi.fn<(data: readonly Node[]) => void>();
    const flat = make({
      data: [
        { id: 2, name: "Child", parent: 1 },
        { id: 1, name: "Root" },
      ],
      getChildren: undefined,
      setChildren: undefined,
      getParentKey: (row) => row.parent,
      onDataChange: changed,
    });
    flat.edit({ rowKey: 2, column: "name", value: "Edited" });
    expect(changed.mock.calls[0]![0][0]?.name).toBe("Edited");
    expect(flat.getSnapshot().getRow(2)?.original.name).toBe("Edited");
    const nested = make({ setChildren: undefined });
    expect(nested.edit({ rowKey: 3, column: "name", value: "No" }).issues[0]?.code).toBe(
      "read_only_cell",
    );
    expect(nested.edit({ rowKey: 1, column: "name", value: "Root edit" }).status).toBe("applied");
  });
  it("exports visible preorder rows with optional depth and indentation", () => {
    const table = make();
    expect(table.exportRows()).toBe("Name\nB root\nA root");
    table.toggleExpanded(1);
    expect(table.exportRows({ depth: true, indent: "  ", format: "tsv" })).toBe(
      "Depth\tName\n0\tB root\n1\t  Z child\n1\t  A child\n0\tA root",
    );
    expect(
      table.exportRows({ headers: false, depth: true, pageOnly: true }).split("\n"),
    ).toHaveLength(4);
    expect(table.copy({ top: 1, left: 0, bottom: 1, right: 0 })).toBe("Z child");
    table.paste({ row: 1, column: 0 }, "Pasted");
    expect(table.getSnapshot().getRow(2)?.original.name).toBe("Pasted");
  });
  it("recovers cycles, orphans, repeated nested objects, and key collisions", () => {
    const flat = make({
      getChildren: undefined,
      data: [
        { id: 1, name: "A", parent: 2 },
        { id: 2, name: "B", parent: 1 },
        { id: 3, name: "Self", parent: 3 },
        { id: 4, name: "Orphan", parent: 99 },
      ],
      getParentKey: (row) => row.parent,
    });
    flat.expandAll();
    expect(new Set(keys(flat)).size).toBe(4);
    expect(flat.getSnapshot().issues.map((problem) => problem.code)).toEqual([
      "tree_orphan",
      "tree_cycle",
      "tree_cycle",
    ]);
    const shared: Node = { id: 9, name: "Shared" };
    const nested = make({
      data: [
        {
          id: 1,
          name: "Root",
          children: [
            shared,
            shared,
            { id: 9, name: "Duplicate" },
            { id: "9#2" as unknown as number, name: "Literal" },
          ],
        },
      ],
    });
    nested.expandAll();
    expect(keys(nested)).toHaveLength(5);
    expect(new Set(keys(nested)).size).toBe(5);
    expect(nested.getSnapshot().issues.some((problem) => problem.code === "tree_cycle")).toBe(true);
    const recoveredRoot = nested
      .getSnapshot()
      .rows.find((row) => row.depth === 0 && row.key !== 1)!;
    expect(
      nested.edit({ rowKey: recoveredRoot.key, column: "name", value: "No ambiguous write" })
        .issues[0]?.code,
    ).toBe("read_only_cell");
    const cyclic: { id: number; name: string; children: Node[] } = {
      id: 1,
      name: "Cycle",
      children: [],
    };
    cyclic.children.push(cyclic);
    expect(
      make({ data: [cyclic] })
        .getSnapshot()
        .issues.map((problem) => problem.code),
    ).toContain("tree_cycle");
  });
  it("traverses 10,000 levels iteratively and caps depth with diagnostics", () => {
    let nested: Node = { id: 10_000, name: "Leaf" };
    const adjacency: Node[] = [nested];
    for (let i = 9_999; i >= 1; i--) {
      nested = { id: i, name: "Node", children: [nested] };
      adjacency.push({ id: i, name: "Node", parent: i === 1 ? undefined : i - 1 });
    }
    const table = make({ data: [nested], maxDepth: 10_000 });
    table.expandAll();
    expect(keys(table)).toHaveLength(10_000);
    expect(table.getSnapshot().getRow(10_000)?.depth).toBe(9_999);
    const capped = make({ data: [nested], maxDepth: 10 });
    capped.expandAll();
    expect(keys(capped)).toHaveLength(10_000);
    expect(capped.getSnapshot().issues[0]?.code).toBe("tree_depth_exceeded");
    const flat = make({
      data: adjacency,
      getChildren: undefined,
      getParentKey: (row) => row.parent,
      maxDepth: 3,
    });
    flat.expandAll();
    expect(
      flat.getSnapshot().issues.some((problem) => problem.code === "tree_depth_exceeded"),
    ).toBe(true);
    const invalid = make({ maxDepth: 0, getParentKey: () => 99 });
    expect(invalid.getSnapshot().issues.map((problem) => problem.code)).toEqual([
      "invalid_tree_option",
      "invalid_tree_option",
    ]);
  });
  it("memoizes build/filter/sort and splices visible descendants on expansion", () => {
    const getter = vi.fn<(row: Node) => readonly Node[] | undefined>((row) => row.children);
    const accessor = vi.fn<(row: Node) => string>((row) => row.name);
    const table = make({ getChildren: getter, columns: [{ id: "name", accessor }] });
    table.sort("name", "asc");
    table.getSnapshot();
    const before = accessor.mock.calls.length;
    table.toggleExpanded(1);
    expect(keys(table)).toEqual([5, 1, 4, 2]);
    table.toggleExpanded(2);
    expect(keys(table)).toEqual([5, 1, 4, 2, 3]);
    table.toggleExpanded(1);
    expect(keys(table)).toEqual([5, 1]);
    table.toggleExpanded(2);
    expect(keys(table)).toEqual([5, 1]);
    table.toggleExpanded(1);
    expect(keys(table)).toEqual([5, 1, 4, 2]);
    expect(accessor).toHaveBeenCalledTimes(before);
    expect(getter.mock.calls.length).toBeLessThan(40);
    const old = table.getSnapshot();
    table.toggleExpanded(1);
    expect(old.getRow(1)?.isExpanded).toBe(true);
  });
  it("supports manual root counts, empty trees, row details, single expansion and data replacement", () => {
    const manual = make({
      manual: true,
      paginate: true,
      rowCount: 20,
      initialState: { pagination: { page: 2, pageSize: 1 } },
    });
    manual.search("Missing");
    manual.sort("name", "asc");
    manual.expandAll();
    expect(keys(manual)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(manual.getSnapshot()).toMatchObject({ page: 1, pageCount: 20, rowCount: 20 });
    expect(make({ data: [], paginate: true }).getSnapshot()).toMatchObject({
      pageStart: 0,
      pageEnd: 0,
      rowCount: 0,
    });
    const single = make({ expandMode: "single", initialState: { expanded: true } });
    expect(single.getState().expanded).toEqual([1]);
    single.toggleExpanded(2);
    expect(single.getState().expanded).toEqual([2]);
    expect(keys(single)).toEqual([1, 2, 3, 4, 5]);
    single.toggleExpanded(5);
    expect(keys(single)).toEqual([1, 5, 6]);
    const details = make({ getRowCanExpand: (row) => row.id === 3 });
    details.expandAll();
    expect(
      details
        .getSnapshot()
        .renderItems.filter((item) => item.kind === "detail")
        .map((item) => item.row.key),
    ).toEqual([3]);
    details.toggleExpanded(1, false);
    expect(keys(details)).toEqual([1, 5, 6]);
    details.setData([{ id: 10, name: "New" }]);
    expect(keys(details)).toEqual([10]);
    details.reset();
    expect(keys(details)).toEqual([10]);
  });
  it("preserves virtual measurement keys as tree branches open and close", () => {
    const table = make();
    const virtual = createVirtualizer({
      count: 2,
      estimateSize: 30,
      getKey: (index) => table.getSnapshot().renderItems[index]!.key,
    });
    virtual.setViewport(0, 200);
    virtual.measure(getRowItemKey(5), 60);
    table.toggleExpanded(1);
    virtual.setOptions({
      count: table.getSnapshot().renderItems.length,
      estimateSize: 30,
      getKey: (index) => table.getSnapshot().renderItems[index]!.key,
    });
    expect(virtual.getWindow().items.find((item) => item.key === getRowItemKey(5))?.size).toBe(60);
    table.collapseAll();
    virtual.setOptions({
      count: 2,
      estimateSize: 30,
      getKey: (index) => table.getSnapshot().renderItems[index]!.key,
    });
    expect(virtual.getWindow().totalSize).toBe(90);
  });
});

describe("lazy tree children", () => {
  it("shares one request, caches a result, edits it immutably, and resets with new data", async () => {
    const request = deferred<readonly Node[]>();
    const { table, load } = lazy(
      vi
        .fn<(row: unknown, signal: AbortSignal) => Promise<readonly Node[]>>()
        .mockReturnValue(request.promise),
    );
    expect(table.getSnapshot().getRow(1)).toMatchObject({
      childCount: undefined,
      childStatus: "idle",
    });
    table.toggleExpanded(1);
    table.toggleExpanded(1, true);
    await settle();
    expect(load).toHaveBeenCalledOnce();
    expect(table.getSnapshot().getRow(1)?.childStatus).toBe("loading");
    request.resolve([{ id: 7, name: "Loaded" }]);
    await settle();
    expect(keys(table)).toEqual([1, 7]);
    expect(table.getSnapshot().getRow(1)).toMatchObject({ childCount: 1, childStatus: "loaded" });
    table.collapseAll();
    table.expandAll();
    await settle();
    expect(load).toHaveBeenCalledOnce();
    expect(table.edit({ rowKey: 7, column: "name", value: "Changed" }).status).toBe("applied");
    expect(table.getSnapshot().getRow(7)?.original.name).toBe("Changed");
    table.undo();
    expect(table.getSnapshot().getRow(7)?.original.name).toBe("Loaded");
    table.collapseAll();
    table.setData([{ id: 1, name: "Replaced", lazy: true }]);
    table.toggleExpanded(1);
    await settle();
    expect(load).toHaveBeenCalledTimes(2);
  });
  it.each(["collapse", "ancestor", "destroy", "replace", "state", "reset"] as const)(
    "aborts on %s and ignores late completions",
    async (action) => {
      const request = deferred<readonly Node[]>();
      const { table, controllers } = lazy(
        vi
          .fn<(row: unknown, signal: AbortSignal) => Promise<readonly Node[]>>()
          .mockReturnValue(request.promise),
      );
      if (action === "ancestor")
        table.setData([{ id: 2, name: "Parent", children: [{ id: 1, name: "Lazy", lazy: true }] }]);
      table.expandAll();
      await settle();
      if (action === "collapse") table.collapseAll();
      if (action === "ancestor") table.toggleExpanded(2, false);
      if (action === "destroy") table.destroy();
      if (action === "replace") table.setData([{ id: 4, name: "New" }]);
      if (action === "state") table.setState({ expanded: [] });
      if (action === "reset") table.reset();
      expect(controllers[0]?.signal.aborted).toBe(true);
      request.resolve([{ id: 7, name: "Late" }]);
      await settle();
      expect(table.getSnapshot().getRow(7)).toBeUndefined();
    },
  );
  it("reports failures, retries on reopening, and treats an empty result as a leaf", async () => {
    const { table, load } = lazy(
      vi
        .fn<(row: unknown, signal: AbortSignal) => Promise<readonly Node[]>>()
        .mockRejectedValueOnce(new Error("Offline"))
        .mockResolvedValueOnce([]),
    );
    expect(() => table.toggleExpanded(1)).not.toThrow();
    await settle();
    expect(table.getSnapshot().getRow(1)?.childStatus).toBe("error");
    expect(table.getSnapshot().issues[0]?.code).toBe("tree_load_error");
    table.toggleExpanded(1);
    table.toggleExpanded(1);
    await settle();
    expect(load).toHaveBeenCalledTimes(2);
    expect(table.getSnapshot().getRow(1)).toMatchObject({
      childCount: 0,
      canExpand: false,
      childStatus: "loaded",
    });
    expect(table.getSnapshot().issues).toEqual([]);
  });
  it("catches synchronous loader and controller exceptions and missing controller configuration", async () => {
    const thrown = lazy(
      vi.fn(() => {
        throw new Error("Sync");
      }),
    );
    thrown.table.expandAll();
    await settle();
    expect(thrown.table.getSnapshot().issues[0]?.code).toBe("tree_load_error");
    const missing = make({
      data: [{ id: 1, name: "Lazy", lazy: true }],
      hasChildren: () => true,
      loadChildren: async () => [],
    });
    missing.expandAll();
    expect(missing.getSnapshot().issues[0]?.code).toBe("invalid_tree_option");
    const controller = make({
      data: [{ id: 1, name: "Lazy" }],
      hasChildren: () => true,
      loadChildren: async () => [],
      createChildLoadController: () => {
        throw new Error("Controller");
      },
    });
    controller.expandAll();
    expect(controller.getSnapshot().issues[0]?.code).toBe("tree_load_error");
  });
  it("rejects duplicate loaded keys without overwriting and diagnoses loaded cycles", async () => {
    const collision = lazy(
      vi
        .fn<(row: unknown, signal: AbortSignal) => Promise<readonly Node[]>>()
        .mockResolvedValue([{ id: 1, name: "Collision" }]),
    );
    collision.table.expandAll();
    await settle();
    expect(keys(collision.table)).toEqual([1]);
    expect(collision.table.getSnapshot().issues[0]?.code).toBe("tree_duplicate_key");
    const duplicate = lazy(
      vi.fn<(row: unknown, signal: AbortSignal) => Promise<readonly Node[]>>().mockResolvedValue([
        { id: 7, name: "One" },
        { id: 7, name: "Two" },
      ]),
    );
    duplicate.table.expandAll();
    await settle();
    expect(duplicate.table.getSnapshot().issues[0]?.code).toBe("tree_duplicate_key");
    const cycle: { id: number; name: string; children: Node[] } = {
      id: 7,
      name: "Cycle",
      children: [],
    };
    cycle.children.push(cycle);
    const recovered = lazy(
      vi
        .fn<(row: unknown, signal: AbortSignal) => Promise<readonly Node[]>>()
        .mockResolvedValue([cycle]),
    );
    recovered.table.expandAll();
    await settle();
    expect(recovered.table.getSnapshot().issues.map((problem) => problem.code)).toContain(
      "tree_cycle",
    );
  });
  it("selects arriving descendants while preserving other selections and loads initially expanded nodes", async () => {
    const { table } = lazy();
    table.select([1, 999]);
    table.expandAll();
    await settle();
    expect(table.getState().selection).toContain(7);
    expect(table.getState().selection).toContain(999);
    expect(table.getSnapshot().selectedCount).toBe(2);
    const loader = vi
      .fn<(row: unknown, signal: AbortSignal) => Promise<readonly Node[]>>()
      .mockResolvedValue([{ id: 8, name: "Child" }]);
    const initial = createTable<Node, AbortSignal>({
      data: [{ id: 1, name: "Lazy" }],
      columns,
      hasChildren: (row) => row.id === 1,
      loadChildren: loader,
      createChildLoadController: () => new AbortController(),
      initialState: { expanded: true },
      paginate: false,
    });
    await settle();
    expect(loader).toHaveBeenCalledOnce();
    expect(initial.getSnapshot().getRow(8)?.parentKey).toBe(1);
  });
  it("aborts before the loader starts and ignores stale failures after reopening", async () => {
    const old = deferred<readonly Node[]>();
    const loader = vi
      .fn<(row: unknown, signal: AbortSignal) => Promise<readonly Node[]>>()
      .mockReturnValueOnce(old.promise)
      .mockResolvedValueOnce([{ id: 8, name: "New" }]);
    const first = lazy();
    first.table.expandAll();
    first.table.collapseAll();
    await settle();
    expect(first.load).not.toHaveBeenCalled();
    const { table } = lazy(loader);
    table.expandAll();
    await settle();
    table.collapseAll();
    table.expandAll();
    await settle();
    old.reject(new Error("Old"));
    await settle();
    expect(table.getSnapshot().issues).toEqual([]);
    expect(keys(table)).toEqual([1, 8]);
  });
});
