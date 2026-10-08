# 0007 — Expansion state and detail items

Status: accepted for expansion; tree modeling is defined in [ADR 0011](./0011-tree-data).

## Decision

`TableState.expanded` is a readonly array of string or finite number keys, or `true` for every expandable row. Rows opt in through `getRowCanExpand(original)`; the default is false. `expandMode` defaults to `multiple`. In `single` mode the last supplied key wins; `true` and `expandAll()` choose the first expandable processed row, or no key when none exists.

`snapshot.rows` and `processedRows` remain data rows. Each row exposes `canExpand` and `isExpanded`. `snapshot.renderItems` interleaves a data item with its detail item when open. Both refer to the parent row and its logical `rowIndex` in `snapshot.rows`. Details never contribute to pagination, selection counts, grid coordinates, export or editing.

`getRowItemKey(key, kind)` encodes the kind, key type and value as a JSON tuple. This keeps numeric and string ids distinct and gives details independent virtual measurements. These keys are renderer keys, not HTML ids. Vue virtual rows will consume this shared render-item sequence.

Unknown and non-expandable keys are retained in state but ignored in rendering. Toggling such a key does nothing. All-mode expansion includes newly supplied rows; closing one row materializes the remaining known expandable keys into an array. Filtering and replacing data do not discard saved keys. A Set per expansion state gives constant-time membership checks; the expansion projection follows the memoized filter and sort pipeline, preserving cached cell accessors.

Malformed expansion state recovers to an empty array with `invalid_expanded`. Duplicate keys are deduplicated. Table state writes clear the diagnostic on the next defined expansion write. Core state helpers accept an optional issue callback for recovery reporting. State arrays are copied and frozen only when their field changes.

## Consequences

Applications supply detail markup. [ADR 0011](./0011-tree-data) adds tree traversal, and
[ADR 0016](./0016-hierarchy-components) specifies the shipped controls, disclosure keyboard
behavior and virtual tree/detail rendering. Complete `TableState` literals must include
`expanded`; partial initial state remains compatible. Controlled state, callbacks, reset and
opt-in URL adapters round-trip expansion as plain data. The Vue binding forwards the three
core expansion operations. Try [file explorer](/examples/file-explorer) and
[orders](/examples/orders-dashboard) for the completed component integration.
