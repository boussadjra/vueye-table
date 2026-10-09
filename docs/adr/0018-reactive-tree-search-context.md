# ADR 0018: Reactive tree search context

Status: accepted. Fixes #113; extends ADR 0011.

## Decision

Core exposes `setTreeFilter(mode: TreeFilter | undefined)`. Undefined restores the default
`ancestors` mode. Repeating the current mode is a no-op. Changing the mode invalidates the
processed tree stage and notifies subscribers; it leaves the indexed hierarchy, lazy-child
cache, outstanding loads, saved expansion, selection, data and edit stacks intact.

`useDataTable` accepts a value, ref or getter for `treeFilter` and watches it within its
existing disposal scope. Full table and grid components pass their prop through a getter.
Other tree topology options remain creation options. Changing search context must not
recreate the table or call `setData`, which would discard application work.

## Consequences

Applications can offer a search-context selector beside a loaded tree. Changing context
updates the visible matches immediately, using the same rules as the initial option.
Applications still own search text and persistence; this operation changes presentation.
