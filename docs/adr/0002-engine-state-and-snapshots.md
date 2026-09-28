# ADR 0002: The engine: plain state, snapshots, operations, and issues

- Status: Accepted
- Date: 2026-09-27
- Scope: `@vueye-table/core`, `@vueye-table/vue`

## Decision

### State is plain data

`TableState` holds sorting, search, column filters, pagination, selection, hidden columns, and
column order as serializable values. It can be stored, restored, sent to a server, or written to
the URL. Pages count from 1.

### Changes go through named operations

`toggleSort`, `search`, `filter`, `goToPage`, `setPageSize`, `toggleRow`, `toggleAll`,
`toggleColumn`, `moveColumn`, `edit`, `paste`, `undo`, and the rest. Operations normalize their
input (clamping a page, ignoring an unsortable column) and skip no-op changes, so a subscriber
never hears about a change that did not happen. Searching, filtering, and sorting return to the
first page; a page size change keeps the first visible row in view.

`onStateChange` reports changes made by operations. `setState` applies state owned elsewhere,
such as `v-model` props, without echoing it back, which is what makes controlled props loop-free.

### Snapshots are derived and frozen

`getSnapshot()` returns a frozen object with the current page, the processed rows, visible
columns, counts, selection coverage, and lookups. A snapshot is replaced on every change and is
otherwise the same object, so identity comparison detects change. Each pipeline stage is
memoized on its inputs.

### Recovery is reported

A duplicate row key, a state entry naming an unknown column, and an invalid page size are
recovered from (the duplicate gets a suffixed key, the entry is ignored, the default page size is
used) and reported in `snapshot.issues`. Nothing is dropped silently.

### Manual tables

With `manual`, the data is one page a server has already processed. The table presents it,
reports state changes for the next request, and pages against `rowCount`.

### Vue binding shape

`useDataTable` exposes snapshot fields as plain reactive accessors next to the operations, not as
refs, so templates read `table.rows` and `table.pageCount` directly. Data, columns, row count,
and controlled state may be refs or getters.

## Rejected

- Mutable reactive state that components write to directly: a write would bypass normalization,
  the page reset rules, and `onStateChange`.
- A hook per concern (`useSorting`, `usePagination`): the concerns interact, and splitting them
  moves the coordination into every application.
