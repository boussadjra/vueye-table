# The 3.0 beta contract

**3.0.0-beta.1 is published** for all six packages on npm's `beta` channel, with provenance and a
[GitHub prerelease](https://github.com/boussadjra/vueye-table/releases/tag/v3.0.0-beta.1).
Beta is a prerelease for application feedback and does not establish production readiness.

## Install and upgrade

Install an exact version or opt into the beta channel:

```sh
pnpm add vueye-table@3.0.0-beta.1
# To follow subsequent betas:
pnpm add vueye-table@beta
```

Nuxt applications use `@vueye-table/nuxt@3.0.0-beta.1`. Keep directly installed vueye-table
packages on the same version. Vue 3.5 or later within Vue 3 is required; Nuxt integration supports Nuxt 4.x.
The packages use ESM. Import `vueye-table/style.css` for full or styled components; the Nuxt
module adds the stylesheet itself. See [getting started](/guide/getting-started) and
[Nuxt](/guide/nuxt) for complete setup.

Version 2 applications need the [2.x migration guide](/guide/upgrading-from-2). In particular,
column definitions, selected row keys, slot scopes and immutable data updates changed in 3.0.
Changing the dependency version alone does not migrate those contracts.

Applications upgrading from alpha.10 receive the warehouse fixes:

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
Beta.1 passed [Windows/Linux application checks and all 36 Chromium/Firefox/WebKit cases](https://github.com/boussadjra/vueye-table/actions/runs/37967992595)
against the published npm group, with zero retries. The repository gate passed 433 tests.
Automated accessibility attributes are evidence about markup; they do not prove a successful
screen-reader session. Known limits belong in the acceptance log and release notes.
