# ADR 0010: Vue virtual bindings

- Status: Accepted
- Date: 2026-10-07
- Scope: `@vueye-table/vue`

## Context

[ADR 0005](/adr/0005-virtualization) supplies framework-independent layout math. [ADR 0007](/adr/0007-expansion-and-trees) supplies stable data/detail render items. Vue needs to connect these models to a mounted element and logical grid focus without reading browser globals.

## Decision

Use separate `useVirtualRows(table, options)` and `useVirtualColumns(grid, options)` composables. Both expose plain reactive `VirtualWindow` properties, imperative scrolling and explicit keyed measurements. They leave rendering, DOM focus and accessibility markup to the caller.

Rows virtualize `table.renderItems`, exposing each source as `item.renderItem`. Render indices include details; logical grid row indices exclude them. Row `scrollToKey` accepts the original typed data-row key. Columns virtualize visible columns from the newly exposed `grid.table`, exposing `item.column`; their scroll keys are column ids. `scrollToIndex` accepts render indices and defaults to auto alignment.

`measureElement(element, virtualKey)` requires a key rather than reading an index attribute. This preserves string/number identity and independently measures details. Function refs release observation with null; component instances must forward their root element. Zero-sized hidden elements retain their estimate.

Observe scroll and resize after mount using `scrollElement` as a ref/getter/value and the element's owner view. ResizeObserver is optional; fixed estimates, explicit measurements and owner-view resize events work without it. Ref replacement and effect-scope disposal remove previous listeners and observers.

Render exactly `initialCount` source items before mount, default 10, with no overscan. Invalid initial counts recover to 10 with a TableIssue. The mounted viewport enables configured overscan. Estimate sizes, initial count, overscan and the grid connection are creation options; the element source and table contents remain reactive.

Preserve the first visible key and inset after source changes and measurements; clamp the previous offset when that key disappears. Retain keyed measurements for the binding lifetime. Applications set `overflow-anchor: none` on the scroller to avoid competing native corrections.

Row options accept the owning `grid` to follow logical row focus while skipping details. Column virtualization follows its grid automatically. Focus changes scroll with auto alignment; scrolling does not rewrite grid selection.

## Consequences

The composables work with custom native table or grid markup. Existing styled components receive virtualization separately in #72. Trees, streaming reconciliation, sticky/pinned items and DOM focus policies remain separate work. This decision introduces no runtime dependencies beyond core and Vue.
