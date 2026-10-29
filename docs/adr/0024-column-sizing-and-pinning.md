# ADR 0024: Column sizing and pinning

- Status: Accepted
- Date: 2026-10-29
- Scope: `@vueye-table/core`, minimal operation forwarding in `@vueye-table/vue`
- Implements: #136; builds on #135 and ADR 0023

## Decision

Column layout is view state, resolved after base columns and independently of row indexing,
filtering, sorting and pagination. `columnSizing` supplies effective widths. `columnPinning`
contains immutable `start` and `end` arrays of column ids in display order. Column definitions
may seed pins with `pinned`; an explicit initial state overrides that seed. `pinnable` defaults
to true. Equal pin maps are no-ops, `setState` does not echo, and `reset()` restores the seed.

Pins use logical sides so RTL needs no alternate state or arithmetic. The single snapshot
display order is start pins, centre columns in `columnOrder`, and end pins. Grid indices, A1
coordinates, clipboard ranges, exports and ADR 0019's accessible coordinates follow this order.
`moveColumn` receives an all-column display index, including hidden columns, and clamps it to
the current region. Moving between regions is an explicit `pinColumn` operation. Repeating a
pin does not change its position in the region; unpinning retains the underlying column order.

Renderers receive `pinned`, `pinOffset` and `isPinnedEdge`. Start offsets accumulate toward the
centre from the first start pin; end offsets accumulate toward the centre from the last end
pin. The edge markers belong to the last visible start pin and first visible end pin. Hidden
pins keep their state and side, but contribute neither offset, total width nor edge marker.
`pinnedStartWidth` and `pinnedEndWidth` sum only visible pins. A pinned column without a finite
positive width uses a finite positive `minWidth`, then 120px, reports `unsized_pinned_column`,
and exposes that fallback as its effective width so rendering and offsets agree.

Unknown and unpinnable state entries are ignored with issues. Same-side duplicates retain the
first entry and report `duplicate_column_pin`; cross-side conflicts leave the column unpinned
and report that issue once. Entries remain host-owned state, including removed ids. Malformed
state recovers to empty pin regions with `invalid_column_pinning`. Invalid operations leave
state unchanged; their last issue remains visible until a valid pin call or reset.

## Compatibility and scope

Complete hand-built `TableState` literals must add `columnPinning: { start: [], end: [] }`.
Partial patches remain compatible. The new snapshot fields, column options and operation are
additive. Core owns the policy; Vue forwards `pinColumn` and exposes snapshot accessors using
its existing machinery. No layer is skipped and no browser global is introduced.

This lifts the core column-pinning deferrals in ADRs 0003 and 0005. Sticky component rendering,
leading utility-cell offsets, resize handles, commit-on-release gestures and virtual centre
regions remain #139/#140. The runnable example supplies its own fixed table layout and logical
sticky styles. Row pinning, its pagination policy and grid coordinates remain #137; grouping
remains #138 and ADR 0025. This decision does not claim those features are implemented.
