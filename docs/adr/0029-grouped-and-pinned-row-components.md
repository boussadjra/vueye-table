# 0029 — Grouped and pinned row components

Status: accepted for the next beta.

## Decision

Default table/grid bodies render the centre's group/data/detail sequence and separate top/bottom
pin sections. `DataTableGroupRow` provides a localized disclosure, hierarchy level, expansion
state and optional group selection. `DataTableAggregateCell` renders aligned, read-only aggregate
text or `aggregate.<id>` slot content. The `group` slot fills disclosure content, retaining the
native button. A custom body default slot owns centre rendering; row/group slots keep automatic
composition. No HTML interpretation is added.

`aggregatePosition` selects aggregates in the group row (default) or a footer after an expanded
group. The label spans leading utilities and the first data column; an aggregate on that first
column stays within the label cell. Without in-row aggregates the label spans the physical row.
Footer items are presentation-only copies of group records with disjoint JSON keys under the
`aggregate-footer` namespace. A private lookup retains the original group for labels/values;
footer keys are never passed to engine group operations. The core union/state remains unchanged.

`useVirtualRows` adds reactive `renderItems` and measured `pinnedRowHeights` options. Group/footer
keys retain independent measurements through collapse/expansion and streaming. Native spacers and
colspans follow actual rendered columns, and the first data column stays rendered for group labels.
Grid coordinates still address `gridRows` leaves only; group/detail/footer rows are read-only and
skipped by cell navigation, editing, ranges and clipboard operations.

Grouped roots use treegrid semantics. Grouped or pinned roots count the displayed page sequence,
including header, top pins, group/data/detail/footer items and bottom pins. Indices remain stable
when virtualization omits rows. Group levels and leaf levels reflect hierarchy; pins are standalone
roots. Ordinary ungrouped/unpinned counts retain their previous policy. Engine row counts and status
ranges remain centre counts, including the existing manual/server obligations.

Pin cells combine logical row/column sticky insets. Header corners layer above pinned body corners,
pin bands layer above ordinary column pins, and backgrounds remain opaque. Toolbar menus sit above
all sticky table layers without clipping their panels. Measured header/pin heights reserve the
centre viewport. A presentation spacer fills short virtual centres so bottom
pins stay at the viewport end. Pin rows render one native row, and own scoped measurement targets;
moving a key between regions cannot release its new region's target. Size observation and updates
use element references/owner views, with no browser global reads. SSR uses estimates until mount.

`VueyeTable` and `VueyeGrid` add grouping, expandedGroups and rowPinning models, aggregatePosition,
optional groupable controls and rowPinningControls. External models apply without callback echoes.
`VtGroupBy` adds/removes/reorders group columns; `VtGroupRow` supplies styled group presentation.
Row actions pin/unpin through named core operations and restore the row control's focus. Non-tree
pins omit detail disclosures; tree pins retain descendant controls. Group/aggregate slots, sorting,
selection, drafts and ingestion continue through existing engine boundaries.

New `--vt-group-bg` and `--vt-pinned-row-shadow` tokens use existing theme roles, including inherit.
This is a component implementation; manual grouping of partial server pages remains disabled by
the core policy. No production-readiness or live-deployment claim is made.
