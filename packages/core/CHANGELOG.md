# @vueye-table/core

## 3.0.0-alpha.6

### Minor Changes

- a39786b: Add opt-in table and grid virtualization with native spacers, aligned virtual columns, stable logical indices, active-cell/editor retention, deterministic SSR windows and viewport-aware keyboard navigation. Expose headless viewport/column composition, offscreen layout lookup and Vue scroll margins; forward props through styled/full components and register the new Nuxt layer components.

## 3.0.0-alpha.5

### Minor Changes

- 5598ba8: Add incremental append, keyed upsert and source removal, cancellable async streaming, load metadata and readonly array views. Protect local edits and pending validation from source conflicts, retain incoming data through undo/redo, and forward ingestion operations through useDataTable.

## 3.0.0-alpha.4

### Minor Changes

- 7f2183e: Add cell and row validation, held or optimistic async batches, enforced editor constraints, undoable tree-aware row operations, and pending changes with save/revert baselines. Expose immutable row issue/dirty metadata and forward the new operations through useDataTable.

## 3.0.0-alpha.3

### Minor Changes

- b84f815: Add nested and adjacency trees with sibling sorting, hierarchical filtering, root or row pagination, cascading selection, immutable child edits, visible-tree exports, and cancellable lazy children. Preserve injected native signal types through the Vue binding and reuse virtual row keys across branch toggles.

## 3.0.0-alpha.2

### Minor Changes

- b11b290: Add keyed row expansion state, atomic expansion operations, eligible/open row flags and a shared data/detail render-item model. Preserve pipeline memoization on unrelated state changes, report malformed expansion inputs, and forward expansion operations through the Vue binding.
- 8885afc: Add a framework-independent virtualizer for rows and columns, including keyed measurements,
  fixed-size arithmetic, variable-size cached offsets, overscan, scroll alignment, subscriptions,
  and recovery issues. Add `paginate: false` to present all processed rows while preserving the
  existing paginated default and finite stored pagination state.

### Patch Changes

- bc81c20: Escape formula-like CSV/TSV cells and headers by default. This changes exported text beginning
  with formula prefixes; pass `escapeFormulas: false` to retain literal output. Finite numeric
  values formatted as numbers stay numeric. Clipboard copies keep their existing default and
  accept `escapeFormulas: true` through table and grid bindings.

  Reject prototype-sensitive column paths with `unsafe_path` issues, and copy only own
  properties in path writes. Safe inherited getters remain readable. `setPath` leaves unsafe
  writes unchanged and accepts an optional issue callback.

  Bound paste parsing to the visible destination and `pasteLimit` budgets (100,000 fields and
  5,000,000 UTF-16 code units by default). Excess input reports `paste_truncated`; incomplete
  fields at the character limit are not applied. Invalid limits recover to defaults with
  `invalid_paste_limit` issues.

## 3.0.0-alpha.1

### Major Changes

- 03b46ee: Rewrite vueye-table as a layered framework: a framework-independent engine, Vue composables,
  headless components, styled components, and the complete `VueyeTable` and `VueyeGrid`. See
  `docs/guide/upgrading-from-2.md`.

### Patch Changes

- 0b505e9: Fix range filters with bounds typed as text (`{ min: "10" }`, `{ min: "2024-01-01" }`) against
  number and date values, and let a range with no bounds pass empty cells. Pasting into an empty
  column reads each cell's type once per column instead of once per cell.

  `useDataGrid` keeps its selection on cells that still exist after a search, filter, or page change
  shrinks the grid. `VueyeGrid` no longer resets a page size the user picked when the parent
  controls `page`, and emits `update:pageSize`, `update:filters`, `update:hiddenColumns`, and
  `state-change` like `VueyeTable`. `VueyeTable` shows `loading-text` (or a `loading` slot) instead of
  the empty state while loading with no rows. The column menu closes on Escape and when focus
  leaves it.

  New: `cell.<column id>` slots on `VueyeGrid` and `VtGrid`, a `cell` slot and `rowIndex` and
  `columnIndex` props on the headless grid, and `GridCellSlotProps`.

  `VueyeTable` gains a `status` slot to rewrite the "1–10 of 57 rows" line, shows `loading-text`
  there too while the first page loads, and types `row-count` as `number | undefined`.
