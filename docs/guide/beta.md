# The 3.0 release candidate contract

<!-- current-release:start -->

**3.0.0-rc.2 is published** for all six packages on npm's `latest` channel, with provenance and a
[GitHub release](https://github.com/boussadjra/vueye-table/releases/tag/v3.0.0-rc.2).
This release candidate freezes the documented API for final application validation and does not
establish production readiness. Default installs follow `latest`; `@beta` remains on the last beta.

## Install and upgrade

Install the exact release candidate:

```sh
pnpm add vueye-table@3.0.0-rc.2
```

Nuxt applications use `@vueye-table/nuxt@3.0.0-rc.2`. Keep directly installed vueye-table
packages on the same version.

<!-- current-release:end -->

Vue 3.5 or later within Vue 3 is required; Nuxt integration supports Nuxt 4.x.
The packages use ESM. Import `vueye-table/style.css` for full or styled components; the Nuxt
module adds the stylesheet itself. See [getting started](/guide/getting-started) and
[Nuxt](/guide/nuxt) for complete setup.

Version 2 applications need the [2.x migration guide](/guide/upgrading-from-2). In particular,
column definitions, selected row keys, slot scopes and immutable data updates changed in 3.0.
Changing the dependency version alone does not migrate those contracts.

## Release candidate scope

RC.1 promotes the beta.9 implementation without another public API change. It includes column
sizing and logical pinning, row grouping and aggregation, pinned row regions, and the completed
layout examples. The documented imports, options, events and slots are frozen for release-candidate
validation. Any necessary incompatible correction requires an ADR, migration notes and another
prerelease before stable 3.0.

The Windows Operations Desk consumer retest passed 54 functional cases across Chromium, Firefox
and WebKit against published RC.1 packages. A scoped NVDA/Edge session covered separator values,
group disclosure states and pinned grid coordinates. Automated accessibility checks found
spreadsheet sort-name and loading-contrast blockers; their corrections remain unpublished.
See the [current acceptance record](https://github.com/boussadjra/vueye-table/blob/main/examples/operations-desk/ACCEPTANCE.md).
The earlier beta.1 browser record below does not certify RC.1.

## What changed in beta.7

Beta.7 brings the column and row layout APIs into the full and composable component layers:

- Resize handles, sticky start/end columns, pin choices, and `columnSizing` / `columnPinning`
  models work with both virtual axes. See [columns](/guide/columns) and
  [the runnable column example](/examples/column-pinning).
- Group rows, aggregate headers or footers, group selection and ordered Group by controls render
  automatically. `grouping` and `expandedGroups` models keep the host in control. See
  [grouping](/guide/grouping) and [the grouped table/grid example](/examples/row-grouping).
- `rowPinning` separates top and bottom reference rows from the centre. `pinRow` and row actions
  move keys between regions. Pinned cells keep selection and editing; grid navigation uses
  `gridRows`, while accessible indices include structural rows. See [row pinning](/guide/row-pinning).
- Reactive Vue layout controls, measured pin bands and keyed group/footer virtualization preserve
  logical coordinates and scroll anchoring. Toolbar dropdowns stay above sticky intersections.

**Migration from beta.6:** complete `TableState` literals must add
`rowPinning: { top: [], bottom: [] }`. Partial state patches remain compatible. Custom grids use
`gridRows` for data-cell coordinates and render top/centre/bottom regions separately. In manual
tables, `rowCount` is the server's centre total. The documented state shape is in
[State and v-model](/guide/state).

## Earlier beta changes

The sections below describe when each API was introduced. The install commands above target
the current release.

### Beta.6: grouping and aggregation

Beta.6 added nested grouping, filtered-leaf aggregates, group expansion and selection, grouped
pagination and export. Complete state literals gained `grouping: []` and `expandedGroups: true`.
`TableRenderItem` gained `kind: "group"`; custom renderers must narrow the kind before accessing
`row` or `rowIndex`. Manual tables forward grouping state without aggregating partial server pages;
tree tables report unsupported grouping. Beta.7 supplies the built-in group rows and controls.

### Beta.5: logical column pinning

Beta.5 added `columnPinning`, `pinned` / `pinnable` column options and `pinColumn`.
Complete state literals gained `columnPinning: { start: [], end: [] }`. Snapshots expose effective
widths, offsets and pinned edges. Beta.7 supplies the sticky component rendering and controls.

### Beta.4: column sizing and release channels

Beta.4 adds persistent column widths through `TableState.columnSizing`, `resizeColumn`, and
`resetColumnSize`. Widths respect `minWidth`, `maxWidth`, and `resizable`; resizing keeps the
current page and reuses the row pipeline. Virtual columns discard stale measurements when a
width changes while retaining other measurements and scroll anchoring. See
[column widths](/guide/columns#widths-and-resizing) and [virtualization](/guide/virtualization).

**Migration:** complete hand-built `TableState` literals must add `columnSizing: {}`. Partial
state patches need no change. Beta.4 exposed sizing operations for custom controls;
beta.7 adds the built-in resize handles.

The core virtualizer's `setOptions` also accepts an optional second array of keys whose cached
measurements should be discarded when rebuilding layout. See
[ADR 0023](/adr/0023-virtual-column-measurement-invalidation).

Every beta now updates both `beta` and `latest` across all six packages, so default installs
follow the beta line. Exact versions remain available for applications that need a fixed release.

### Beta.3: row attributes

Beta.3 adds `row-attrs` to `VueyeTable`, `VueyeGrid` and `VtGrid`: `(item, row) =>` a class, a
style, and `data-*` and `aria-*` attributes for each body row, so a row can be tinted by its state
and found by tests without a marker in one of its cells. The row's own attributes win on a
collision and handlers are left out. Headless rows take the same through `DataTableRow`'s
`attributes` prop and `DataGridBody`'s `row-attrs`, and `rowAttributes` filters them. Nothing was
removed or renamed. See [components](/guide/components).

### Beta.2: language and themes

Beta.2 lets a host application speak its own language and wear its own theme. No import, option,
event or slot was removed or renamed. Because theme defaults now have zero specificity, host CSS
that used to lose to them now applies, so check custom styles when upgrading.

- Every word the components show or announce comes from `TableMessages`, passed through a
  `messages` prop or `VueyeTablePlugin` options. Counts are written in the table's `locale`,
  which also orders text. See [language](/guide/language).
- Search and text filters read text through `normalizeText`, by default `foldText`, which ignores
  case, accents and Arabic letter shapes. `filterRows` accepts the same function, so a server can
  filter exactly as the table does.
- Theme defaults sit at zero specificity on the outermost themed element, so host tokens win and
  toolbars inherit them. `theme="inherit"` declares no colors. See [theming](/guide/theming).
- A `header.<id>` slot keeps click-to-sort and receives `{ column, sort, toggleSort }`.
- Arrow keys and the collapsed-row chevron mirror right to left.
- State `update:*` events are typed, `VueyeTableExposed` types the template ref, and the Nuxt
  module's declaration names its types.

The decision is recorded in [ADR 0021](/adr/0021-host-language-text-and-themes).

### Beta.1: first beta and warehouse fixes

Beta.1 promoted the corrected alpha.12 package group. Applications upgrading from alpha.10
receive the warehouse fixes:

- Row-action menus stay within their utility column and reveal their opened controls in virtual
  viewports. Pointer and keyboard removal use the same operation.
- Accessible column counts and indices include utility cells. Data editing positions, A1 labels
  and column IDs retain their existing meaning. Custom headless roots and `VtTable` can declare
  their caller-rendered utility cells with `leadingColumns`.
- Changing `treeFilter` after mount updates search context without replacing the engine or
  clearing loaded branches, selected keys, expansion or edits. `useDataTable` accepts a ref or
  getter; core applications call `setTreeFilter(mode)`.
- Virtual tree Home/End navigation retains focus on the destination row. Pointer selection in
  grids preserves scroll position and queued grid focus leaves a newly opened editor focused.

These fixes require no alpha.10 application migration unless custom accessibility markup relied
on the former incorrect counts. See [components](/guide/components) and [trees](/guide/trees).

## Public layers

| Package                 | Contract                                                                   |
| ----------------------- | -------------------------------------------------------------------------- |
| `@vueye-table/core`     | Columns, immutable engine operations/snapshots, editing, trees and streams |
| `@vueye-table/vue`      | Reactive bindings, sources, row drafts and virtual viewport bindings       |
| `@vueye-table/headless` | Accessible table/grid primitives, editors, controls and hierarchy behavior |
| `@vueye-table/styled`   | Styled primitives, stylesheet and theme properties                         |
| `vueye-table`           | Full table/grid components and re-exports of the lower layers              |
| `@vueye-table/nuxt`     | Nuxt module, component registration and stylesheet integration             |

Use documented package entry points. Internal source files and build output paths are not
application APIs. The [API reference](/guide/api-reference), [component reference](/guide/components)
and [ADRs](/adr/0020-beta-api-contract) describe the contracts reviewed for beta.

Edits return new data through the update callback or `v-model:data`; the engine never writes into
caller-owned rows. Recovered invalid input is reported as a `TableIssue`. Pending changes and
`markSaved` manage a local acknowledged baseline. An application still owns server validation,
transactions, authorization and conflict handling; local save events do not persist remotely.
See [validation and saving](/guide/validation).

## Compatibility and acceptance

The prerelease line preserves documented import paths, option names, event payloads and slot scopes.
Additive changes require docs, runnable examples and a changeset. A necessary breaking change
requires an ADR, migration notes and a new prerelease version; read the release notes when upgrading.

The [Operations desk](/examples/operations-desk) tests the published package group with SQLite,
100k orders, editable stock, lazy trees and real HTTP streams. Its acceptance log distinguishes
published versions, unpublished candidates, hosted browser checks and unrun manual checks.
The full published-package acceptance run was recorded for beta.1: it passed [Windows/Linux application checks and all 36 Chromium/Firefox/WebKit cases](https://github.com/boussadjra/vueye-table/actions/runs/37967992595)
against the published npm group, with zero retries. The repository gate passed 433 tests.
Automated accessibility attributes are evidence about markup; they do not prove a successful
screen-reader session. Known limits belong in the acceptance log and release notes.
