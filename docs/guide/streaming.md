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

Expanded detail enumeration, tree processing, changed queries/columns, upserts and removals can visit existing rows. The [append benchmark](/benchmarks/streaming) covers flat append publication separately from those costs and rendering. There is no automatic transport or frame scheduling in core. Vue source adapters, infinite-scroll controls and component loading presentation remain follow-up work.

Run the [source example](/examples/streaming) to see progress, edit conflicts, undo retention and cancellation. Public decisions are recorded in [ADR 0006](/adr/0006-incremental-ingestion-and-streaming).
