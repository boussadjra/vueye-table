import type { ColumnDef, EditorSpec, ExpandedState, ValidationResult } from "@vueye-table/core";
import { useDataGrid, useDataTable, type UseDataTableOptions } from "@vueye-table/vue";
import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { effectScope, isReactive, isRef, nextTick, shallowRef, watch } from "vue";

interface Order {
  readonly id: number;
  readonly status: string;
  readonly quantity: number;
}
const data: readonly Order[] = Object.freeze([
  Object.freeze({ id: 1, status: "ready", quantity: 2 }),
  Object.freeze({ id: 2, status: "waiting", quantity: 3 }),
]);
const columns: readonly ColumnDef<Order>[] = [
  {
    id: "status",
    editable: true,
    parse: (input) => input.trim(),
    validate: (value) => value.length > 0 || "Choose a status.",
  },
  {
    id: "quantity",
    editable: true,
    type: "number",
    validate: (value) => value > 0 || "Use a positive quantity.",
  },
];
function setup(options: Partial<UseDataTableOptions<Order>> = {}) {
  const scope = effectScope();
  const table = scope.run(() =>
    useDataTable<Order>({ data, columns, paginate: false, ...options }),
  )!;
  return { table, scope };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe("row drafts", () => {
  it("keeps path values typed", () => {
    const scope = effectScope();
    const table = scope.run(() => useDataTable<Order>({ data, columns }))!;
    const draft = table.editRow(1);
    draft.values.quantity = 4;
    function invalidTypes(): void {
      // @ts-expect-error Numeric column values stay numeric.
      draft.values.quantity = "four";
      // @ts-expect-error Unknown path ids require the computed-column setter.
      draft.values.unknown = "value";
      // @ts-expect-error Custom signals require their own controller factory.
      useDataTable<Order, { aborted: boolean; custom: string }>({ data, columns });
    }
    expectTypeOf(invalidTypes).toBeFunction();
    expect(draft.values.quantity).toBe(4);
    draft.cancel();
    scope.stop();
  });
  it("parses and validates one batch, publishes reactive pending changes, and undoes once", async () => {
    const validateRow = vi.fn<(next: Order, previous: Order) => ValidationResult>(() => true);
    const onDataChange = vi.fn<() => void>();
    const { table, scope } = setup({ validateRow, onDataChange });
    const changed = vi.fn<() => void>();
    scope.run(() => watch(() => table.pendingChanges.updated.length, changed));
    const draft = table.editRow(1);
    expect(isReactive(draft.values)).toBe(true);
    expect(isRef(draft.values)).toBe(false);
    expect(Object.keys(draft.values)).toEqual(["status", "quantity"]);
    draft.values.status = " shipped ";
    draft.setInput("quantity", "8");
    expect((await draft.save()).changes).toHaveLength(2);
    await nextTick();
    expect(validateRow).toHaveBeenCalledExactlyOnceWith(
      { id: 1, status: "shipped", quantity: 8 },
      data[0],
    );
    expect(draft.status).toBe("saved");
    expect(onDataChange).toHaveBeenCalledTimes(1);
    expect(changed).toHaveBeenCalledTimes(1);
    expect(table.pendingChanges.updated).toHaveLength(1);
    expect(data[0]).toEqual({ id: 1, status: "ready", quantity: 2 });
    expect(table.undo()).toBe(true);
    expect(table.getRow(1)?.original).toEqual(data[0]);
    expect(table.undo()).toBe(false);
    table.redo();
    table.markSaved();
    expect(table.pendingChanges.updated).toHaveLength(0);
    scope.stop();
  });
  it("returns field failures, allows a rejected draft to be corrected, and closes partial saves", async () => {
    const { table, scope } = setup();
    const draft = table.editRow(1);
    draft.setInput("quantity", "not a number");
    expect((await draft.save()).status).toBe("rejected");
    expect(draft.issues[0]).toMatchObject({ code: "invalid_value", column: "quantity" });
    expect(draft.status).toBe("editing");
    draft.setValue("quantity", -1);
    draft.values.status = "shipped";
    const result = await draft.save();
    expect(result.status).toBe("partial");
    expect(draft.issues[0]?.code).toBe("validation_failed");
    expect(draft.status).toBe("saved");
    expect((await draft.save()).status).toBe("rejected");
    expect(table.getRow(1)?.original).toEqual({ id: 1, status: "shipped", quantity: 2 });
    scope.stop();
  });
  it.each(["held", "optimistic"] as const)(
    "awaits %s validation once and exposes plain pending accessors",
    async (asyncValidation) => {
      const request = deferred<ValidationResult>();
      const { table, scope } = setup({ asyncValidation, validateRow: () => request.promise });
      const draft = table.editRow(1);
      const pending = vi.fn<() => void>();
      scope.run(() => watch(() => table.pendingCells.length, pending, { flush: "sync" }));
      draft.values.quantity = 7;
      const saving = draft.save();
      expect(draft.save()).toBe(saving);
      expect(draft.pending).toBe(true);
      expect(draft.cancel()).toBe(false);
      draft.setInput("quantity", "99");
      draft.setValue("quantity", 99);
      expect(table.getRow(1)?.original.quantity).toBe(asyncValidation === "held" ? 2 : 7);
      expect(table.pendingCells).toHaveLength(1);
      request.resolve(true);
      expect((await saving).status).toBe("applied");
      expect(draft.pending).toBe(false);
      expect(table.pendingCells).toHaveLength(0);
      expect(pending).toHaveBeenCalledTimes(2);
      expect(table.undo()).toBe(true);
      expect(table.getRow(1)?.original.quantity).toBe(2);
      expect(table.undo()).toBe(false);
      scope.stop();
    },
  );
  it("awaits a rejected async cell validator and allows cancellation afterwards", async () => {
    const request = deferred<ValidationResult>();
    const { table, scope } = setup({
      columns: [{ id: "status", editable: true, validate: () => request.promise }],
    });
    const draft = table.editRow(1);
    draft.values.status = "shipped";
    const saving = draft.save();
    request.resolve("This order is locked.");
    expect((await saving).status).toBe("rejected");
    expect(draft.issues[0]?.message).toBe("This order is locked.");
    expect(draft.cancel()).toBe(true);
    expect(draft.cancel()).toBe(false);
    expect((await draft.save()).issues[0]?.code).toBe("stale_draft");
    expect(table.canUndo).toBe(false);
    scope.stop();
  });
  it.each(["replace", "remove", "edit", "columns", "missing"])(
    "refuses a draft after %s without overwriting data",
    async (action) => {
      const { table, scope } = setup();
      const draft = table.editRow(action === "missing" ? 99 : 1);
      draft.values.quantity = 8;
      if (action === "replace") table.setData([{ id: 1, status: "new", quantity: 6 }]);
      if (action === "remove") table.removeData([1]);
      if (action === "edit") table.edit({ rowKey: 1, column: "status", value: "new" });
      if (action === "columns") table.setColumns([...columns]);
      // Reusing definitions is safe; replacing a definition makes the parser/validator stale.
      if (action === "columns") table.setColumns(columns.map((column) => ({ ...column })));
      expect((await draft.save()).status).toBe("rejected");
      expect(draft.issues[0]?.code).toBe("stale_draft");
      expect(draft.status).toBe("stale");
      expect(table.getRow(1)?.original.quantity).not.toBe(8);
      scope.stop();
    },
  );
  it.each(["held", "optimistic"] as const)(
    "refuses an entire %s row draft if another field changes while validating",
    async (asyncValidation) => {
      const request = deferred<ValidationResult>();
      const { table, scope } = setup({
        asyncValidation,
        columns: [columns[0]!, { id: "quantity", editable: true, validate: () => request.promise }],
      });
      const draft = table.editRow(1);
      draft.values.quantity = 8;
      const saving = draft.save();
      table.edit({ rowKey: 1, column: "status", value: "new" });
      request.resolve(true);
      expect((await saving).status).toBe("rejected");
      expect(draft.status).toBe("stale");
      expect(table.getRow(1)?.original).toEqual({ id: 1, status: "new", quantity: 2 });
      expect(table.pendingCells).toHaveLength(0);
      scope.stop();
    },
  );
  it("resolves a pending save on scope disposal even if a validator never settles", async () => {
    const { table, scope } = setup({ validateRow: () => new Promise(() => {}) });
    const draft = table.editRow(1);
    draft.values.quantity = 8;
    const saving = draft.save();
    scope.stop();
    expect((await saving).status).toBe("rejected");
    expect(draft.status).toBe("stale");
    expect(table.getRow(1)?.original.quantity).toBe(2);
    const disposed = table.editRow(1);
    expect((await disposed.save()).status).toBe("rejected");
    table.destroy();
  });
  it("handles scope disposal during an optimistic data callback without waiting for validation", async () => {
    const scope = effectScope();
    const table = scope.run(() =>
      useDataTable<Order>({
        data,
        columns,
        asyncValidation: "optimistic",
        validateRow: () => new Promise(() => {}),
        onDataChange: () => scope.stop(),
      }),
    )!;
    const draft = table.editRow(1);
    draft.values.quantity = 8;
    expect((await draft.save()).status).toBe("rejected");
    expect(draft.status).toBe("stale");
  });
  it("copies submitted objects and protects pending drafts against source conflicts", async () => {
    const request = deferred<ValidationResult>();
    const source = { id: 1, details: { city: "Algiers" } };
    const scope = effectScope();
    const table = scope.run(() =>
      useDataTable({
        data: [source],
        columns: [{ id: "details", editable: true, validate: () => request.promise }],
      }),
    )!;
    const draft = table.editRow(1);
    draft.values.details!.city = "Oran";
    const saving = draft.save();
    draft.values.details!.city = "Constantine";
    expect(table.upsertData([{ id: 1, details: { city: "remote" } }]).issues[0]?.code).toBe(
      "ingestion_conflict",
    );
    request.resolve(true);
    expect((await saving).status).toBe("applied");
    expect(table.getRow(1)?.original.details.city).toBe("Oran");
    draft.values.details!.city = "Tlemcen";
    expect(table.getRow(1)?.original.details.city).toBe("Oran");
    expect(source.details.city).toBe("Algiers");
    scope.stop();
  });
  it("reports an uncopyable replacement before submission", async () => {
    const scope = effectScope();
    const table = scope.run(() =>
      useDataTable({
        data: [{ id: 1, details: { city: "A" } }],
        columns: [{ id: "details", editable: true }],
      }),
    )!;
    const draft = table.editRow(1);
    draft.setValue("details", { method: () => "B" });
    expect((await draft.save()).status).toBe("rejected");
    expect(draft.issues[0]?.code).toBe("invalid_value");
    expect(table.canUndo).toBe(false);
    scope.stop();
  });
  it("keeps a draft through sorting, paging, expansion and unrelated source upserts", async () => {
    const { table, scope } = setup({ getRowCanExpand: () => true });
    const draft = table.editRow(1);
    draft.values.quantity = 8;
    table.sort("status", "desc");
    table.toggleExpanded(1);
    table.upsertData([
      { id: 2, status: "incoming", quantity: 9 },
      { id: 3, status: "new", quantity: 4 },
    ]);
    expect((await draft.save()).status).toBe("applied");
    expect(table.expanded).toEqual([1]);
    expect(table.getRow(1)?.original.quantity).toBe(8);
    expect(table.upsertData([{ id: 1, status: "remote", quantity: 99 }]).issues[0]?.code).toBe(
      "ingestion_conflict",
    );
    const stale = table.editRow(2);
    table.upsertData([{ id: 2, status: "remote", quantity: 10 }]);
    expect((await stale.save()).issues[0]?.code).toBe("stale_draft");
    scope.stop();
  });
  it("copies only one row's editable values, isolates nested values, and supports dotted/computed columns", async () => {
    const source = {
      id: 1,
      details: { city: "Algiers" },
      tags: ["one"],
      at: new Date("2026-10-08"),
      value: 2,
    };
    const scope = effectScope();
    const table = scope.run(() =>
      useDataTable({
        data: [source],
        columns: [
          { id: "details", editable: true },
          { id: "details.city", editable: true },
          { id: "tags", editable: true },
          { id: "at", editable: true },
          {
            id: "double",
            accessor: (row) => row.value * 2,
            setValue: (row, value: number) => ({ ...row, value: value / 2 }),
            editable: true,
          },
        ],
      }),
    )!;
    const unchanged = table.editRow(1);
    expect(isReactive(unchanged.values.details)).toBe(false);
    expect((await unchanged.save()).status).toBe("unchanged");
    const draft = table.editRow(1);
    draft.values.details!.city = "Oran";
    draft.values.tags!.push("two");
    draft.values.at!.setUTCDate(9);
    draft.values["details.city"] = "Constantine";
    draft.setValue("double", 10);
    expect(source.details.city).toBe("Algiers");
    expect(source.tags).toEqual(["one"]);
    expect(source.at.getUTCDate()).toBe(8);
    expect((await draft.save()).status).toBe("applied");
    expect(table.getRow(1)?.original).toMatchObject({
      details: { city: "Constantine" },
      tags: ["one", "two"],
      value: 5,
    });
    scope.stop();
  });
  it("copies cyclic and structured values without no-op edits, and detects nested changes", async () => {
    const cyclic: { name: string; self?: unknown } = { name: "one" };
    cyclic.self = cyclic;
    const source = {
      id: 1,
      cyclic,
      map: new Map([["a", 1]]),
      set: new Set(["a"]),
      pattern: /a/giu,
      bytes: new Uint8Array([1, 2]),
      buffer: new Uint8Array([3]).buffer,
      nullable: null,
      list: [1],
    };
    const scope = effectScope();
    const table = scope.run(() =>
      useDataTable({
        data: [source],
        columns: [
          { id: "cyclic", editable: true },
          { id: "map", editable: true },
          { id: "set", editable: true },
          { id: "pattern", editable: true },
          { id: "bytes", editable: true },
          { id: "buffer", editable: true },
          { id: "nullable", editable: true },
          { id: "list", editable: true },
        ],
      }),
    )!;
    expect((await table.editRow(1).save()).status).toBe("unchanged");
    const draft = table.editRow(1);
    draft.values.map!.set("a", 2);
    draft.values.set!.add("b");
    draft.values.bytes![0] = 2;
    draft.values.cyclic!.name = "two";
    draft.values.list!.push(2);
    expect((await draft.save()).changes).toHaveLength(5);
    expect(source.map.get("a")).toBe(1);
    scope.stop();
  });
  it("reports uncopyable values and unsafe/unknown inputs instead of silently dropping them", async () => {
    const scope = effectScope();
    const table = scope.run(() =>
      useDataTable({
        data: [{ id: 1, value: () => "A" }],
        columns: [{ id: "value", editable: true }],
      }),
    )!;
    const draft = table.editRow(1);
    expect(draft.issues[0]?.code).toBe("invalid_value");
    expect((await draft.save()).status).toBe("rejected");
    draft.setValue("value", () => "B");
    draft.setInput("__proto__.polluted", "yes");
    draft.setInput("unknown", "yes");
    const result = await draft.save();
    expect(result.status).toBe("partial");
    expect(result.issues.map((problem) => problem.code)).toEqual(["unsafe_path", "unknown_column"]);
    expect(Reflect.get({}, "polluted")).toBeUndefined();
    scope.stop();
  });
});

describe("Vue expansion and cancellation", () => {
  it("round-trips controlled expansion and replaces one shallow snapshot for a 10k-row tree", async () => {
    interface Node {
      id: number;
      parent?: number;
    }
    const nodes: readonly Node[] = Array.from({ length: 10_000 }, (_, id) =>
      id % 2 ? { id, parent: id - 1 } : { id },
    );
    const expanded = shallowRef<ExpandedState>([]);
    const scope = effectScope();
    const table = scope.run(() =>
      useDataTable({
        data: nodes,
        columns: [{ id: "id" }],
        paginate: false,
        getParentKey: (row) => row.parent,
        state: () => ({ expanded: expanded.value }),
        onStateChange: (next) => {
          expanded.value = next.expanded;
        },
      }),
    )!;
    const replacements = vi.fn<() => void>();
    scope.run(() => watch(() => table.snapshot, replacements, { flush: "sync" }));
    table.toggleExpanded(0);
    await nextTick();
    expect(replacements).toHaveBeenCalledTimes(1);
    expect(expanded.value).toEqual([0]);
    expect(table.rows).toHaveLength(5_001);
    expect(table.rows.every((row) => !isReactive(row) && !isReactive(row.original))).toBe(true);
    expect(isRef(table.expanded)).toBe(false);
    expanded.value = [2];
    await nextTick();
    expect(table.expanded).toEqual([2]);
    expect(table.getRow(0)?.isExpanded).toBe(false);
    scope.stop();
  });
  it.each(["collapse", "setData", "dispose"])(
    "provides a native AbortSignal and aborts on %s",
    async (action) => {
      const request = deferred<readonly { id: number; name: string }[]>();
      let signal!: AbortSignal;
      const scope = effectScope();
      const table = scope.run(() =>
        useDataTable({
          data: [{ id: 1, name: "root" }],
          columns: [{ id: "name" }],
          hasChildren: () => true,
          loadChildren: (_row, next) => {
            signal = next;
            next.addEventListener("abort", () => {});
            return request.promise;
          },
        }),
      )!;
      table.toggleExpanded(1);
      await Promise.resolve();
      expect(signal.aborted).toBe(false);
      if (action === "collapse") table.collapseAll();
      if (action === "setData") table.setData([{ id: 1, name: "replacement" }]);
      if (action === "dispose") scope.stop();
      expect(signal.aborted).toBe(true);
      request.resolve([{ id: 2, name: "late" }]);
      await nextTick();
      await nextTick();
      expect(table.getRow(2)).toBeUndefined();
      scope.stop();
    },
  );
  it("retains the custom cancellation protocol when supplied", () => {
    const scope = effectScope();
    const signal = { aborted: false, requestId: "tree" };
    const abort = vi.fn<() => void>(() => {
      signal.aborted = true;
    });
    const table = scope.run(() =>
      useDataTable<Order, typeof signal>({
        data,
        columns,
        hasChildren: () => true,
        createChildLoadController: () => ({ signal, abort }),
        loadChildren: (_row, received) => {
          expect(received.requestId).toBe("tree");
          return new Promise(() => {});
        },
      }),
    )!;
    table.toggleExpanded(1);
    scope.stop();
    expect(abort).toHaveBeenCalledOnce();
  });
});

describe("keyed grid editors", () => {
  it("follows row and column identities across sorting, column moves and upserts", () => {
    const { table, scope } = setup();
    const grid = scope.run(() => useDataGrid(table))!;
    grid.focusCell({ row: 0, column: 1 });
    grid.startEdit("8");
    table.sort("status", "desc");
    table.moveColumn("quantity", 0);
    table.upsertData([{ id: 3, status: "zebra", quantity: 4 }]);
    expect(grid.editor).toEqual({ position: { row: 2, column: 0 }, draft: "8" });
    expect(grid.selection?.focus).toEqual({ row: 2, column: 0 });
    expect(grid.commitEdit()?.status).toBe("applied");
    expect(table.getRow(1)?.original.quantity).toBe(8);
    expect(table.getRow(3)?.original.quantity).toBe(4);
    scope.stop();
  });
  it.each(["replace", "remove", "hide", "filter", "columns"])(
    "refuses an active grid editor after %s",
    (action) => {
      const { table, scope } = setup();
      const grid = scope.run(() => useDataGrid(table))!;
      grid.focusCell({ row: 0, column: 1 });
      grid.startEdit("8");
      if (action === "replace") table.upsertData([{ id: 1, status: "new", quantity: 5 }]);
      if (action === "remove") table.removeData([1]);
      if (action === "hide") table.toggleColumn("quantity");
      if (action === "filter") table.search("waiting");
      if (action === "columns") table.setColumns([{ id: "quantity", editable: true }]);
      expect(grid.editor).toBeUndefined();
      expect(grid.commitEdit()).toBeUndefined();
      expect(grid.lastResult?.issues[0]?.code).toBe("stale_draft");
      expect(table.getRow(1)?.original.quantity).not.toBe(8);
      scope.stop();
    },
  );
  it("updates async grid outcomes", async () => {
    const request = deferred<ValidationResult>();
    const { table, scope } = setup({
      columns: [
        {
          id: "quantity",
          editable: true,
          validate: (value) => (value === 8 ? request.promise : true),
        },
      ],
    });
    const grid = scope.run(() => useDataGrid(table))!;
    grid.startEdit("8");
    const result = grid.commitEdit()!;
    expect(grid.lastResult?.status).toBe("pending");
    request.resolve("Locked");
    await result.completion;
    expect(grid.lastResult?.status).toBe("rejected");
    grid.startEdit("9");
    expect(grid.commitEdit()?.status).toBe("applied");
    expect(grid.lastResult?.status).toBe("applied");
    scope.stop();
  });
  it("does not let an older completion replace the latest grid result", async () => {
    const request = deferred<ValidationResult>();
    const { table, scope } = setup({
      columns: [
        {
          id: "quantity",
          editable: true,
          validate: (value) => (value === 8 ? request.promise : true),
        },
      ],
    });
    const grid = scope.run(() => useDataGrid(table))!;
    grid.startEdit("8");
    const old = grid.commitEdit()!;
    grid.startEdit("9");
    grid.commitEdit();
    request.resolve(true);
    expect((await old.completion)?.status).toBe("rejected");
    expect(grid.lastResult?.status).toBe("applied");
    expect(table.getRow(1)?.original.quantity).toBe(9);
    scope.stop();
  });
  it("returns inert serializable editor metadata and infers numeric/boolean/date/text defaults", () => {
    const scope = effectScope();
    const spec: EditorSpec = {
      kind: "select",
      options: ["<script>alert(1)</script>", "shipped"],
      min: 1,
      max: 9,
      maxLength: 10,
      pattern: "x",
    };
    const table = scope.run(() =>
      useDataTable({
        data: [{ id: 1, status: "ready", quantity: 2, active: true, at: new Date(), empty: null }],
        columns: [
          { id: "status", editable: true, editor: spec },
          { id: "quantity", editable: true },
          { id: "active", editable: true },
          { id: "at", editable: true },
          { id: "empty", editable: true },
          { id: "id" },
        ],
      }),
    )!;
    const grid = scope.run(() => useDataGrid(table))!;
    const resolved = grid.editorFor({ row: 0, column: 0 })!;
    expect(resolved).toEqual(spec);
    expect(resolved).not.toBe(spec);
    expect(Object.isFrozen(resolved.options)).toBe(true);
    expect([1, 2, 3, 4].map((column) => grid.editorFor({ row: 0, column })?.kind)).toEqual([
      "number",
      "checkbox",
      "date",
      "text",
    ]);
    expect(grid.editorFor({ row: 0, column: 5 })).toBeUndefined();
    expect(grid.editorFor({ row: 99, column: 0 })).toBeUndefined();
    table.setColumns([
      {
        id: "status",
        editable: true,
        editor: { kind: "UnregisteredComponent" } as unknown as EditorSpec,
      },
    ]);
    expect(grid.editorFor({ row: 0, column: 0 })).toEqual({ kind: "text" });
    expect(grid.lastResult?.issues[0]?.code).toBe("invalid_value");
    table.setColumns([
      {
        id: "status",
        editable: true,
        editor: { kind: "select", options: [{ component: "Unsafe" }] } as unknown as EditorSpec,
      },
    ]);
    expect(grid.editorFor({ row: 0, column: 0 })).toEqual({ kind: "text" });
    scope.stop();
  });
});
