# @vueye-table/headless

## 3.0.0-alpha.6

### Minor Changes

- a39786b: Add opt-in table and grid virtualization with native spacers, aligned virtual columns, stable logical indices, active-cell/editor retention, deterministic SSR windows and viewport-aware keyboard navigation. Expose headless viewport/column composition, offscreen layout lookup and Vue scroll margins; forward props through styled/full components and register the new Nuxt layer components.

### Patch Changes

- Updated dependencies [a39786b]
  - @vueye-table/core@3.0.0-alpha.6
  - @vueye-table/vue@3.0.0-alpha.6

## 3.0.0-alpha.5

### Patch Changes

- Updated dependencies [5598ba8]
  - @vueye-table/core@3.0.0-alpha.5
  - @vueye-table/vue@3.0.0-alpha.5

## 3.0.0-alpha.4

### Patch Changes

- Updated dependencies [7f2183e]
  - @vueye-table/core@3.0.0-alpha.4
  - @vueye-table/vue@3.0.0-alpha.4

## 3.0.0-alpha.3

### Patch Changes

- Updated dependencies [b84f815]
  - @vueye-table/core@3.0.0-alpha.3
  - @vueye-table/vue@3.0.0-alpha.3

## 3.0.0-alpha.2

### Patch Changes

- Updated dependencies [bc81c20]
- Updated dependencies [b11b290]
- Updated dependencies [8885afc]
- Updated dependencies [0c7186c]
  - @vueye-table/core@3.0.0-alpha.2
  - @vueye-table/vue@3.0.0-alpha.2

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

- Updated dependencies [03b46ee]
- Updated dependencies [0b505e9]
  - @vueye-table/core@3.0.0-alpha.1
  - @vueye-table/vue@3.0.0-alpha.1
