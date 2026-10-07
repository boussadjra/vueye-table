# 0011 — Tree data and injected cancellation

Status: accepted. Implements issue #81 over the expansion state from ADR 0007.

## Decision

Core builds an iterative, keyed forest from either `getChildren` or `getParentKey`. Nested input takes precedence if both are supplied, with a `TableIssue`. Cycles and orphans detach to roots; repeated nested objects stop traversal. Depth is bounded by `maxDepth` (default 1,000). Loaded key collisions reject the batch. State remains serializable and input is never mutated.

The pipeline is build → hierarchical filter → sibling sort → visible preorder flatten → pagination. Build is memoized by source, columns and lazy-cache revision. Filter/sort do not depend on expansion. Single-key disclosure changes splice a visible subtree into the cached sequence; producing a frozen snapshot still projects visible rows. Default filtering keeps ancestor paths and temporarily opens them without writing expansion state. Descendants mode includes descendant closure; strict filtering is a list of matching loaded leaves with original metadata.

Default pagination counts roots and keeps subtrees together. Row pagination counts the visible sequence. Manual server counts always describe roots. There is no aggregation in this change. Root-page sizes can vary substantially; row pagination and virtualization are explicit alternatives.

Rows expose hierarchy, loading and tri-state selection metadata. Selection cascades through loaded descendants in multiple mode; selected counts count data rows. Newly loaded children inherit a selected parent's selection. External state writes retain exactly their supplied keys. Details remain a separate opt-in through `getRowCanExpand`; branch disclosure alone produces child rows, not details.

Single expansion still saves one key, but derives its open ancestor path so a nested branch remains reachable. Opening another branch replaces that path; closing a derived ancestor clears the saved key. Ancestor projection does not rerun filtering or sorting.

Nested editing requires `setChildren`, because an arbitrary getter has no inferable inverse. Edits copy the path and invoke `onDataChange`; unrelated branches retain identity. Lazy nested edits can materialize the copied path. Lazy adjacency edits update the table-owned cache and publish `CellChange` records for persistence. Loads themselves do not publish source data. Cache lifetime ends on source replacement, and old requests cannot write after cancellation.

`TableOptions<TRow, TSignal>` and `UseDataTableOptions<TRow, TSignal>` preserve an injected signal type. `TSignal` extends a minimal `TreeLoadSignal` with `aborted`; `createChildLoadController` supplies the controller paired with `loadChildren`. A caller can instantiate its runtime's native controller and use `AbortSignal` directly in the loader. Core retains ES2023-only types, introduces no platform globals and adds no cancellation dependency. Missing factory configuration recovers with an issue.

## Consequences

Renderers supply indentation, disclosure and selection presentation. Native signal creation stays at the application boundary. Errors are visible in row status and `TableIssue`; reopening retries. Tree navigation, styled tree controls, streaming upserts and aggregates remain follow-up work. Export contains visible preorder data, with optional depth and indentation. Virtualization shares renderer keys, preserving measurements and anchors.
