import { mount } from "@vue/test-utils";
import {
  useDataTable,
  type DataTableBinding,
  type FrameScheduler,
  type LoadMore,
  type SourceContext,
} from "@vueye-table/vue";
import { describe, expect, it, vi } from "vitest";
import { effectScope, h, nextTick, ref, shallowRef, watch } from "vue";
import { renderToString } from "vue/server-renderer";

type Row = { id: number; name?: string };
const columns = [{ id: "id", sortable: true, filter: () => true }] as const;
function frames() {
  const queued = new Set<() => void>();
  const schedule: FrameScheduler = (publish) => {
    queued.add(publish);
    return () => {
      queued.delete(publish);
    };
  };
  return {
    schedule,
    flush() {
      const work = [...queued];
      queued.clear();
      for (const run of work) run();
    },
    queued,
  };
}
async function settle() {
  for (let i = 0; i < 30; i++) {
    // Each iterator continuation schedules the next microtask.
    // eslint-disable-next-line no-await-in-loop
    await Promise.resolve();
  }
  await nextTick();
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

describe("managed Vue sources", () => {
  it("coalesces binding snapshots per scheduled frame and preserves selected keys and pending edits", async () => {
    const scope = effectScope();
    const frame = frames();
    const gate = deferred<void>();
    const table = scope.run(() =>
      useDataTable<Row>({
        data: [{ id: 0, name: "seed" }],
        columns: [{ id: "name", editable: true }],
        paginate: false,
        scheduleFrame: frame.schedule,
        source: async function* () {
          yield { id: 1 };
          yield [{ id: 2 }, { id: 3 }];
          await gate.promise;
          yield { id: 4 };
        },
      }),
    )!;
    const changes = vi.fn<() => void>();
    scope.run(() => watch(() => table.snapshot, changes, { flush: "sync" }));
    await settle();
    expect(table.table.getSnapshot().loadedRowCount).toBe(4);
    expect(table.loadedRowCount).toBe(1);
    expect(frame.queued.size).toBe(1);
    frame.flush();
    expect(changes).toHaveBeenCalledTimes(1);
    expect(table.loadedRowCount).toBe(4);
    table.select([0]);
    table.edit({ rowKey: 0, column: "name", value: "draft" });
    gate.resolve();
    await settle();
    frame.flush();
    expect(table.loadState).toBe("done");
    expect(table.state.selection).toEqual([0]);
    expect(table.pendingChanges.updated).toHaveLength(1);
    expect(table.loadedRowCount).toBe(5);
    scope.stop();
  });
  it("aborts before constructing a changed factory and fences blocked stale iterators", async () => {
    const scope = effectScope();
    const region = ref(1);
    const frame = frames();
    const old = deferred<IteratorResult<Row>>();
    const signals: AbortSignal[] = [];
    const abortedBeforeStart: boolean[] = [];
    let returned = 0;
    const table = scope.run(() =>
      useDataTable<Row>({
        columns,
        scheduleFrame: frame.schedule,
        source: ({ signal }) => {
          abortedBeforeStart.push(signals[0]?.aborted ?? false);
          signals.push(signal);
          const id = region.value;
          return {
            [Symbol.asyncIterator]: () =>
              id === 1
                ? {
                    next: () => old.promise,
                    return: async () => {
                      returned++;
                      return { done: true, value: undefined };
                    },
                  }
                : (async function* () {
                    yield { id };
                  })(),
          };
        },
      }),
    )!;
    await settle();
    region.value = 2;
    await settle();
    frame.flush();
    old.resolve({ done: false, value: { id: 99 } });
    await settle();
    frame.flush();
    expect(table.rows.map((row) => row.key)).toEqual([2]);
    expect(returned).toBe(1);
    expect(abortedBeforeStart).toEqual([false, true]);
    scope.stop();
    expect(signals[1]?.aborted).toBe(true);
  });
  it("retries factory failures with initial seed rows and ignores calls after disposal", async () => {
    const scope = effectScope();
    const frame = frames();
    let attempts = 0;
    const table = scope.run(() =>
      useDataTable<Row>({
        data: [{ id: 0 }],
        columns,
        scheduleFrame: frame.schedule,
        source: () => {
          if (++attempts === 1) throw new Error("Disconnected");
          return (async function* () {
            yield { id: 1 };
          })();
        },
      }),
    )!;
    await settle();
    frame.flush();
    expect(table.loadError?.message).toBe("Disconnected");
    table.retry();
    await settle();
    frame.flush();
    expect(table.loadState).toBe("done");
    expect(table.loadedRowCount).toBe(2);
    scope.stop();
    table.retry();
    await table.loadNext();
    expect(attempts).toBe(2);
  });
  it("does not consume component factories on the server and hydrates seeded loading markup", async () => {
    const source = vi.fn<(context: SourceContext) => AsyncIterable<Row>>(
      async function* (_context) {
        yield { id: 2 };
      },
    );
    let table!: DataTableBinding<Row>;
    const frame = frames();
    const Component = {
      setup() {
        table = useDataTable<Row>({
          data: [{ id: 1 }],
          columns,
          source,
          scheduleFrame: frame.schedule,
        });
        return () => h("p", `${table.loadState}:${table.loadedRowCount}`);
      },
    };
    const html = await renderToString(h(Component));
    expect(html).toContain("loading:1");
    expect(source).not.toHaveBeenCalled();
    const host = document.createElement("div");
    host.innerHTML = html;
    document.body.append(host);
    const { createSSRApp } = await import("vue");
    const warnings = vi.spyOn(console, "warn");
    const app = createSSRApp(Component);
    app.mount(host);
    expect(host.textContent).toBe("loading:1");
    await settle();
    frame.flush();
    await nextTick();
    expect(host.textContent).toBe("done:2");
    expect(warnings).not.toHaveBeenCalled();
    app.unmount();
    host.remove();
  });
  it("supports iterable refs, upserts and disposal before the scheduled start", async () => {
    const scope = effectScope();
    const source = shallowRef(
      (async function* () {
        yield { id: 1, name: "new" };
      })(),
    );
    const frame = frames();
    const table = scope.run(() =>
      useDataTable<Row>({
        data: [{ id: 1, name: "old" }],
        columns,
        source,
        streamOptions: { mode: "upsert" },
        scheduleFrame: frame.schedule,
      }),
    )!;
    await settle();
    frame.flush();
    expect(table.rows[0]?.original.name).toBe("new");
    scope.stop();
    const early = effectScope();
    const factory = vi.fn<() => AsyncIterable<Row>>(async function* () {
      yield { id: 10 };
    });
    early.run(() => useDataTable<Row>({ columns, source: factory }));
    early.stop();
    await settle();
    expect(factory).not.toHaveBeenCalled();
  });
  it("uses the native frame scheduler and cleans up a pending frame on unmount", async () => {
    const source = async function* () {
      yield { id: 1 };
      await new Promise<void>(() => undefined);
    };
    let signal!: AbortSignal;
    const wrapper = mount({
      setup() {
        const table = useDataTable<Row>({
          columns,
          source: (context) => {
            signal = context.signal;
            return source();
          },
        });
        return () => h("div", table.loadedRowCount);
      },
    });
    await settle();
    wrapper.unmount();
    expect(signal.aborted).toBe(true);
  });
});

describe("cursor loading", () => {
  it("publishes reset rows while the replacement query page is still pending", async () => {
    const scope = effectScope();
    const frame = frames();
    const pending = deferred<{ rows: Row[]; done: boolean }>();
    const table = scope.run(() =>
      useDataTable<Row>({
        columns,
        scheduleFrame: frame.schedule,
        data: [{ id: 0 }],
        loadMore: async ({ state }) =>
          state.search ? pending.promise : { rows: [{ id: 1 }], cursor: 1, done: false },
      }),
    )!;
    await settle();
    frame.flush();
    expect(table.loadedRowCount).toBe(2);
    table.search("new query");
    await settle();
    frame.flush();
    expect(table.rows.map((row) => row.key)).toEqual([0]);
    expect(table.loadState).toBe("loading");
    pending.resolve({ rows: [{ id: 2 }], done: true });
    await settle();
    frame.flush();
    expect(table.rows.map((row) => row.key)).toEqual([0, 2]);
    scope.stop();
  });
  it("deduplicates pages, carries cursor/state, keeps rows on page-size changes and resets query changes", async () => {
    const scope = effectScope();
    const frame = frames();
    const calls: unknown[] = [];
    const next = deferred<{ rows: Row[]; cursor: number; done: boolean }>();
    const loader = vi.fn<LoadMore<Row>>(
      async ({ cursor, state }: { cursor: unknown; state: { search: string } }) => {
        calls.push([cursor, state.search]);
        if (calls.length === 2) return next.promise;
        return { rows: [{ id: calls.length }], cursor: calls.length, done: false };
      },
    );
    const table = scope.run(() =>
      useDataTable<Row>({
        columns,
        manual: true,
        paginate: false,
        loadMore: loader,
        scheduleFrame: frame.schedule,
      }),
    )!;
    await settle();
    frame.flush();
    expect(table.loadState).toBe("idle");
    expect(table.canLoadMore).toBe(true);
    const page = table.loadNext();
    const duplicate = table.loadNext();
    expect(duplicate).toBe(page);
    await settle();
    expect(loader).toHaveBeenCalledTimes(2);
    next.resolve({ rows: [{ id: 2 }], cursor: 2, done: false });
    await page;
    frame.flush();
    table.setPageSize(25);
    frame.flush();
    await settle();
    expect(loader).toHaveBeenCalledTimes(2);
    expect(table.loadedRowCount).toBe(2);
    table.search("new");
    await settle();
    frame.flush();
    expect(table.loadedRowCount).toBe(1);
    expect(calls.at(-1)).toEqual([undefined, "new"]);
    table.sort("id", "desc");
    await settle();
    frame.flush();
    table.filter("id", "x");
    await settle();
    frame.flush();
    expect(loader).toHaveBeenCalledTimes(5);
    scope.stop();
  });
  it("retries only the failed cursor and stops automatically on done", async () => {
    const scope = effectScope();
    const frame = frames();
    let attempts = 0;
    const cursors: unknown[] = [];
    const table = scope.run(() =>
      useDataTable<Row>({
        columns,
        scheduleFrame: frame.schedule,
        loadMore: async ({ cursor }) => {
          cursors.push(cursor);
          if (++attempts === 2) throw new Error("Offline");
          return { rows: [{ id: attempts }], cursor: attempts, done: attempts === 3 };
        },
      }),
    )!;
    await settle();
    frame.flush();
    await table.loadNext();
    frame.flush();
    expect(table.loadError?.message).toBe("Offline");
    expect(table.canLoadMore).toBe(false);
    table.retry();
    await settle();
    frame.flush();
    expect(cursors).toEqual([undefined, 1, 1]);
    expect(table.loadState).toBe("done");
    expect(table.loadedRowCount).toBe(2);
    await table.loadNext();
    expect(attempts).toBe(3);
    scope.stop();
  });
  it("aborts pending cursor calls on query change and disposal without stale rows", async () => {
    const scope = effectScope();
    const frame = frames();
    const blocked = deferred<{ rows: Row[]; done: boolean }>();
    const signals: AbortSignal[] = [];
    const table = scope.run(() =>
      useDataTable<Row>({
        columns,
        scheduleFrame: frame.schedule,
        loadMore: ({ signal }) => {
          signals.push(signal);
          return blocked.promise;
        },
      }),
    )!;
    await settle();
    table.search("different");
    await settle();
    expect(signals[0]?.aborted).toBe(true);
    expect(signals).toHaveLength(2);
    scope.stop();
    expect(signals[1]?.aborted).toBe(true);
    blocked.resolve({ rows: [{ id: 99 }], done: true });
    await settle();
    frame.flush();
    expect(table.loadedRowCount).toBe(0);
  });
  it.each([
    { rows: "invalid", done: true },
    { rows: [], done: "invalid" },
    { rows: [], done: false },
  ])("reports malformed or stalled responses as retryable issues (%j)", async (result) => {
    const scope = effectScope();
    const frame = frames();
    const table = scope.run(() =>
      useDataTable<Row>({
        columns,
        scheduleFrame: frame.schedule,
        loadMore: async () => result as never,
      }),
    )!;
    await settle();
    frame.flush();
    expect(table.loadError?.code).toBe("stream_error");
    expect(table.loadState).toBe("error");
    scope.stop();
  });
  it("reports simultaneous source and loadMore instead of starting both", async () => {
    const scope = effectScope();
    const frame = frames();
    const loader = vi.fn<LoadMore<Row>>();
    const table = scope.run(() =>
      useDataTable<Row>({
        columns,
        scheduleFrame: frame.schedule,
        source: async function* () {
          yield { id: 1 };
        },
        loadMore: loader,
      }),
    )!;
    await settle();
    frame.flush();
    expect(table.loadError?.message).toContain("Choose source or loadMore");
    expect(loader).not.toHaveBeenCalled();
    scope.stop();
  });
});
