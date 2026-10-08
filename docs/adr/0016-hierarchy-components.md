# 0016 — Hierarchy components

Status: accepted (provisional alpha API)

## Decision

Headless, styled and full components consume the engine's keyed `renderItems`. Data rows retain
their logical coordinates; a detail is a sibling row containing one cell spanning the visible
columns, including selection and disclosure gutters. Detail content first mounts on expansion
and unmounts on collapse. `keepAliveDetail` retains visited content as a hidden, unmeasured row
while its parent remains on the current page, including when outside the virtual window.
Removing or filtering that parent unmounts the retained content. Large retained details trade
memory for local component state; the default remains false.

`DataTableExpandToggle`, `DataTableDetailRow` and `DataTableTreeCell` own disclosure semantics;
`VtExpandToggle`, `VtDetailRow` and `VtTreeCell` supply the existing theme and icon language.
Roots provide per-instance, SSR-stable IDs. Numeric and string row keys have distinct encoded
namespaces. Disclosure buttons expose `aria-expanded` and link to their detail or currently
rendered direct children. Default cells render strings through Vue's text escaping.

Full components accept the existing tree callbacks, `rowCanExpand`, `expandMode`, `treeColumn`,
`keepAliveDetail`, `v-model:expanded` and an `expanded` slot receiving `{ row, rowIndex }`.
Expansion emits `expand(item, row)` / `collapse(item, row)` and the usual state update. Structural
tree callbacks, eligibility and expansion mode are creation options; remount to change them.
Tree-column placement, retained-detail policy and controlled state remain reactive. A hidden or
missing designated tree column falls back to the first visible column. A detail slot opts all
rows into detail expansion unless `rowCanExpand` limits them. In trees that slot is additional
content beneath an expanded branch; it does not replace child rows.

Configured trees, including empty trees, expose `treegrid`. Rows use engine depth and sibling
metadata from the processed sequence, with logical indices unaffected by detail items or
virtual spacers. `treeFilter: 'strict'` intentionally retains original depth and parent keys.
Selection controls use loaded-subtree coverage for their indeterminate state. The existing polite
status region announces pending and failed child loads; inline retry uses the engine's retryable
expansion operation. Applications replacing the status slot own those announcements.

Table trees use roving row focus. Right opens a closed branch or moves to its first visible child;
Left closes an open branch or moves to its visible parent; `*` opens eligible siblings. Up/Down
and Home/End navigate visible rows. Grids retain cell focus: tree commands apply in the designated
tree column, while other columns and modified arrows retain spreadsheet movement and selection.
Core `gridCommand(event, treeContext?)` is the pure mapping shared by both renderers; Vue
`useDataGrid(table, { treeColumn: () => id })` executes it. This is the tree-column variant of the
[WAI-ARIA treegrid interaction guidance](https://www.w3.org/WAI/ARIA/apg/patterns/treegrid/).

Virtual renderers measure details independently and retain keyed engine anchors across toggles.
Stable row projections and isolated application cell-slot components keep unrelated cell content
from rendering again when a branch changes. Cell slots still track their own reactive inputs.

## Content boundary

Packages never interpret application strings as HTML. A repository boundary rule rejects raw HTML
directives and DOM HTML assignment in package sources. An application may use its own expanded
slot for rich content, but owns sanitization before rendering it. The expansion guide includes a
server-side DOMPurify example; sanitizer dependencies belong to the application.
