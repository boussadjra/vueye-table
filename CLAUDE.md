# vueye-table

A Vue framework for data, data tables, and spreadsheets, built as layers over a
framework-independent engine. The repository layout follows `boussadjra/queryweave`.

Short rules live in [AGENTS.md](./AGENTS.md). Architecture lives in
[ARCHITECTURE.md](./ARCHITECTURE.md). Every major API decision has an ADR in [docs/adr](./docs/adr).

## Where things are

```text
packages/core          engine: columns, pipeline, state, selection, edits, grid, export
packages/vue           useDataTable, useDataGrid, provide and inject
packages/headless      DataTable* and DataGrid* components, unstyled and accessible
packages/styled        Vt* components and style.css
packages/vueye-table   VueyeTable, VueyeGrid, VueyeTablePlugin, re-exports every layer
packages/nuxt          the Nuxt module
apps/playground        every layer side by side (pnpm playground)
docs/                  the VitePress site (pnpm docs), ADRs, and guides; Vercel and Netlify deploy it
tests/<project>/       one directory per Vitest project
tooling/               shared tsconfig and Vitest configuration
scripts/packages.mjs   the single description of the package graph
scripts/check-boundaries.mjs  manifests, layer graph, imports, globals
```

## Non-negotiables

Enforced by `scripts/check-boundaries.mjs` and `tests/repository`:

- A package depends only on the layers beneath it: core ← vue ← headless ← styled ← vueye-table ←
  nuxt.
- `core` imports no framework and no Node.js built-in.
- No package reads a browser global. The checker matches whole words, comments included, so avoid
  `window`, `document`, `location`, `history`, `navigator`, `localStorage`, and `process` in
  package sources. Use template refs and event objects.
- Never import another package's source path; use its public entry point.
- Never mutate data passed in. Edits produce new arrays through `onDataChange`.
- Invalid input recovers and reports a `TableIssue`; it is never dropped silently.

## Design invariants

- `core` compiles with `lib: ["ES2023"]` and `types: []`. `isolatedDeclarations` is on for `core`
  and `vue`; exported functions need explicit return types.
- State is plain serializable data. Every change goes through a named operation; operations skip
  no-op changes and never call `onStateChange` for `setState`.
- Snapshots are frozen and replaced on change. Pipeline stages are memoized on their inputs.
- Search, filter, and sort return to page 1. Page size changes keep the first visible row.
- Vue bindings expose snapshot fields as plain reactive accessors, not refs.
- Components accept any row type (`AnyDataTableBinding`, `AnyColumnDef`); typing happens in
  `defineColumns<Row>()` and `useDataTable<Row>()`.

## Working rhythm

```bash
npx vitest run --project core      # narrow
pnpm check                         # the full gate before finishing
```

## Status

`3.0.0-alpha.0`, unreleased. The API is provisional. Do not claim production readiness.
