# ADR 0005: Virtualization

- Status: Accepted
- Date: 2026-10-07
- Scope: `@vueye-table/core`, `@vueye-table/vue`, renderer integrations

## Decision

The standalone `createVirtualizer` in core owns layout arithmetic for either axis. The caller
supplies viewport offset/size and measured item sizes. Fixed-size lookup is arithmetic; variable
sizes use cached prefix sums and binary search. A changed measurement invalidates offsets only
from its item onward. Reconfiguring count, estimates, or item order compares the new layout and
preserves the unchanged prefix. Constructing/configuring the layout is O(n); subsequent lookups
are O(1) for fixed sizes and O(log n) for variable sizes, plus the returned items.

Measurements are keyed by unique string/number identities, not positions. They survive reorder
and temporary filtering for the lifetime of the virtualizer. Estimates are cached until
`setOptions`; reconfiguration can refresh an estimate callback that closes over changed data.
Detail and parent items must use distinct, type-preserving keys; the expansion ADR will define
the flattened render-item contract. Arithmetic does not interpret item kinds.

`VirtualWindow` contains inclusive indices, item offsets/sizes, padding, total size, clamped
viewport values, and recovery issues. Empty results use `startIndex: 0`, `endIndex: -1`.
Overscan defaults to five items on each side. `getOffsetForIndex` supports start, center, end,
and auto alignment. Scroll destinations clamp to the available extent.

Invalid count/overscan, keys, sizes, or viewport values recover with `TableIssue`s. Diagnostics
retain one representative issue per code and reset on `setOptions`; `onIssue` receives newly
reported issues. Count falls back to zero, overscan to five, estimates to 40, and invalid
viewport values to zero. Invalid measurements retain the previous size. Duplicate keys receive
distinct fallback keys; applications should provide their own stable unique keys.

### Pagination

`TableOptions.paginate` defaults to `true`. With `false`, `snapshot.rows` is the exact
`snapshot.processedRows` array, page metadata describes one page, and page navigation/size
operations do nothing. Stored pagination preferences remain finite and serializable; infinity
and zero are not alternative page-size sentinels. The effective snapshot page size is the row
count, or one for an empty result. Manual sources still expose only the rows supplied by the
application, even if their server total is larger.

### Measurement and rendering integration

The Vue composables will connect element refs, scroll/resize, keyed measurements, scroll
anchoring, and grid focus to this engine. They must obtain platform facilities through the
element's owner view and clean up with their effect scope. SSR uses a deterministic initial
item count before observation starts.

Renderers can use spacer rows for native table structure or positioned transforms for a custom
row surface. They must preserve table/grid semantics, logical `aria-rowcount`/`aria-rowindex`,
column alignment, and active-cell visibility. Component props and hydration acceptance belong
to #72; this core addition does not claim those integrations are implemented.

Sticky/pinned items are deferred. Streaming reconciliation is covered separately by ADR 0006.
