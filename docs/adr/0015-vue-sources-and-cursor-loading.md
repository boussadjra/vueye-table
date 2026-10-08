# 0015 — Vue sources and cursor loading

Status: accepted (provisional alpha API)

## Decision

`useDataTable` owns an optional `source` or `loadMore`, together with its native abort signal,
reactive factory dependencies, retry and scope lifetime. `data` becomes optional and supplies
initial rows; source restarts and query resets replace accumulated rows with the current initial
array. Choose one input mode. Combining the two produces a retryable `stream_error`.

Source factories receive `{ signal }` and return an async iterable of rows or readonly batches.
Factories are invoked in a Vue effect, so synchronous reactive reads restart the source. The old
signal is aborted before the next factory is invoked. A factory is required for reliable retry;
an iterable instance may be single use. Parsing NDJSON, authorization and reconnect strategies
remain application concerns. No transport or Nitro server helper is added.

Components defer factory invocation and cursor requests until mount. Their first server and client
render use the same initial rows and `loading` status. A non-component effect scope starts on the
next microtask. Server data fetching stays with the application: provide the fetched initial array
and make the client source resume after its last key/cursor.

Engine ingestion remains immediate and retains its batching, backpressure, conflict issues and
undo semantics. The Vue binding coalesces managed-source snapshot replacements into at most one
publication per scheduled frame. Components use their owning element's frame scheduler. Other
scopes use a 16ms timer or the explicit `scheduleFrame` option. This bounds reactive publication,
not ingestion work or rendering duration. Core has no frame scheduler or browser dependencies.

`loadMore({ cursor, state, signal })` resolves `{ rows, cursor, done }`. Cursors are opaque `unknown`
values, initially undefined. A table has one pending request; concurrent `loadNext()` calls share
it. Cursor mode defaults to manual processing unless explicitly overridden. It is `idle` between
pages and `done` after the final page; `canLoadMore`, `loadError`, `loadingMode`, `loadNext()` and
`retry()` are plain binding members. Retry keeps the last successful cursor and accumulated rows.
Invalid or stalled responses become a `stream_error`; no automatic retry loop runs after errors.

Changes to sorting, search or filters abort the pending page, reset the cursor and initial rows,
and request a new first page. Page-size changes keep loaded rows. Source replacement and scope
disposal abort pending work and reject late results, even if the loader ignores its signal.

The virtual renderer requests another page within `endThreshold` flattened items of the end,
including overscan. The default is 5; invalid values recover to 5 with `invalid_stream_option`.
Initial loading can fill a short viewport through successive pages. Use an advancing cursor and
an eventual `done` flag. A keyboard-accessible load-more button also works without virtualization.

Headless `DataTableStatus` adds loading metadata and recovery operations to its slot. The new
`DataTableLoadMore` has a styled `VtLoadMore` wrapper. Table/grid bodies add an inert loading
sentinel after their data rows, outside the logical row count. Full components accept the same
source/loader props, default accumulated data to unpaged results, and keep their status/retry
footer visible. Busy state is on the table/grid so the live status region can announce progress.

## Consequences

Stable row keys preserve loaded selection, expansion, virtual anchoring and pending edits while
rows arrive. Explicit source/query resets replace data and follow normal replacement semantics,
including clearing pending edits and undo. Applications must save local work before such resets.
Bindings may lag the underlying engine by one scheduled frame during managed ingestion. Direct
core `stream()` calls keep their original immediate snapshot behavior.
