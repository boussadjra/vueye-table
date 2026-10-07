import { createTable, type TableOptions } from "@vueye-table/core";
import { describe, expect, it, vi } from "vitest";

interface Node {
  id: number;
  name: string;
  parent?: number | undefined;
  children?: readonly Node[] | undefined;
}
const data: readonly Node[] = [
  {
    id: 1,
    name: "Design",
    children: [{ id: 2, name: "Brand", children: [{ id: 3, name: "Logo" }] }],
  },
  { id: 4, name: "Website" },
];
function nested(extra: Partial<TableOptions<Node>> = {}) {
  return createTable<Node>({
    data,
    columns: [{ id: "name", editable: true }],
    getChildren: (row) => row.children,
    setChildren: (row, children) => ({ ...row, children }),
    initialState: { expanded: true },
    ...extra,
  });
}
function flat(extra: Partial<TableOptions<Node>> = {}) {
  return createTable<Node>({
    data: [
      { id: 1, name: "A" },
      { id: 2, name: "B" },
    ],
    columns: [{ id: "name", editable: true }],
    ...extra,
  });
}
async function flush() {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

describe("undoable row operations", () => {
  it("refuses new duplicates even when the source already contains a recovered duplicate", () => {
    const table = flat({
      data: [
        { id: 1, name: "A" },
        { id: 1, name: "Recovered" },
      ],
    });
    expect(table.insertRows([{ id: 1, name: "Another" }]).issues[0]?.code).toBe(
      "duplicate_row_key",
    );
    expect(table.getSnapshot().rows).toHaveLength(2);
    expect(table.insertRows([{ id: 3, name: "Unique" }]).status).toBe("applied");
    table.undo();
    expect(table.getSnapshot().rows).toHaveLength(2);
  });
  it("refuses descendants that have only positional identities", () => {
    interface OptionalNode {
      id?: number;
      name: string;
      children?: readonly OptionalNode[];
    }
    const table = createTable<OptionalNode>({
      data: [{ id: 1, name: "Root" }],
      columns: [{ id: "name" }],
      getChildren: (row) => row.children,
      setChildren: (row, children) => ({ ...row, children }),
    });
    expect(
      table.insertRows([{ id: 2, name: "Branch", children: [{ name: "Unkeyed" }] }]).issues[0]
        ?.code,
    ).toBe("invalid_row_operation");
    expect(table.getSnapshot().rows).toHaveLength(1);
  });
  it("inserts before a source key, removes multiple rows in one batch, and keeps input identity", () => {
    const onDataChange = vi.fn<() => void>();
    const table = flat({ onDataChange });
    const inserted = table.insertRows(
      [
        { id: 3, name: "C" },
        { id: 5, name: "E" },
      ],
      { before: 2 },
    );
    expect(inserted.status).toBe("applied");
    expect(inserted.rowChanges.map((row) => row.rowKey)).toEqual([3, 5]);
    expect(table.getSnapshot().rows.map((row) => row.key)).toEqual([1, 3, 5, 2]);
    expect(table.getPendingChanges().inserted).toHaveLength(2);
    table.undo();
    expect(table.getSnapshot().rows.map((row) => row.key)).toEqual([1, 2]);
    expect(table.getPendingChanges().inserted).toEqual([]);
    table.redo();
    expect(table.getSnapshot().getRow(3)?.isDirty).toBe(true);
    expect(table.removeRows([3, 5, 99]).status).toBe("partial");
    expect(table.getPendingChanges().inserted).toEqual([]);
    table.undo();
    expect(table.getSnapshot().rows.map((row) => row.key)).toEqual([1, 3, 5, 2]);
    table.markSaved();
    table.removeRows([3, 5]);
    expect(table.getPendingChanges().removed).toHaveLength(2);
    table.undo();
    expect(table.getPendingChanges().removed).toEqual([]);
    expect(onDataChange).toHaveBeenCalledTimes(7);
  });
  it("edits an inserted row, removes it without a pending deletion, and treats saved insertions as existing rows", () => {
    const table = flat();
    table.insertRows([{ id: 3, name: "C" }]);
    table.edit({ rowKey: 3, column: "name", value: "Changed" });
    expect(table.getPendingChanges().inserted[0]?.row.name).toBe("Changed");
    expect(table.getPendingChanges().updated).toEqual([]);
    table.removeRows([3]);
    expect(table.getPendingChanges().inserted).toEqual([]);
    expect(table.getPendingChanges().removed).toEqual([]);
    table.undo();
    table.markSaved([3]);
    table.edit({ rowKey: 3, column: "name", value: "Saved change" });
    expect(table.getPendingChanges().updated[0]?.previous.name).toBe("Changed");
  });
  it("creates a row through the factory and rejects throws, duplicates and positional identities", () => {
    const table = flat({ createRow: () => ({ id: 3, name: "New" }) });
    expect(table.insertRows().status).toBe("applied");
    expect(table.insertRows().issues[0]?.code).toBe("duplicate_row_key");
    expect(table.getSnapshot().rows).toHaveLength(3);
    expect(flat().insertRows().status).toBe("rejected");
    expect(
      flat({
        createRow: () => {
          throw new Error("Factory failed");
        },
      }).insertRows().issues[0]?.message,
    ).toBe("Factory failed");
    expect(
      flat().insertRows([
        { id: 3, name: "X" },
        { id: 3, name: "Y" },
      ]).status,
    ).toBe("rejected");
    const positional = createTable({
      data: [{ name: "A" }],
      columns: [{ id: "name", editable: true }],
    });
    expect(positional.insertRows([{ name: "B" }]).issues[0]?.code).toBe("invalid_row_operation");
    expect(positional.removeRows([0]).status).toBe("rejected");
    expect(table.insertRows([]).status).toBe("unchanged");
    expect(table.removeRows([]).status).toBe("unchanged");
    expect(table.removeRows([99]).issues[0]?.code).toBe("unknown_row");
  });
  it("keeps inserted/removed/updated baselines through revert and undo/redo", () => {
    const table = flat();
    table.edit({ rowKey: 1, column: "name", value: "New" });
    table.removeRows([1]);
    table.insertRows([{ id: 3, name: "C" }]);
    const pending = table.getPendingChanges();
    expect(pending.removed[0]?.row.name).toBe("A");
    expect(pending.updated).toEqual([]);
    const result = table.revert();
    expect(result.status).toBe("applied");
    expect(table.getSnapshot().rows.map((row) => row.original.name)).toEqual(["A", "B"]);
    expect(table.getPendingChanges()).toEqual({ inserted: [], updated: [], removed: [] });
    table.undo();
    expect(table.getSnapshot().rows.map((row) => row.key)).toEqual([2, 3]);
    expect(table.getPendingChanges().removed.map((row) => row.rowKey)).toEqual([1]);
    table.redo();
    expect(table.getSnapshot().rows.map((row) => row.key)).toEqual([1, 2]);
    expect(table.getPendingChanges()).toEqual({ inserted: [], updated: [], removed: [] });
    expect(data[0]?.name).toBe("Design");
  });
  it("requires a known insertion point and supports custom stable keys", () => {
    const table = flat();
    expect(table.insertRows([{ id: 3, name: "C" }], { before: 99 }).issues[0]?.code).toBe(
      "unknown_row",
    );
    expect(table.insertRows([{ id: 3, name: "C" }], { parent: 99 }).issues[0]?.code).toBe(
      "unknown_row",
    );
    const custom = createTable({
      data: [{ code: "a" }],
      columns: [{ id: "code", editable: true }],
      rowKey: "code",
    });
    expect(custom.insertRows([{ code: "b" }], { before: "a" }).status).toBe("applied");
    custom.undo();
    expect(custom.getSnapshot().rows.map((row) => row.key)).toEqual(["a"]);
  });
});

describe("tree row operations", () => {
  it("copies only a nested insertion path, keeps siblings, and removes a complete subtree", () => {
    let own: readonly Node[] = data;
    const table = nested({
      onDataChange: (next) => {
        own = next;
      },
    });
    const insert = table.insertRows([{ id: 5, name: "New" }], { parent: 2, before: 3 });
    expect(insert.status).toBe("applied");
    expect(table.getSnapshot().rows.map((row) => row.key)).toEqual([1, 2, 5, 3, 4]);
    expect(own[1]).toBe(data[1]);
    expect(own[0]).not.toBe(data[0]);
    expect(data[0]?.children?.[0]?.children).toHaveLength(1);
    table.setData(own);
    expect(table.getPendingChanges().inserted).toHaveLength(1);
    table.undo();
    expect(table.getSnapshot().getRow(5)).toBeUndefined();
    table.redo();
    expect(
      table
        .removeRows([2])
        .rowChanges.map((row) => row.rowKey)
        .sort((left, right) => Number(left) - Number(right)),
    ).toEqual([2, 3, 5]);
    expect(table.getSnapshot().rows.map((row) => row.key)).toEqual([1, 4]);
    table.undo();
    expect(table.getSnapshot().rows.map((row) => row.key)).toEqual([1, 2, 5, 3, 4]);
    table.redo();
    table.revert();
    expect(table.getSnapshot().rows.map((row) => row.key)).toEqual([1, 2, 3, 4]);
    expect(table.getPendingChanges()).toEqual({ inserted: [], updated: [], removed: [] });
  });
  it("removes children from several branches without overwriting another copied path", () => {
    const input: readonly Node[] = [
      { id: 1, name: "A", children: [{ id: 2, name: "B" }] },
      { id: 3, name: "C", children: [{ id: 4, name: "D" }] },
    ];
    const table = nested({ data: input });
    table.removeRows([2, 4]);
    expect(table.getSnapshot().getRow(1)?.original.children).toEqual([]);
    expect(table.getSnapshot().getRow(3)?.original.children).toEqual([]);
    table.undo();
    expect(table.getSnapshot().getRow(2)).toBeDefined();
    expect(table.getSnapshot().getRow(4)).toBeDefined();
  });
  it("refuses missing immutable inverses, bad siblings, corrupt inserts and key collisions", () => {
    const readOnly = nested({ setChildren: undefined });
    expect(readOnly.insertRows([{ id: 5, name: "New" }], { parent: 2 }).status).toBe("rejected");
    expect(readOnly.removeRows([3]).status).toBe("rejected");
    expect(readOnly.edit({ rowKey: 3, column: "name", value: "X" }).issues[0]?.code).toBe(
      "read_only_cell",
    );
    const table = nested();
    expect(table.insertRows([{ id: 5, name: "X" }], { parent: 2, before: 4 }).status).toBe(
      "rejected",
    );
    expect(table.insertRows([{ id: 3, name: "Duplicate" }], { parent: 2 }).issues[0]?.code).toBe(
      "duplicate_row_key",
    );
    const cyclic: Node = { id: 5, name: "Cycle" };
    cyclic.children = [cyclic];
    expect(table.insertRows([cyclic]).issues.some((problem) => problem.code === "tree_cycle")).toBe(
      true,
    );
    const throwing = nested({
      setChildren: () => {
        throw new Error("No write");
      },
    });
    expect(throwing.edit({ rowKey: 3, column: "name", value: "X" }).status).toBe("rejected");
    expect(throwing.getSnapshot().getRow(3)?.original.name).toBe("Logo");
    expect(throwing.insertRows([{ id: 5, name: "X" }], { parent: 2 }).status).toBe("rejected");
  });
  it("inserts adjacency children with an explicit inverse and removes descendants", () => {
    const input: readonly Node[] = [
      { id: 1, name: "A" },
      { id: 2, name: "B", parent: 1 },
      { id: 3, name: "C", parent: 2 },
      { id: 4, name: "D" },
    ];
    const table = flat({
      data: input,
      getParentKey: (row) => row.parent,
      setParentKey: (row, parent) => ({ ...row, parent: parent as number | undefined }),
      initialState: { expanded: true },
    });
    expect(table.insertRows([{ id: 5, name: "New" }], { parent: 1, before: 2 }).status).toBe(
      "applied",
    );
    expect(table.getSnapshot().rows.map((row) => row.key)).toEqual([1, 5, 2, 3, 4]);
    table.removeRows([1]);
    expect(table.getSnapshot().rows.map((row) => row.key)).toEqual([4]);
    table.undo();
    expect(table.getSnapshot().getRow(3)?.parentKey).toBe(2);
    table.revert();
    expect(table.getSnapshot().getRow(5)).toBeUndefined();
    const noSetter = flat({ data: input, getParentKey: (row) => row.parent });
    expect(noSetter.insertRows([{ id: 6, name: "X" }], { parent: 1 }).status).toBe("rejected");
    expect(noSetter.insertRows([{ id: 6, name: "X", parent: 1 }], { parent: 1 }).status).toBe(
      "applied",
    );
  });
  it("refuses changes to recovered nested roots and leaves unknown or absent parents explicit", () => {
    const shared: Node = { id: 2, name: "Shared" };
    const table = nested({ data: [{ id: 1, name: "A", children: [shared, shared] }] });
    const recovered = table.getSnapshot().rows.find((row) => row.key !== 1 && row.key !== 2)!;
    expect(table.insertRows([{ id: 9, name: "X" }], { parent: recovered.key }).status).toBe(
      "rejected",
    );
    expect(table.removeRows([recovered.key]).status).toBe("rejected");
    expect(table.edit({ rowKey: recovered.key, column: "name", value: "X" }).status).toBe(
      "rejected",
    );
  });
  it.each(["nested", "adjacency"])(
    "inserts/removes/reverts loaded %s children without losing unrelated caches on undo",
    async (mode) => {
      const table = createTable<Node>({
        data: [
          { id: 1, name: "Lazy" },
          { id: 4, name: "Other" },
        ],
        columns: [{ id: "name", editable: true }],
        ...(mode === "nested"
          ? {
              getChildren: (row: Node) => row.children,
              setChildren: (row: Node, children: readonly Node[]) => ({ ...row, children }),
            }
          : { getParentKey: (row: Node) => row.parent }),
        hasChildren: (row) => row.id === 1 || row.id === 4,
        createChildLoadController: () => {
          const signal = { aborted: false };
          return {
            signal,
            abort: () => {
              signal.aborted = true;
            },
          };
        },
        loadChildren: async (row) => [{ id: row.key === 1 ? 2 : 6, name: "Loaded" }],
      });
      expect(table.insertRows([{ id: 3, name: "New" }], { parent: 1 }).status).toBe("rejected");
      table.toggleExpanded(1);
      await flush();
      expect(table.insertRows([{ id: 3, name: "New" }], { parent: 1, before: 2 }).status).toBe(
        "applied",
      );
      table.toggleExpanded(4);
      await flush();
      table.undo();
      expect(table.getSnapshot().getRow(3)).toBeUndefined();
      expect(table.getSnapshot().getRow(6)).toBeDefined();
      table.redo();
      expect(table.getSnapshot().getRow(3)?.parentKey).toBe(1);
      table.removeRows([2]);
      expect(table.getSnapshot().getRow(2)).toBeUndefined();
      table.undo();
      expect(table.getSnapshot().getRow(2)).toBeDefined();
      table.revert();
      expect(table.getSnapshot().getRow(3)).toBeUndefined();
    },
  );
});
