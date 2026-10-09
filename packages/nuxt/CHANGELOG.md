# @vueye-table/nuxt

## 3.0.0-beta.1

### First 3.0 beta

- Promote the corrected alpha.12 package group to the beta channel. All six public packages share `3.0.0-beta.1`; install the exact version or the npm `beta` tag.
- Record the documented layered API contract for application feedback: immutable data updates, typed editing and validation, virtual table/grid surfaces, lazy trees and streaming. See the [beta contract](https://vueye-table-docs.vercel.app/guide/beta) and [migration guide](https://vueye-table-docs.vercel.app/guide/upgrading-from-2) for applications upgrading from 2.x.
- Include the warehouse fixes for accessible utility-column coordinates, pointer row-action menus inside virtual viewports, and reactive tree search context with retained branches, selection and edits.
- Keep keyboard focus through virtual tree Home/End navigation and prevent grid pointer focus from moving cells between clicks or blurring newly mounted editors.
- The independent warehouse consumer exercises npm packages with SQLite, persistent server saves/conflicts, 100k rows, lazy HTTP branches and multilingual receiving streams. See its [acceptance log](https://github.com/boussadjra/vueye-table/blob/main/examples/operations-desk/ACCEPTANCE.md) for the exact tested versions and browser results.
- Corrected npm alpha.12 passed strict application checks on Windows/Linux, the 433-test repository gate, and [all 36 Chromium/Firefox/WebKit interaction cases](https://github.com/boussadjra/vueye-table/actions/runs/37963069703). Retest the consumer against the published beta group after promotion.

Beta remains a prerelease. A manual screen-reader session has not been run; automated attributes and keyboard checks do not establish assistive-technology acceptance or production readiness.

## 3.0.0-alpha.12

### Patch Changes

- vueye-table@3.0.0-alpha.12

## 3.0.0-alpha.11

### Patch Changes

- Updated dependencies [ff20492]
- Updated dependencies [28b5650]
  - vueye-table@3.0.0-alpha.11

## 3.0.0-alpha.10

### Minor Changes

- d90554a: Add inline table cell/row editing, typed and custom grid editors, validation feedback,
  dirty/revert and row actions. Preserve unchanged row projections during edits and expose
  shared editor primitives through the component layers and optional Nuxt registration.

### Patch Changes

- Updated dependencies [d90554a]
  - vueye-table@3.0.0-alpha.10

## 3.0.0-alpha.9

### Minor Changes

- 7a0c4d0: Add accessible tree disclosure and detail-row components across all UI layers, including full-component tree callbacks, controlled expansion, lazy-load recovery, retained details, keyboard navigation and virtual rendering. Preserve unrelated cell-slot renders and enforce the package HTML content boundary.

### Patch Changes

- Updated dependencies [7a0c4d0]
  - vueye-table@3.0.0-alpha.9

## 3.0.0-alpha.8

### Minor Changes

- 26b01b1: Add cancellable reactive sources and cursor loading to Vue bindings and table/grid components,
  with frame-coalesced Vue snapshots, mount-deferred SSR startup, virtual-end loading, live status,
  retry controls and loading sentinels. Initial data is optional for managed sources.

### Patch Changes

- Updated dependencies [26b01b1]
  - vueye-table@3.0.0-alpha.8

## 3.0.0-alpha.7

### Patch Changes

- vueye-table@3.0.0-alpha.7

## 3.0.0-alpha.6

### Patch Changes

- a39786b: Add opt-in table and grid virtualization with native spacers, aligned virtual columns, stable logical indices, active-cell/editor retention, deterministic SSR windows and viewport-aware keyboard navigation. Expose headless viewport/column composition, offscreen layout lookup and Vue scroll margins; forward props through styled/full components and register the new Nuxt layer components.
- Updated dependencies [a39786b]
  - vueye-table@3.0.0-alpha.6

## 3.0.0-alpha.5

### Patch Changes

- Updated dependencies [5598ba8]
  - vueye-table@3.0.0-alpha.5

## 3.0.0-alpha.4

### Patch Changes

- Updated dependencies [7f2183e]
  - vueye-table@3.0.0-alpha.4

## 3.0.0-alpha.3

### Patch Changes

- Updated dependencies [b84f815]
  - vueye-table@3.0.0-alpha.3

## 3.0.0-alpha.2

### Patch Changes

- Updated dependencies [bc81c20]
- Updated dependencies [b11b290]
- Updated dependencies [8885afc]
- Updated dependencies [0c7186c]
  - vueye-table@3.0.0-alpha.2

## 3.0.0-alpha.1

### Major Changes

- 03b46ee: Rewrite vueye-table as a layered framework: a framework-independent engine, Vue composables,
  headless components, styled components, and the complete `VueyeTable` and `VueyeGrid`. See
  `docs/guide/upgrading-from-2.md`.

### Patch Changes

- Updated dependencies [03b46ee]
- Updated dependencies [0b505e9]
  - vueye-table@3.0.0-alpha.1
