# Incremental data and streams

Use `appendData` for cursor pages or new source records. Use `upsertData` to replace known keys and append new ones, and `removeData` for source deletions. These operations keep local state and undo, without treating received data as unsaved user edits.

```ts
const table = createTable({
  data: [],
  columns,
  rowKey: "id",
  manual: true,
  paginate: false,
  expectedRowCount: 500,
  onDataChange: (next, changes) => {
    rows.value = next; // ingestion supplies an empty cell-change list
  },
});
table.appendData(cursorPage.rows);
table.upsertData([{ id: 17, name: "Updated item" }]);
table.removeData([19]);
```

Supply stable, unique keys through `rowKey` or an `id` on every row. A key function must not depend on the row's changing position. Each operation returns `{ status, appended, replaced, removed, issues }`; duplicate append keys and conflicting rows are refused and reported in the snapshot. Check issues before acknowledging source records.

In manual mode, rows accumulate in source order and local search/filter/sort are skipped. `rowCount` remains your server's matching total. Set `paginate: false` for a continuously growing list; the core does not fetch cursors or implement scrolling controls.

## Consume an async source

```ts
const controller = new AbortController(); // supplied by your runtime
const result = await table.stream(fetchChunks(), {
  signal: controller.signal,
  batchSize: 250,
  expectedRowCount: 500,
  mode: "append", // or "upsert" for keyed feed updates
});
if (result.status === "error") showIssues(result.issues);
```

The source yields one row or an array of rows. Each array is a batch; core splits it to `batchSize` and yields a microtask between publications. A single-row source publishes each yield. Reading waits for the previous publication, providing backpressure. Transport parsing, reconnects and authorization belong to your source adapter.

`loadState` progresses from `loading` to `streaming`, then `done`, `error` or `aborted`. `loadedRowCount` counts loaded rows before filtering (including loaded tree descendants); `expectedRowCount` is a caller hint and may remain unknown. `receivedRowCount` in the result counts accepted top-level incoming records in that run, including replacements. A failed source retains its received rows and reports a plain `stream_error` message. Recovered ingestion issues stay in the result while the source continues.

A new `stream` call aborts the previous run. An abort-listening signal interrupts even a blocked iterator read. A structural signal with only `aborted` is checked at source/batch boundaries. Core requests iterator cleanup but does not wait forever for an uncooperative iterator. Replacing foreign data or disposing the table also cancels the run; late rows and errors cannot affect the new state. Passing the exact array from `onDataChange` back through `setData` or Vue's data binding preserves the active stream.

## Keep local work

Edits, validation and undo remain available while data arrives. Incoming updates or deletions that would overwrite unsaved changes or pending validation report `ingestion_conflict`. Tree operations protect the affected branch, and locally removed rows remain protected until saved or reverted.

```ts
table.edit({ rowKey: 17, column: "name", value: "Local draft" });
const update = table.upsertData([{ id: 17, name: "Remote update" }]);
// update.issues includes ingestion_conflict; the local draft remains
await saveChanges(table.getPendingChanges());
table.markSaved([17]);
table.upsertData([{ id: 17, name: "Remote update" }]); // explicitly retry
```

Source operations create no undo step or pending-save record. Undo/redo applies user batches over received data, preserving independent incoming rows. After saving, a cell undo restores its recorded user value and becomes a pending edit against the latest source row. Source removal prunes undo entries, selection and expansion for deleted keys, notifying `onStateChange` when state changes. Use `insertRows`/`removeRows` for user actions that should be undoable.

Nested upserts address a child's key and require an immutable `setChildren`. Omitted children preserve loaded children; an explicit children array replaces them. Valid adjacency source rows can change parents; cached lazy children retain their parent. New duplicate/cycle/orphan/depth issues reject the candidate tree. Removing a parent removes loaded descendants. See [Tree data](/guide/trees) for lazy-cache ownership and cancellation.

## Cost and array ownership

Unsorted flat append indexes and filters only incoming rows; sorted append sorts new matches and merges them stably into the prior order. Paging does not repeat those stages. Ingestion publishes readonly array views, so the old dataset is not copied just to publish an append. Array access, iteration, `map`, `slice`, JSON output and `Array.isArray` work; mutation is refused. Use `Array.from(next)` when your application needs a mutable copy or a plain array for APIs such as `structuredClone`. Reading or copying the entire dataset costs O(n).

Expanded detail enumeration, tree processing, changed queries/columns, upserts and removals can visit existing rows. The [append benchmark](/benchmarks/streaming) covers flat append publication separately from those costs and rendering. There is no automatic transport or frame scheduling in core.

Run the [source example](/examples/streaming) to see progress, edit conflicts, undo retention and cancellation. Public decisions are recorded in [ADR 0006](/adr/0006-incremental-ingestion-and-streaming).

## Manage a source in Vue

Pass `source` to `useDataTable`, `<VueyeTable>`, or `<VueyeGrid>`. It accepts an async iterable or a factory returning one. `data` is optional and supplies initial rows. Define columns explicitly when those initial rows are empty, and give received rows stable keys.

```ts
import { ref } from "vue";
import { useDataTable } from "vueye-table";

const region = ref("North");
const table = useDataTable<Order>({
  columns,
  paginate: false,
  source: ({ signal }) => {
    const selectedRegion = region.value;
    return receiveOrders(selectedRegion, signal); // AsyncIterable<Order | readonly Order[]>
  },
  streamOptions: { mode: "upsert", batchSize: 250 },
});
```

Read reactive dependencies synchronously inside the factory, before returning the iterable. Changing a dependency or replacing a source ref aborts the previous signal before constructing the next factory. Scope disposal aborts pending reads; late results cannot enter the table. `retry()` reconstructs the source from current initial data. Use a factory when retrying: a consumed single-use iterator cannot restart itself.

Managed sources publish at most one Vue binding snapshot per rendering frame. Core ingestion and application callbacks still run for each batch; this does not make ingestion constant-cost. Non-component scopes use a 16ms timer. Tests or other rendering runtimes can supply `scheduleFrame(callback)`, returning a cancellation function. Direct calls to the binding's `stream()` keep their existing publication behavior.

Components defer source construction until mount. Server rendering shows initial rows, or an empty loading state, with the same first client markup. Fetch initial data in your application's server loader when needed; the package does not fetch a source during server rendering. Start the client source after those initial records to avoid duplicate keys.

## Load cursor pages

Choose `loadMore` instead of `source` for a paged service:

```vue
<script setup lang="ts">
import { VueyeTable, type LoadMore } from "vueye-table";

const loadMore: LoadMore<Order> = async ({ cursor, state, signal }) => {
  const page = await fetchOrders({
    cursor,
    search: state.search,
    sorting: state.sorting,
    filters: state.filters,
    signal,
  });
  return { rows: page.rows, cursor: page.nextCursor, done: page.nextCursor == null };
};
</script>

<template>
  <VueyeTable :columns="columns" :load-more="loadMore" virtual height="24rem" :end-threshold="5" />
</template>
```

The cursor is opaque (`unknown`) and starts as `undefined`. Narrow it in your loader. Return readonly rows and a boolean `done`. Only one page is requested at a time. Cursor mode defaults to `manual: true`, so the service owns search, filtering and sort order; pagination defaults off in the full components. Query changes abort the old request, restore initial data and request the first page with the new state, keeping page size. Selection and scroll position survive appended pages. Explicit source/query resets clear pending edits and undo; save or discard local work before resetting.

Virtual table and grid renderers request the next page when the rendered end reaches `endThreshold` remaining flattened items, including overscan. The default is 5; invalid values recover to 5 and report `invalid_stream_option`. Non-virtual composition uses `loadNext()` or the load-more button. A response with no rows, no changed cursor and `done: false` becomes a retryable error, preventing an endless request loop.

`loadingMode` is `source`, `cursor`, or `undefined`. The binding also exposes `canLoadMore`, `loadError`, `loadNext()` and `retry()`. A failed cursor request retains loaded rows and retries that same page. `loadState` is `idle` between pages and `done` after the final page. Choosing both `source` and `loadMore` reports a `stream_error`.

## Present progress and recovery

Full components include a polite status line with loaded counts, a retry control after errors, and a keyboard-accessible **Load more rows** button between cursor requests. The data table or grid has `aria-busy` while receiving rows. A visual loading sentinel below received cursor rows stays outside the logical row count and is hidden from assistive technology.

For composition, pair `DataTableStatus` with `DataTableLoadMore`, or `VtStatus` with `VtLoadMore`. Load-more labels are configurable with `label`, `loadingLabel` and `retryLabel`. The status slot adds `loadState`, `loadedRowCount`, `loadError`, `canLoadMore`, `loadNext` and `retry` to the existing range and selection fields. Provide translated status text through this slot.

Try the [live Vue source and cursor example](/examples/streaming-components), including table/grid switching and retry. The contract is recorded in [ADR 0015](/adr/0015-vue-sources-and-cursor-loading).
