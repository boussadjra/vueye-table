# Ingestion, hierarchy and editing API

This reference maps the virtualization, streaming and editing roadmap APIs to their detailed
contracts. `vueye-table` re-exports lower layers; import a lower layer when composing your own
view. Vue exposes snapshot fields directly; core uses `getSnapshot()`.

## Ingestion and source loading

| API                                                                | Contract                                                                                                                            |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `appendData(rows)`, `upsertData(rows)`, `removeData(keys)`         | `DataIngestionResult` counts/issues. Ingestion creates no user undo/pending records.                                                |
| `stream(source, options?)`                                         | Accepts `AsyncIterable<Row \| readonly Row[]>`; resolves `StreamResult`. Options include `signal`, `batchSize`, `expectedRowCount`. |
| `loadState`, `loadedRowCount`, `expectedRowCount`                  | Source status, received count and optional caller total hint, independent of filtered `rowCount`.                                   |
| `source`, `streamOptions`, `scheduleFrame`                         | Vue source/factory and publication scheduling. Factories receive `SourceContext.signal`.                                            |
| `loadMore`, `endThreshold`                                         | Loader receives `{ cursor, state, signal }`, returns `{ rows, cursor?, done }`. Threshold counts remaining flattened items.         |
| `loadingMode`, `canLoadMore`, `loadError`, `loadNext()`, `retry()` | Vue loading controls. Cursor queries are server-owned/manual by default.                                                            |

Types: `LoadState`, `StreamSignal`, `StreamOptions`, `StreamResult`, `DataIngestionResult`,
`TableSource`, `SourceContext`, `LoadMore`, `LoadMoreContext`, `LoadMoreResult`, `FrameScheduler`,
`SourceOptions`, `SourceBinding`. Read [streaming](/guide/streaming) for cancellation,
generation, conflict, SSR and incremental-cost guarantees.

## Virtualization

`createVirtualizer` owns pure keyed window math. `useVirtualRows` and `useVirtualColumns` own
reactive viewport measurement and cleanup. `VirtualViewportOptions`, `UseVirtualRowsOptions`,
`UseVirtualColumnsOptions` and `VirtualBinding` describe the Vue boundary. Core types include
`VirtualAlign`, `VirtualItem`, `VirtualWindow`, `VirtualizerOptions`, `Virtualizer`; Vue adds
`VirtualRowItem` and `VirtualColumnItem`.

Component options: `virtual`, `height`, `rowHeight`, `overscan`, `virtualColumns`, `columnWidth`,
`columnOverscan` (inside the virtual options object). Headless integration uses `DataTableViewport`, `DataTableBody`,
`DataTableVirtualColumns`. See [virtualization](/guide/virtualization) for signatures, retained
active cells, spacers, ARIA indices, SSR estimates and disabling pagination.

## Expansion and trees

| API                                                                             | Contract                                                                             |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `state.expanded`, `ExpandedState`                                               | Boolean or key list; controlled through `v-model:expanded`.                          |
| `toggleExpanded(key)`, `expandAll()`, `collapseAll()`                           | Named expansion operations.                                                          |
| `getChildren`, `setChildren`                                                    | Nested input and immutable inverse for nested edits.                                 |
| `getParentKey`, `setParentKey`                                                  | Adjacency input and immutable inverse for child insertion.                           |
| `hasChildren`, `loadChildren`, `createChildLoadController`                      | Lazy detection/loading; Vue supplies a controller.                                   |
| `treeFilter`, `paginateBy`, `maxDepth`                                          | Ancestry filtering, root/row pagination and recovery depth.                          |
| `row.depth`, `parentKey`, `canExpand`, `isExpanded`, `childStatus`, `selection` | Hierarchy metadata; source objects stay unchanged.                                   |
| `renderItems`, `TableRenderItem`, `getRowItemKey`                               | Stable data/detail items. Details do not change grid addresses or pagination counts. |
| `rowCanExpand`, `expandMode`, `keepAliveDetail`, `treeColumn`, `#expanded`      | Component presentation.                                                              |

Types include `TreeOptions`, `TreeFilter`, `TreePagination`, `TreeLoadSignal`,
`TreeLoadController`, `ChildStatus`, `RowItemKind`. Helpers and slot payloads are listed in
[expansion](/guide/expansion), [trees](/guide/trees) and [components](/guide/components).

## Validation, row operations and persistence

`ColumnDef.editor: EditorSpec` describes typed controls and constraints. `ColumnDef.validate:
Validator` and `validateRow` return `ValidationResult` or a promise. `asyncValidation` is `held`
by default or `optimistic`. `EditResult.status` includes `pending`; `pendingCells: readonly
PendingCell[]` describes unresolved work and `completion` resolves its final result.
`edit(edits, { expectedRows? })` can fence stale row identities.

| API                                                        | Contract                                                                                                             |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `insertRows(rows?, at?)`                                   | Immutable insertion; `InsertPosition` supports `before` and/or `parent`. `createRow` supplies omitted rows.          |
| `removeRows(keys)`                                         | Immutable user removal, including loaded descendants.                                                                |
| `EditResult.rowChanges`, `RowChange`                       | Structural records alongside cell changes.                                                                           |
| `getPendingChanges()`, Vue `pendingChanges`                | `PendingChanges` contains `inserted`, `updated`, `removed`; `UpdatedRow` includes previous/current rows and changes. |
| `markSaved(keys?)`                                         | Advance acknowledged baselines; keeps undo available.                                                                |
| `revert(keys?)`                                            | Restore tracked saved records.                                                                                       |
| `editRow(key)`                                             | Vue `RowDraft`: field buffer, validation, pending result, save, cancel.                                              |
| `editMode`, `editor.<id>`, `save`, `cancel`, `edit-issues` | Component inline editing and local events.                                                                           |

Read [editing](/guide/editing), [validation](/guide/validation) and [row drafts](/guide/row-drafts)
before persistence integration. The server validates/authorizes again. Local save events never
acknowledge backend writes.
