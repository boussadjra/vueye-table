# The 3.0 beta contract

**3.0.0-beta.2 is published** for all six packages on npm's `beta` channel, with provenance and a
[GitHub release](https://github.com/boussadjra/vueye-table/releases/tag/v3.0.0-beta.2).
Beta is a prerelease for application feedback and does not establish production readiness.
npm's `latest` tag still points at the last alpha, so install `@beta` or an exact version.

## Install and upgrade

Install an exact version or opt into the beta channel:

```sh
pnpm add vueye-table@3.0.0-beta.2
# To follow subsequent betas:
pnpm add vueye-table@beta
```

Nuxt applications use `@vueye-table/nuxt@3.0.0-beta.2`. Keep directly installed vueye-table
packages on the same version. Vue 3.5 or later within Vue 3 is required; Nuxt integration supports Nuxt 4.x.
The packages use ESM. Import `vueye-table/style.css` for full or styled components; the Nuxt
module adds the stylesheet itself. See [getting started](/guide/getting-started) and
[Nuxt](/guide/nuxt) for complete setup.

Version 2 applications need the [2.x migration guide](/guide/upgrading-from-2). In particular,
column definitions, selected row keys, slot scopes and immutable data updates changed in 3.0.
Changing the dependency version alone does not migrate those contracts.

## What changed in beta.3

Beta.3 adds `row-attrs` to `VueyeTable`, `VueyeGrid` and `VtGrid`: `(item, row) =>` a class, a
style, and `data-*` and `aria-*` attributes for each body row, so a row can be tinted by its state
and found by tests without a marker in one of its cells. The row's own attributes win on a
collision and handlers are left out. Headless rows take the same through `DataTableRow`'s
`attributes` prop and `DataGridBody`'s `row-attrs`, and `rowAttributes` filters them. Nothing was
removed or renamed. See [components](/guide/components).

## What changed in beta.2

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

## What changed in beta.1

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

The beta line preserves documented import paths, option names, event payloads and slot scopes.
Additive changes require docs, runnable examples and a changeset. A necessary breaking change
requires an ADR, migration notes and a new beta version; read the release notes when upgrading.

The [Operations desk](/examples/operations-desk) tests the published package group with SQLite,
100k orders, editable stock, lazy trees and real HTTP streams. Its acceptance log distinguishes
published versions, unpublished candidates, hosted browser checks and unrun manual checks.
The full published-package acceptance run was recorded for beta.1: it passed [Windows/Linux application checks and all 36 Chromium/Firefox/WebKit cases](https://github.com/boussadjra/vueye-table/actions/runs/37967992595)
against the published npm group, with zero retries. The repository gate passed 433 tests.
Automated accessibility attributes are evidence about markup; they do not prove a successful
screen-reader session. Known limits belong in the acceptance log and release notes.
