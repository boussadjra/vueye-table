import {
  createTable,
  type TableOptions,
  type TableSnapshot,
  type StreamSignal,
} from "@vueye-table/core";
import { describe, expect, it, vi } from "vitest";

interface Entry {
  readonly id: number;
  readonly name: string;
  readonly value: number;
  readonly parent?: number;
  readonly children?: readonly Entry[];
}
const row = (id: number, value = id): Entry => ({ id, name: `Item ${id}`, value });
const create = (options: Partial<TableOptions<Entry>> = {}) =>
  createTable<Entry>({
    data: [row(1), row(2)],
    columns: [
      { id: "name", editable: true },
      { id: "value", editable: true },
    ],
    ...options,
  });
const keys = (snapshot: TableSnapshot<Entry>) => snapshot.processedRows.map((entry) => entry.key);
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
async function* chunks(
  ...items: (Entry | readonly Entry[])[]
): AsyncGenerator<Entry | readonly Entry[]> {
  yield* items;
}

describe("incremental source ingestion", () => {
  it("appends immutable array-compatible views and keeps old revisions intact", () => {
    const data = Object.freeze([row(1), row(2)]);
    const received: (readonly Entry[])[] = [];
    const table = create({
      data,
      paginate: false,
      onDataChange: (next, changes) => {
        received.push(next);
        expect(changes).toEqual([]);
      },
    });
    const before = table.getSnapshot();
    const oldRow = before.getRow(1);
    expect(table.appendData(Object.freeze([row(3)]))).toMatchObject({
      status: "applied",
      appended: 1,
      replaced: 0,
    });
    const firstData = received[0]!;
    table.appendData([row(4)]);
    expect(data).toHaveLength(2);
    expect(Array.isArray(firstData)).toBe(true);
    expect(Object.keys(firstData)).toEqual(["0", "1", "2"]);
    expect(Object.getOwnPropertyDescriptor(firstData, "length")?.value).toBe(3);
    expect(Reflect.preventExtensions(firstData)).toBe(false);
    expect(Reflect.setPrototypeOf(firstData, null)).toBe(false);
    expect(JSON.parse(JSON.stringify(firstData))).toHaveLength(3);
    expect(firstData.slice(1).map((item) => item.id)).toEqual([2, 3]);
    expect(() => (firstData as Entry[]).push(row(5))).toThrow(TypeError);
    expect(() => Reflect.defineProperty(firstData, "0", { value: row(99) })).not.toThrow();
    expect(Reflect.deleteProperty(firstData, "0")).toBe(false);
    expect(keys(before)).toEqual([1, 2]);
    expect(before.getRow(3)).toBeUndefined();
    expect(table.getSnapshot().getRow(1)).toBe(oldRow);
    expect(keys(table.getSnapshot())).toEqual([1, 2, 3, 4]);
    expect(table.getSnapshot().loadedRowCount).toBe(4);
    expect(table.getSnapshot().canUndo).toBe(false);
    expect(table.getPendingChanges()).toEqual({ inserted: [], updated: [], removed: [] });
  });

  it("indexes and filters only incoming rows and memoizes page/selection changes", () => {
    const readKey = vi.fn<(item: Entry) => number>((item) => item.id);
    const matches = vi.fn<(value: unknown, filter: unknown, item: Entry) => boolean>(
      (_value, filter, item) => item.value >= Number(filter),
    );
    const table = create({
      rowKey: readKey,
      data: Array.from({ length: 100 }, (_, index) => row(index)),
      columns: [{ id: "value", filter: matches }],
      initialState: { filters: { value: 50 }, pagination: { page: 1, pageSize: 10 } },
    });
    table.getSnapshot();
    readKey.mockClear();
    matches.mockClear();
    table.appendData([row(100), row(101), row(102, 0)]);
    expect(table.getSnapshot().rowCount).toBe(52);
    expect(readKey).toHaveBeenCalledTimes(6); // ingestion key checks and new row wrappers only
    expect(matches).toHaveBeenCalledTimes(3);
    table.nextPage();
    table.select([100]);
    expect(table.getSnapshot().selectedCount).toBe(1);
    expect(matches).toHaveBeenCalledTimes(3);
    table.search("101");
    expect(keys(table.getSnapshot())).toEqual([101]);
    table.clearFilters();
    table.appendData([row(103)]);
    expect(keys(table.getSnapshot())).toEqual([101]);
    table.search("");
    expect(table.getSnapshot().loadedRowCount).toBe(104);
  });

  it("sorts new rows then merges stably, including descending empties and multiple rules", () => {
    const table = create({
      data: [row(1, 5), row(2, 5), row(3, 9)],
      initialState: { sorting: [{ column: "value", direction: "asc" }] },
    });
    table.getSnapshot();
    table.appendData([row(4, 5), row(5, 1)]);
    expect(keys(table.getSnapshot())).toEqual([5, 1, 2, 4, 3]);
    table.sort("value", "desc");
    table.appendData([{ ...row(6), value: null as unknown as number }, row(7, 5)]);
    expect(keys(table.getSnapshot())).toEqual([3, 1, 2, 4, 7, 5, 6]);
    table.sort("name", "desc", { multi: true });
    table.appendData([row(8, 5)]);
    expect(keys(table.getSnapshot())).toEqual([3, 8, 7, 4, 2, 1, 5, 6]);
  });

  it("accumulates manual cursor pages without applying local sort/filter", () => {
    const table = create({
      manual: true,
      rowCount: 30,
      expectedRowCount: 30,
      initialState: {
        search: "absent",
        filters: { value: 100 },
        sorting: [{ column: "value", direction: "desc" }],
      },
    });
    table.appendData([row(3)]);
    expect(keys(table.getSnapshot())).toEqual([1, 2, 3]);
    expect(table.getSnapshot()).toMatchObject({
      loadedRowCount: 3,
      expectedRowCount: 30,
      rowCount: 30,
    });
  });

  it("recovers duplicate/invalid source rows and accepts the rest", () => {
    const table = create();
    expect(table.appendData([row(2), row(3), row(3)])).toMatchObject({
      status: "partial",
      appended: 1,
      issues: [{ code: "duplicate_row_key" }, { code: "duplicate_row_key" }],
    });
    expect(table.appendData([]).status).toBe("unchanged");
    expect(table.upsertData([row(1), row(1)]).issues[0]?.code).toBe("duplicate_row_key");
    const unchanged = table.getSnapshot().getRow(1)!.original;
    expect(table.upsertData([unchanged, row(1, 100)]).issues[0]?.code).toBe("duplicate_row_key");
    expect(table.getSnapshot().getRow(1)?.original.value).toBe(1);
    expect(
      create({ data: [{ name: "A", value: 1 } as Entry] }).appendData([row(3)]).issues[0]?.code,
    ).toBe("invalid_ingestion");
    expect(table.appendData([{ ...row(4), id: Number.NaN }]).issues[0]?.code).toBe(
      "invalid_ingestion",
    );
    const unreadable = {
      ...row(99),
      get id(): number {
        throw new Error("Unreadable source key");
      },
    };
    expect(table.appendData([unreadable]).issues[0]?.message).toBe("Unreadable source key");
    const broken = create({
      rowKey: (item) => {
        if (item.id === 99) throw new Error("bad key");
        return item.id;
      },
    });
    expect(broken.appendData([row(99), row(3)])).toMatchObject({
      status: "partial",
      appended: 1,
      issues: [{ message: "bad key" }],
    });
    const expand = create({
      getRowCanExpand: (item) => {
        if (item.id === 99) throw new Error("bad expand");
        return false;
      },
    });
    expect(expand.appendData([row(99)]).status).toBe("rejected");
    expect(keys(expand.getSnapshot())).toEqual([1, 2]);
  });

  it("upserts clean rows, keeps local edits and rebases structural undo over incoming data", () => {
    const table = create();
    table.edit({ rowKey: 1, column: "value", value: 10 });
    table.insertRows([row(3)]);
    expect(table.upsertData([row(1, 99), row(2, 20), row(4)])).toMatchObject({
      status: "partial",
      appended: 1,
      replaced: 1,
      issues: [{ code: "ingestion_conflict" }],
    });
    expect(table.getSnapshot().getRow(1)?.original.value).toBe(10);
    expect(table.getSnapshot().getRow(2)?.original.value).toBe(20);
    expect(table.undo()).toBe(true);
    expect(keys(table.getSnapshot())).toEqual([1, 2, 4]);
    expect(table.undo()).toBe(true);
    expect(table.getSnapshot().getRow(1)?.original.value).toBe(1);
    expect(table.getSnapshot().getRow(2)?.original.value).toBe(20);
    expect(table.redo()).toBe(true);
    expect(table.redo()).toBe(true);
    expect(keys(table.getSnapshot())).toEqual([1, 2, 3, 4]);
    table.revert();
    expect(keys(table.getSnapshot())).toEqual([1, 2, 4]);
  });

  it("retains append data through structural undo/redo and branching, including saved edits", () => {
    const table = create();
    table.removeRows([1]);
    table.appendData([row(3)]);
    table.undo();
    expect(keys(table.getSnapshot())).toEqual([1, 2, 3]);
    table.redo();
    expect(keys(table.getSnapshot())).toEqual([2, 3]);
    table.undo();
    table.insertRows([row(4)]);
    table.appendData([row(5)]);
    table.undo();
    expect(keys(table.getSnapshot())).toEqual([1, 2, 3, 5]);
    table.edit({ rowKey: 2, column: "value", value: 20 });
    table.markSaved();
    table.upsertData([row(2, 200)]);
    table.undo();
    expect(table.getSnapshot().getRow(2)?.original.value).toBe(2);
    expect(table.getPendingChanges().updated[0]?.previous.value).toBe(200);
  });

  it("removes clean rows, prunes selection/undo, and protects local removed keys", () => {
    const table = create();
    table.select([1, 2]);
    table.edit({ rowKey: 1, column: "value", value: 10 });
    table.markSaved();
    expect(table.removeData([1, 99])).toMatchObject({
      status: "partial",
      removed: 1,
      issues: [{ code: "unknown_row" }],
    });
    expect(table.getState().selection).toEqual([2]);
    expect(table.undo()).toBe(false);
    table.removeRows([2]);
    expect(table.appendData([row(2)]).issues[0]?.code).toBe("ingestion_conflict");
    table.undo();
    table.edit({ rowKey: 2, column: "value", value: 22 });
    expect(table.removeData([2]).issues[0]?.code).toBe("ingestion_conflict");
    table.destroy();
    expect(table.removeData([2]).status).toBe("rejected");
    expect(table.appendData([row(3)]).status).toBe("rejected");
  });

  it("protects pending async validation, which still settles across unrelated appends", async () => {
    const validation = deferred<true>();
    const table = create({
      columns: [{ id: "value", editable: true, validate: () => validation.promise }],
    });
    table.edit({ rowKey: 1, column: "value", value: 10 });
    expect(table.upsertData([row(1, 99)]).issues[0]?.code).toBe("ingestion_conflict");
    expect(table.removeData([1]).issues[0]?.code).toBe("ingestion_conflict");
    table.appendData([row(3)]);
    validation.resolve(true);
    await flush();
    expect(table.getSnapshot().getRow(1)?.original.value).toBe(10);
    expect(table.undo()).toBe(true);
    expect(keys(table.getSnapshot())).toEqual([1, 2, 3]);
  });

  it("upserts/removes nested descendants, preserves expansion and rejects conflicting branches", () => {
    const table = create({
      data: [{ ...row(1), children: [row(2)] }],
      getChildren: (item) => item.children,
      setChildren: (item, children) => ({ ...item, children }),
    });
    table.toggleExpanded(1, true);
    table.select([2]);
    expect(table.upsertData([row(2, 20)]).replaced).toBe(1);
    expect(keys(table.getSnapshot())).toEqual([1, 2]);
    expect(table.getSnapshot().getRow(2)?.original.value).toBe(20);
    expect(table.upsertData([row(1, 100)]).status).toBe("applied");
    expect(table.getSnapshot().getRow(2)?.original.value).toBe(20);
    table.edit({ rowKey: 2, column: "value", value: 21 });
    expect(table.upsertData([{ ...row(1), children: [row(3)] }]).issues[0]?.code).toBe(
      "ingestion_conflict",
    );
    table.revert();
    expect(table.upsertData([{ ...row(1), children: [row(3)] }]).status).toBe("applied");
    expect(keys(table.getSnapshot())).toEqual([1, 3]);
    expect(table.getState().selection).not.toContain(2);
    expect(table.removeData([1]).removed).toBe(2);
    expect(keys(table.getSnapshot())).toEqual([]);
  });

  it("rejects tree orphans/cycles/duplicates and missing nested write inverses atomically", () => {
    const adjacency = create({ getParentKey: (item) => item.parent });
    expect(adjacency.appendData([{ ...row(3), parent: 99 }]).issues[0]?.code).toBe("tree_orphan");
    expect(
      adjacency.upsertData([
        { ...row(1), parent: 2 },
        { ...row(2), parent: 1 },
      ]).issues[0]?.code,
    ).toBe("tree_cycle");
    adjacency.appendData([{ ...row(3), parent: 1 }]);
    adjacency.toggleExpanded(1, true);
    expect(keys(adjacency.getSnapshot())).toEqual([1, 3, 2]);
    const nested = create({
      data: [{ ...row(1), children: [row(2)] }],
      getChildren: (item) => item.children,
    });
    expect(nested.upsertData([row(2, 20)]).issues[0]?.code).toBe("invalid_ingestion");
    expect(nested.removeData([2]).status).toBe("rejected");
    expect(nested.appendData([{ ...row(3), children: [row(2)] }]).issues[0]?.code).toBe(
      "duplicate_row_key",
    );
    expect(
      nested
        .appendData([{ ...row(3), children: [{ name: "No id", value: 1 } as Entry] }])
        .issues.some((problem) => problem.code === "invalid_ingestion"),
    ).toBe(true);
  });

  it("reconciles lazy adjacency children and preserves unrelated loaded caches across source undo", async () => {
    const table = create({
      data: [row(1), row(2)],
      getParentKey: (item) => item.parent,
      hasChildren: (item) => item.id <= 2,
      loadChildren: async (item) => [{ ...row(Number(item.key) + 10), parent: Number(item.key) }],
      createChildLoadController: () => new AbortController(),
    });
    table.toggleExpanded(1, true);
    table.toggleExpanded(2, true);
    await flush();
    expect(table.upsertData([{ ...row(11, 99), parent: 1 }]).replaced).toBe(1);
    expect(table.getSnapshot().getRow(11)?.original.value).toBe(99);
    expect(table.upsertData([{ ...row(11), parent: 2 }]).status).toBe("rejected");
    table.insertRows([row(3)]);
    table.removeData([11]);
    table.undo();
    expect(table.getSnapshot().getRow(11)).toBeUndefined();
    expect(table.getSnapshot().getRow(12)).toBeDefined();
  });
});

describe("streaming sources", () => {
  it("publishes loading, one snapshot per bounded batch, and done with source counts", async () => {
    const table = create({ data: [], initialState: { search: "no match" } });
    const snapshots: TableSnapshot<Entry>[] = [];
    table.subscribe((snapshot) => snapshots.push(snapshot));
    const result = await table.stream(chunks([row(1), row(2), row(3), row(4), row(5)]), {
      batchSize: 2,
      expectedRowCount: 5,
    });
    expect(result).toEqual({ status: "done", receivedRowCount: 5, issues: [] });
    expect(snapshots.map((snapshot) => snapshot.loadState)).toEqual([
      "loading",
      "streaming",
      "streaming",
      "streaming",
      "done",
    ]);
    expect(snapshots.map((snapshot) => snapshot.loadedRowCount)).toEqual([0, 2, 4, 5, 5]);
    expect(table.getSnapshot()).toMatchObject({ rowCount: 0, expectedRowCount: 5 });
    expect(snapshots[1]?.loadedRowCount).toBe(2);
  });

  it("handles individual yields, empty chunks, upserts and recovered source conflicts", async () => {
    const table = create();
    const result = await table.stream(chunks([], row(2, 20), row(3)), { mode: "upsert" });
    expect(result).toMatchObject({ status: "done", receivedRowCount: 2 });
    expect(table.getSnapshot().getRow(2)?.original.value).toBe(20);
    const duplicate = await table.stream(chunks(row(3), row(4)));
    expect(duplicate).toMatchObject({
      status: "done",
      receivedRowCount: 1,
      issues: [{ code: "duplicate_row_key" }],
    });
    expect(table.getSnapshot().issues.some((problem) => problem.code === "duplicate_row_key")).toBe(
      true,
    );
  });

  it("retains rows received before a source error and reports plain issues", async () => {
    async function* broken(): AsyncGenerator<Entry> {
      yield row(3);
      throw new Error("Connection lost <b>plain</b>");
    }
    const table = create();
    const result = await table.stream(broken());
    expect(result).toMatchObject({
      status: "error",
      receivedRowCount: 1,
      issues: [{ code: "stream_error", message: "Connection lost <b>plain</b>" }],
    });
    expect(table.getSnapshot().loadState).toBe("error");
    expect(keys(table.getSnapshot())).toEqual([1, 2, 3]);
    const invalid = await table.stream({
      [Symbol.asyncIterator]() {
        throw "bad iterator";
      },
    });
    expect(invalid.issues[0]?.message).toBe("bad iterator");
  });

  it("aborts while next is unresolved, closes the iterator and ignores late rows/rejections", async () => {
    const next = deferred<IteratorResult<Entry>>();
    const closed = vi.fn<() => Promise<IteratorResult<Entry>>>(async () => ({
      done: true as const,
      value: undefined,
    }));
    const source = { [Symbol.asyncIterator]: () => ({ next: () => next.promise, return: closed }) };
    const table = create();
    const controller = new AbortController();
    const task = table.stream(source, { signal: controller.signal });
    controller.abort();
    expect(await task).toMatchObject({ status: "aborted", receivedRowCount: 0 });
    await flush();
    expect(closed).toHaveBeenCalledTimes(1);
    next.reject(new Error("late failure"));
    await flush();
    expect(table.getSnapshot().loadState).toBe("aborted");
    expect(keys(table.getSnapshot())).toEqual([1, 2]);
    const pre = new AbortController();
    pre.abort();
    expect((await table.stream(chunks(row(3)), { signal: pre.signal })).status).toBe("aborted");
  });

  it("supersedes a previous source and preserves the current source state", async () => {
    const delayed = deferred<IteratorResult<Entry>>();
    const table = create();
    const old = table.stream({ [Symbol.asyncIterator]: () => ({ next: () => delayed.promise }) });
    const current = table.stream(chunks(row(4)));
    expect((await old).status).toBe("aborted");
    expect((await current).status).toBe("done");
    delayed.resolve({ done: false, value: row(3) });
    await flush();
    expect(table.getSnapshot().loadState).toBe("done");
    expect(keys(table.getSnapshot())).toEqual([1, 2, 4]);
  });

  it("cancels foreign replacement and disposal without late metadata overwrites", async () => {
    const delayed = deferred<IteratorResult<Entry>>();
    const source = { [Symbol.asyncIterator]: () => ({ next: () => delayed.promise }) };
    const table = create();
    const old = table.stream(source);
    table.setData([row(9)]);
    expect((await old).status).toBe("aborted");
    expect(table.getSnapshot().loadState).toBe("idle");
    expect(keys(table.getSnapshot())).toEqual([9]);
    const task = table.stream(source);
    table.destroy();
    expect((await task).status).toBe("aborted");
    expect((await table.stream(chunks(row(3)))).issues[0]?.code).toBe("invalid_ingestion");
  });

  it("keeps a stream through the own-array round trip and allows local edits", async () => {
    const pause = deferred<void>();
    let data: readonly Entry[] = [row(1)];
    const table = create({
      data,
      onDataChange: (next) => {
        data = next;
        table.setData(next);
      },
    });
    async function* source(): AsyncGenerator<Entry> {
      yield row(2);
      await pause.promise;
      yield row(3);
    }
    const task = table.stream(source());
    await flush();
    table.edit({ rowKey: 1, column: "value", value: 10 });
    pause.resolve();
    expect((await task).status).toBe("done");
    expect(data.map((item) => item.id)).toEqual([1, 2, 3]);
    expect(table.undo()).toBe(true);
    expect(table.getSnapshot().getRow(1)?.original.value).toBe(1);
  });

  it("recovers invalid hints and observes a structural polling-only signal", async () => {
    const table = create();
    const result = await table.stream(chunks(row(3)), { batchSize: 0, expectedRowCount: -1 });
    expect(result.issues.map((problem) => problem.code)).toEqual([
      "invalid_stream_option",
      "invalid_stream_option",
    ]);
    const signal: StreamSignal = { aborted: true };
    expect((await table.stream(chunks(row(4)), { signal })).status).toBe("aborted");
    expect(table.getSnapshot().expectedRowCount).toBeUndefined();
    const invalidHint = create({ expectedRowCount: -1 });
    expect(invalidHint.getSnapshot()).toMatchObject({
      expectedRowCount: undefined,
      issues: [{ code: "invalid_stream_option" }],
    });
  });
});
