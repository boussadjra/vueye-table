# 0026 — Row pinning and grid regions

Status: accepted for the next beta.

## Decision

`TableState.rowPinning` stores `top` and `bottom` arrays of typed row keys, in display order.
`pinRow(key, 'top' | 'bottom' | false)` moves a key between regions or returns it to the centre.
Pins never change the underlying data or the page. Duplicate keys are removed with an issue;
top wins over bottom when restoring state. Invalid shapes recover to empty regions with an issue.

Snapshots add `topRows`, `bottomRows` and `gridRows`. `rows`, `processedRows` and `renderItems`
contain the centre only. `gridRows` is the readonly visual order top → centre page → bottom.
Centre render items' `rowIndex` includes the top-region offset; group/detail items retain their
existing rules. Copy, paste, ranges and the Vue grid binding use `gridRows`. Without visible pins,
`gridRows` reuses `rows`, preserving the existing lazy default path.

Client pagination excludes pinned keys before counting or slicing centre rows. Pin order is
independent of sorting. The filter/sort stages still see the source and remain memoized; pin
changes select a new centre without rerunning those stages. `keepPinnedRows` defaults to true,
keeping resolved pins visible outside search/filter results. False hides excluded pins without
returning them to the centre or deleting their state. This option is configured at creation.

Grouping and its aggregates operate on centre leaves. Pinning a leaf removes it from its group's
counts, selection coverage and aggregates. Pins render as ordinary standalone rows outside groups.
Page selection covers visible pins and the centre page; all selection covers visible pins and
the processed centre. Export follows the same order, includes visible pins once, and keeps the
existing formula escaping. Grouped export surrounds the centre hierarchy with the pin regions.

Tree nodes resolve from all loaded source nodes, even below collapsed parents. A pinned node is
shown at its original depth, alone rather than with its subtree or details. Its descendants stay
in the centre according to ordinary expansion and filtering. In root pagination, visible children
of a pinned root become centre pagination roots until an unpinned ancestor exists. Collapsing a
pinned root can hide its centre descendants; it does not hide the pin. With pinning active,
`totalRowCount` counts all source tree nodes; centre `rowCount` uses the chosen pagination unit.
Tree selection retains its existing cascade over loaded descendants; pinning changes presentation,
not the node's identity or selection semantics.

Manual tables retain unresolved keys with `unresolved_pinned_row`, so paging does not discard pin
intent. The host supplies out-of-page pinned records together with the current centre page through
`data`; duplicates must be avoided. A supplied `rowCount` is the server's **centre total**. The
host must exclude pins when fetching/paginating the centre. Without an explicit count, the engine
counts the supplied centre. Manual filtering remains server-owned.

Client data is a complete key space: missing pin keys are pruned with `stale_pinned_row` at initial
normalization and source changes, before publication. Source upserts retain pin order while new
row objects replace their snapshots by key. Row editing, drafts and pending changes keep their
existing key identity and source-conflict rules. Undoing a data removal does not re-pin a key
whose stale pin was pruned; pinning is independent state, outside the data undo stack.

## Compatibility and scope

Complete `TableState` literals add `rowPinning: { top: [], bottom: [] }`; partial state patches
remain compatible. Custom renderers use the three regions and `gridRows` for grid coordinates.
Built-in pinned-row rendering and virtualization stay with #139/#141. Existing components retain
their default behaviour when pinning is unused; the runnable example supplies its own body.
