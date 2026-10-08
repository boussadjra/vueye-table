import type {
  DataTable,
  StreamOptions,
  TableIssue,
  TableSnapshot,
  TableState,
} from "@vueye-table/core";
import {
  getCurrentInstance,
  onMounted,
  shallowRef,
  unref,
  watch,
  watchEffect,
  type MaybeRef,
  type WatchStopHandle,
} from "vue";

export interface SourceContext {
  readonly signal: AbortSignal;
}
export type TableSource<TRow> =
  | AsyncIterable<TRow | readonly TRow[]>
  | ((context: SourceContext) => AsyncIterable<TRow | readonly TRow[]>);
export interface LoadMoreContext extends SourceContext {
  /** Undefined on the first page. Validate or narrow the opaque cursor in your loader. */
  readonly cursor: unknown;
  readonly state: TableState;
}
export interface LoadMoreResult<TRow> {
  readonly rows: readonly TRow[];
  readonly cursor?: unknown;
  readonly done: boolean;
}
export type LoadMore<TRow> = (context: LoadMoreContext) => Promise<LoadMoreResult<TRow>>;
/** Schedule once per rendering frame and return its cancellation function. */
export type FrameScheduler = (publish: () => void) => () => void;
export interface SourceOptions<TRow> {
  readonly source?: MaybeRef<TableSource<TRow> | undefined> | undefined;
  readonly loadMore?: MaybeRef<LoadMore<TRow> | undefined> | undefined;
  readonly streamOptions?: Omit<StreamOptions, "signal"> | undefined;
  /** Non-component scopes use a 16ms timer by default. */
  readonly scheduleFrame?: FrameScheduler | undefined;
  /** Remaining flattened items at which a virtual renderer requests the next cursor page. */
  readonly endThreshold?: number | undefined;
}

export interface SourceBinding {
  readonly endThreshold: number;
  readonly loadingMode: "source" | "cursor" | undefined;
  readonly canLoadMore: boolean;
  readonly loadError: TableIssue | undefined;
  loadNext(this: void): Promise<void>;
  retry(this: void): void;
}

/** Internal owner of one cancellable source, using the engine's ingestion/conflict boundary. */
export function createSource<TRow>(
  table: DataTable<TRow>,
  options: SourceOptions<TRow>,
  seed: () => readonly TRow[],
  publish: (next: TableSnapshot<TRow>) => void,
): SourceBinding & {
  update(this: void, next: TableSnapshot<TRow>): void;
  dispose(this: void): void;
  initial(this: void): TableSnapshot<TRow>;
} {
  const instance = getCurrentInstance();
  const requestedThreshold = options.endThreshold ?? 5;
  const endThreshold =
    Number.isSafeInteger(requestedThreshold) && requestedThreshold >= 0 ? requestedThreshold : 5;
  const optionIssues: readonly TableIssue[] =
    requestedThreshold === endThreshold
      ? []
      : [
          Object.freeze({
            code: "invalid_stream_option",
            message: "endThreshold must be a non-negative safe integer; 5 is used.",
          }),
        ];
  const mode = shallowRef<"source" | "cursor" | undefined>(undefined);
  const more = shallowRef(false);
  const retryVersion = shallowRef(0);
  const query = shallowRef(table.getState());
  let cursor: unknown;
  let controller: AbortController | undefined;
  let task: Promise<void> | undefined;
  let cancelFrame: (() => void) | undefined;
  let pending: TableSnapshot<TRow> | undefined;
  let active = false;
  let disposed = false;
  let mounted = !instance;
  let first = true;
  let cursorFailed = false;
  let generation = 0;
  let stops: WatchStopHandle[] = [];
  const initialMode = (): "source" | "cursor" | undefined =>
    unref(options.source) ? "source" : unref(options.loadMore) ? "cursor" : undefined;
  const schedule: FrameScheduler =
    options.scheduleFrame ??
    ((flush) => {
      // Component sources start after mount, so the owning element supplies its frame scheduler.
      const view = (instance?.proxy?.$el as Element | undefined)?.ownerDocument?.defaultView;
      if (view) {
        const id = view.requestAnimationFrame(flush);
        return () => view.cancelAnimationFrame(id);
      }
      const id = setTimeout(flush, 16);
      return () => clearTimeout(id);
    });
  const project = (next: TableSnapshot<TRow>): TableSnapshot<TRow> => {
    const loadState =
      !mounted && initialMode()
        ? "loading"
        : mode.value === "cursor" && more.value && next.loadState === "done"
          ? "idle"
          : next.loadState;
    return loadState === next.loadState && optionIssues.length === 0
      ? next
      : Object.freeze({
          ...next,
          loadState,
          issues: Object.freeze([...next.issues, ...optionIssues]),
        });
  };
  const flush = (): void => {
    cancelFrame = undefined;
    if (pending && !disposed) {
      active = pending.loadState === "loading" || pending.loadState === "streaming";
      publish(project(pending));
    }
    pending = undefined;
  };
  const update = (next: TableSnapshot<TRow>): void => {
    const state = next.state;
    const previous = query.value;
    if (
      previous.sorting !== state.sorting ||
      previous.search !== state.search ||
      previous.filters !== state.filters
    ) {
      query.value = state;
      // A synchronous cursor reset can replace this notification's data while keeping its query.
      next = table.getSnapshot();
    }
    if (active) {
      pending = next;
      cancelFrame ??= schedule(flush);
    } else publish(project(next));
  };
  const stop = (): void => {
    controller?.abort();
    controller = undefined;
    task = undefined;
    active = false;
    cancelFrame?.();
    cancelFrame = undefined;
    pending = undefined;
  };
  const reset = (): void => {
    stop();
    cursor = undefined;
    cursorFailed = false;
    if (!first) table.setData(seed());
    first = false;
  };
  const loadNext = (): Promise<void> => {
    if (disposed || !mounted || mode.value !== "cursor" || !more.value || cursorFailed)
      return Promise.resolve();
    if (task) return task;
    const loader = unref(options.loadMore)!;
    const run = new AbortController();
    controller = run;
    active = true;
    const state = table.getState();
    const previousCursor = cursor;
    const source: AsyncIterable<readonly TRow[]> = {
      async *[Symbol.asyncIterator]() {
        const result = await loader({ cursor: previousCursor, state, signal: run.signal });
        if (run.signal.aborted) return;
        if (!Array.isArray(result.rows) || typeof result.done !== "boolean")
          throw new Error("loadMore must return rows and a boolean done flag.");
        // Refuse an endless empty-page loop while keeping its retryable error visible.
        if (!result.done && result.rows.length === 0 && Object.is(result.cursor, previousCursor))
          throw new Error(
            "loadMore returned no rows or cursor progress. Retry after correcting the response.",
          );
        cursor = result.cursor;
        more.value = !result.done;
        yield result.rows;
      },
    };
    task = table.stream(source, { ...options.streamOptions, signal: run.signal }).then((result) => {
      if (controller !== run || disposed) return undefined;
      cursorFailed = result.status === "error";
      task = undefined;
      // Keep the final metadata coalesced with the last data batch.
      if (!cancelFrame) active = false;
      return undefined;
    });
    return task;
  };
  const start = (): void => {
    if (disposed) return;
    mounted = true;
    stops = [
      watchEffect((cleanup) => {
        void retryVersion.value;
        const source = unref(options.source);
        const loader = unref(options.loadMore);
        const run = new AbortController();
        const ticket = ++generation;
        cleanup(() => run.abort());
        let iterable: AsyncIterable<TRow | readonly TRow[]> | undefined;
        if (source) {
          // Invoke the factory inside this effect to track its reactive dependencies.
          try {
            iterable = typeof source === "function" ? source({ signal: run.signal }) : source;
          } catch (error) {
            iterable = {
              [Symbol.asyncIterator]: () => ({ next: () => Promise.reject(error) }),
            };
          }
          if (loader)
            iterable = {
              [Symbol.asyncIterator]: () => ({
                next: () =>
                  Promise.reject(
                    new Error("Choose source or loadMore, rather than combining them."),
                  ),
              }),
            };
        }
        // Effects track only source construction. Loading and seed reads must not subscribe the
        // source to its own progress, selection, or emitted data round trips.
        queueMicrotask(() => {
          if (disposed || run.signal.aborted || ticket !== generation) return;
          reset();
          mode.value = source ? "source" : loader ? "cursor" : undefined;
          more.value = !!loader && !source;
          if (iterable) {
            controller = run;
            active = true;
            void table
              .stream(iterable, { ...options.streamOptions, signal: run.signal })
              .then(() => {
                if (controller === run && !cancelFrame) active = false;
                return undefined;
              });
          } else if (loader) void loadNext();
          else update(table.getSnapshot());
        });
      }),
      watch(
        query,
        () => {
          if (mode.value !== "cursor") return;
          reset();
          more.value = true;
          void loadNext();
        },
        { flush: "sync" },
      ),
    ];
  };
  if (instance) onMounted(start);
  // The first snapshot must exist before a synchronous non-component source starts.
  else queueMicrotask(start);
  return {
    endThreshold,
    get loadingMode() {
      return mode.value ?? (!mounted ? initialMode() : undefined);
    },
    get canLoadMore() {
      return more.value && !cursorFailed && !task;
    },
    get loadError() {
      const next = table.getSnapshot();
      return next.loadState === "error"
        ? next.issues.find((item) => item.code === "stream_error")
        : undefined;
    },
    loadNext,
    retry() {
      if (disposed) return;
      if (mode.value === "cursor" && cursorFailed) {
        cursorFailed = false;
        void loadNext();
      } else retryVersion.value++;
    },
    update,
    initial: () => project(table.getSnapshot()),
    dispose() {
      disposed = true;
      stop();
      for (const disposeWatch of stops) disposeWatch();
      stops = [];
    },
  };
}
