# 0027 — Reactive Vue layout and virtual regions

Status: accepted for the next beta.

## Decision

`useDataTable` and `useDataGrid` share `DataTableLayout`: readonly plain accessors for
`columnSizing`, `columnPinning`, `grouping`, `expandedGroups`, `rowPinning`, `topRows`,
`bottomRows`, `pinnedStartWidth` and `pinnedEndWidth`, plus the corresponding named operations.
`setGrouping` aliases `groupBy` in Vue; core keeps `groupBy`. `LayoutState` names the five state
fields independently of snapshot regions. Existing `.state` and `grid.table` remain available.

Table options accept refs/getters for each layout state field. At creation, defined controlled
`state` fields override individual layout options, which override `initialState`. Later changes
to layout options or controlled state apply the merged patch through `setState`, with the same
precedence and no callback echo. Undefined fields retain current state. Operations remain
optimistic until controlled inputs change; this matches existing partial-state semantics.
Reactive columns still use `setColumns`. Scope disposal stops all watches.

`useVirtualColumns` virtualizes only the centre. `VirtualColumnBinding` exposes `centerItems`,
`pinnedStartItems`, and `pinnedEndItems`; `items` returns their combined display order. Pins are
always present, including SSR, zero initial counts, and viewports narrower than the pinned widths.
Initial count and overscan concern the centre. Logical indices refer to `table.columns` everywhere,
including offscreen lookups and scroll requests. Pinned scroll targets are no-ops. Centre function
estimates also receive logical indices.

Item starts and total size use full-surface coordinates. Padding describes omitted centre gaps,
and inclusive start/end indices identify the centre slice (0/-1 when empty). The centre viewport
subtracts both pinned widths; offset remains the centre scroll offset under the existing leading
scroll-margin convention. Pins use the engine's effective widths rather than independent element
measurements, ensuring agreement with pin offsets. Centre measurements, resize invalidation and
keyed scroll anchoring retain their previous rules. Width and pin changes re-evaluate the viewport.
Custom renderers own sticky placement, backgrounds, gaps and focus markup.

Structural source updates use scroll anchoring rather than scrolling an automatically relocated
grid selection. Explicit selection navigation still scrolls synchronously. Anchor reads refresh
the physical viewport first, including focus-driven scrolling whose event has not yet arrived.
This avoids using a new group's logical position against a previous source layout.

`useVirtualRows` consumes the centre `renderItems` union, including group headers. Stable group
keys retain independent measurements through collapse/expansion and source changes. Top/bottom
pinned rows are rendered separately from the virtual centre. Original data-row `scrollToKey`
semantics remain unambiguous; group headers use their render index and virtual measurement key.
Headless focus/editor retention is named `retainedRows`/`retainedColumns`, distinct from true pins.

## Scope

No runtime dependency or new core operation is introduced. Component sizing controls, sticky
regions, grouping UI and `v-model` props remain follow-up work in #140–#142. The custom virtual
grid example demonstrates composable rendering without claiming component support.
