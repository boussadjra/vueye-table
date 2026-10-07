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

The core helper performs no observation or rendering. Automatic Vue measurement and component
virtualization are separate integrations; see [ADR 0005](/adr/0005-virtualization).
