# Large datasets and virtualization

Virtualization lays out the full dataset while rendering a small slice around the viewport.
The core helper works for rows or columns and accepts measurements supplied by your renderer.
The [virtual layout example](/examples/virtual-layout) lets you change its viewport and a row's size.

## Disable pagination

```ts
const table = createTable({ data, columns, paginate: false });
table.getSnapshot().rows === table.getSnapshot().processedRows; // true
```

`useDataTable` accepts the same option. Pagination remains enabled by default. When disabled,
the snapshot describes one page containing all processed rows and page operations do nothing.
`state.pagination` keeps its stored preferences. With `manual: true`, disabling pagination
does not fetch additional server rows.

## Lay out rows or columns

```ts
import { createVirtualizer } from "vueye-table";

const rows = table.getSnapshot().rows;
const virtual = createVirtualizer({
  count: rows.length,
  estimateSize: 36,
  overscan: 5,
  getKey: (index) => rows[index]!.key,
});
virtual.setViewport(360, 180);
const view = virtual.getWindow();
// Render view.items, with each item's start and size.
```

For columns, supply the visible column count, ids, widths, and horizontal offset instead.
An estimate may be a positive number or a function of the index. Stable unique keys retain
measured sizes across reorder and filtering; index keys are suitable only for an unchanged order.
Measurements remain cached for the helper's lifetime, so recreate it when you need to clear them.

```ts
virtual.measure(rows[10]!.key, 72);
virtual.setOptions({ count: rows.length, estimateSize: 36, getKey: (index) => rows[index]!.key });
const offset = virtual.getOffsetForIndex(50, "center");
virtual.setViewport(offset, 180);
const stop = virtual.subscribe((next) => render(next));
stop();
```

`setOptions` refreshes count, keys, and estimates without discarding keyed measurements.
The prefix cache preserves offsets before the first changed item. Construction/reconfiguration
visits the items; fixed-size position lookup uses arithmetic and variable-size lookup uses binary
search. Obtaining the rendered slice also costs the number of returned items.
Rebuilding invalidated offsets visits the affected suffix once on its next lookup.

## API reference

| API                                | Meaning                                                               |
| ---------------------------------- | --------------------------------------------------------------------- |
| `VirtualizerOptions.count`         | Non-negative safe integer item count.                                 |
| `estimateSize`                     | Positive finite size, or a function returning one for an index.       |
| `overscan`                         | Non-negative safe integer extra items on each side; default 5.        |
| `getKey(index)`                    | Unique string or finite number identity; defaults to the index.       |
| `onIssue(issue)`                   | Called when a recovery issue is first reported.                       |
| `setOptions(options)`              | Refresh layout options and clear prior diagnostics.                   |
| `setViewport(offset, size)`        | Set non-negative finite viewport values; offsets clamp to the layout. |
| `measure(key, size)`               | Replace one known item's size; unknown keys do nothing.               |
| `getWindow()`                      | Return a frozen, cached `VirtualWindow`.                              |
| `getOffsetForIndex(index, align?)` | Return a clamped scroll offset; alignment defaults to `auto`.         |
| `subscribe(listener)`              | Observe changes; returns an unsubscribe function.                     |

`VirtualItem` exposes `index`, `key`, `start`, and `size`. `VirtualWindow` exposes `items`,
`totalSize`, `paddingStart`, `paddingEnd`, inclusive `startIndex`/`endIndex`, `offset`,
`viewportSize`, and `issues`. A zero-sized viewport renders no items; an empty result uses
indices 0 and -1. Padding omits the rendered slice.

Invalid options, keys, estimates, or viewport values recover with `invalid_virtual_option`,
`duplicate_virtual_key`, `invalid_virtual_size`, or `invalid_virtual_viewport` issues. The
helper retains one representative issue per code. Invalid measurements keep the previous size.

The core helper performs no observation or rendering. The Vue composables below supply observation; component virtualization remains tracked by #72. See [ADR 0005](/adr/0005-virtualization).

## Vue composables

The public binding contract is recorded in [ADR 0010](/adr/0010-vue-virtual-bindings).

Try the [virtual grid example](/examples/virtual-grid), which renders both axes from sample data.

```ts
const table = useDataTable({ data, columns, paginate: false });
const grid = useDataGrid(table);
const scroller = useTemplateRef<HTMLElement>("scroller");
const virtual = useVirtualRows(table, {
  scrollElement: scroller,
  estimateRowHeight: 40,
  overscan: 5,
  initialCount: 10,
  grid,
});
const virtualColumns = useVirtualColumns(grid, {
  scrollElement: scroller,
  estimateColumnWidth: 120,
});
virtual.scrollToIndex(50, { align: "center" });
virtual.scrollToKey("order-50");
virtualColumns.scrollToKey("customer");
```

Both bindings expose plain reactive window fields: `items`, `totalSize`, `paddingStart`, `paddingEnd`, `startIndex`, `endIndex`, `offset`, `viewportSize` and `issues`. Watch these fields through getters, as with `useDataTable`.

Row items add `renderItem`, the data/detail item defined by [expansion](/guide/expansion). Read `item.renderItem.row`, `kind` and logical `rowIndex`; `item.index` addresses the flattened render sequence, so it can differ from a data-row index. Column items add `column` and index the visible columns. Details get independent measurement keys and stay outside grid coordinates.

`scrollToIndex(index, { align })` accepts `start`, `center`, `end` or `auto` (default). Row `scrollToKey(key)` accepts the original string/number row key and scrolls to its data item; column keys are column ids. Missing keys do nothing. Scroll offsets clamp to the available extent.

For variable sizes, pass a number or index function as `estimateRowHeight` or `estimateColumnWidth`. Register measured elements with an explicit virtual key:

```vue
<div
  v-for="item in virtual.items"
  :key="item.key"
  :ref="(el) => virtual.measureElement(el, item.key)"
  :style="{ transform: `translateY(${item.start}px)` }"
>
  <!-- Supply data or detail content from item.renderItem. -->
</div>
```

Function refs pass null when removed, releasing observation for that key. Components should forward their root element rather than their component instance. A hidden zero-size element retains its estimate. ResizeObserver updates rendered element sizes when available; without it, fixed estimates and explicit measurements work, and owner-view resize events update the viewport.

Observation begins after mount through the supplied element's owner view. SSR and initial hydration render exactly `initialCount` items (default 10), without overscan, limited by the source length. An empty source or initial count zero renders no items. Invalid counts recover to 10 with `invalid_virtual_option`. After mount the actual viewport and overscan determine the slice. Until an element exists the initial window remains available. Use these composables inside a component's setup/effect scope so listeners, watchers and observers are released on disposal.

Filtering, replacing or reordering rows retains the first visible key and inset if it survives; otherwise the old offset clamps to the new extent. Measurements are retained by key for the binding lifetime. Set `overflow-anchor: none` on your scroller so native anchoring does not compete. Estimates, overscan, initial count and grid connection are creation options; the element ref and table contents remain reactive.

Pass the same `grid` in row options to bring logical row focus into view during keyboard navigation; columns automatically follow their grid. `grid.table` exposes the owning table. Supply your own accessible markup, focus handling, row/column counts and indices; these bindings do not render components or change DOM focus. Native tables can use spacer rows; custom grids can use positioned items as in the example. Component props and their hydration acceptance remain separate work in #72.
