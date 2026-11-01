# Pin rows to the top or bottom

Keep selected records in view while the centre is searched, sorted and paginated. Configure
`createTable`/`useDataTable` with a custom body, or use the full components' `v-model:row-pinning`.
Try the [inventory example](/examples/row-pinning) or the [grouped component demo](/examples/row-grouping).

```ts
const table = useDataTable({
  data: records,
  columns,
  initialState: { rowPinning: { top: ["priority"], bottom: ["reference"] } },
});
table.pinRow("another", "top");
table.pinRow("priority", "bottom");
table.pinRow("reference", false);
```

Keys retain their types: `1` and `"1"` identify different records. Each region follows its stored
key order, independent of sorting. Moving a row into a region appends it there. Pinning does not
change the data or page; a page beyond the new centre count is clamped in the snapshot.

## Render the three regions

| Snapshot field  | Contents                                                                  |
| --------------- | ------------------------------------------------------------------------- |
| `topRows`       | Resolved, visible top pins in pin order                                   |
| `rows`          | Visible centre data on the current page                                   |
| `bottomRows`    | Resolved, visible bottom pins in pin order                                |
| `gridRows`      | Top pins, centre page, bottom pins: keyboard and clipboard coordinates    |
| `renderItems`   | Centre group, data and detail items; data `rowIndex` includes top pins    |
| `processedRows` | Filtered/sorted centre across all pages, including collapsed group leaves |

Render pinned rows separately from the centre; they do not duplicate records there. If no rows
are visibly pinned, `gridRows` is the same view as `rows`. A custom grid can use `gridRows` to
render all data rows in visual order, or render the regions separately and offset its indices.
`useDataGrid`, core copy/paste/clear, selection ranges and row drafts follow the same row keys.

Pinned rows do not contribute to client `rowCount` or `pageCount`. `loadedRowCount` counts source
records. In grouped tables, aggregates and group selection cover centre leaves, so pinning a leaf
removes it from those aggregates. Pins are standalone rows without their details or subtrees.

## Search and filtering

By default, a resolved pin remains visible even when search or filters exclude it. To let filters
hide pins, configure `keepPinnedRows: false` when creating the table:

```ts
const table = useDataTable({ data, columns, keepPinnedRows: false });
```

Hidden pins remain in state, stay excluded from the centre, and reappear when they match again.
Page selection includes visible pins plus the centre page. All selection includes visible pins
plus every processed centre row. Exports include visible pins once around the centre, including
pins kept outside the filters; `pageOnly: true` uses the current visual page. `groups: true`
retains centre group headers and aggregates between the pins.

## Data updates, trees and manual tables

Upserts refresh pinned records by key without changing pin order. Local edits, dirty metadata,
selection and drafts keep that identity. Source-conflict protection still prevents an upsert from
overwriting unsaved local edits. Removing or replacing client data prunes missing pin keys and
reports `stale_pinned_row`. Data undo restores data, not a pruned pin; call `pinRow` to pin it again.

A pinned tree node shows alone at its original depth, including loaded nodes below a collapsed
parent. Its descendants remain in the centre under normal expansion rules. Visible children of
a pinned root become centre roots for root pagination. In a pinned tree, `totalRowCount` counts
source nodes; `rowCount` still uses the chosen centre pagination unit.
Tree selection still covers loaded descendants. Expanding a pinned node can reveal its children
in the centre, while the pin itself remains a standalone row.

Manual tables retain unresolved keys and report `unresolved_pinned_row`. Supply pinned records
with the current centre data so the engine can resolve them:

```ts
const table = useDataTable({
  manual: true,
  data: [...resolvedPins, ...centrePage], // unique keys; no duplicate records
  rowCount: centreTotal, // server total after excluding pins
  columns,
  state: controlledState,
});
```

The host owns server pagination, filtering and out-of-page pin retrieval. The engine never
invents a missing record or counts supplied pins toward its fallback centre count.

## Component regions

`VueyeTable` and `VueyeGrid` render pins in separate top/bottom `tbody` regions, outside the centre
virtualizer and groups. Top cells stick under the header; bottom cells stick to the viewport end.
The renderer measures header and pin heights, reserves their space, and gives short virtual
centres an invisible presentation spacer so bottom pins remain at the viewport end.

`row-pinning-controls` opts into row action menus without enabling editing. Existing row menus
also offer Pin to top, Pin to bottom and Unpin row. Moving a row keeps its key and restores focus
to its action control. Group totals and selection coverage update after a leaf leaves the centre.
Pinned data cells remain ordinary editable/selectable cells. Detail disclosures are omitted for
standalone non-tree pins; tree disclosures can still affect descendants in the centre.

Headless roots provide `DataTablePinnedRow` context to their default pin regions. Custom pin rows
must render one native row so measurements refer to the actual row. Cell components combine row
and column sticky offsets, including utility cells. Grouped or pinned roots expose presentation
row indices for the displayed page; engine counts and status ranges still describe the centre.
Custom body attributes apply to the centre section, with its class shared by pin sections.

## Compatibility

**Migration for the next beta:** complete `TableState` literals add
`rowPinning: { top: [], bottom: [] }`. Partial state patches need no change. Renderers that opt
into pinning must use the three regions and `gridRows` for coordinates. See
[ADR 0026](/adr/0026-row-pinning).
