# ADR 0001: Layered packages

- Status: Accepted
- Date: 2026-09-27
- Scope: every package

## Context

vueye-table 2.x was one Vue component. Anything it did not anticipate, such as a card layout, a
server-driven table, or an editable grid, meant forking it or fighting its slots. Version 3 is a
framework around tabular data, and people arrive at it with different needs: some want a table in
one tag, some want only behavior, and some are not in a component at all.

## Decision

Split the framework into layers, each depending only on the ones beneath it:

1. `@vueye-table/core`, the engine, framework-independent.
2. `@vueye-table/vue`, composables that bind the engine to Vue reactivity.
3. `@vueye-table/headless`, unstyled accessible components.
4. `@vueye-table/styled`, themed components and a stylesheet.
5. `vueye-table`, the complete `VueyeTable` and `VueyeGrid`, re-exporting every layer.
6. `@vueye-table/nuxt`, the Nuxt module, depending on `vueye-table`.

The unscoped `vueye-table` name stays the entry point people already install. The scoped
packages let a project take only the layers it uses. Versions move in lockstep through
changesets.

The graph lives in `scripts/packages.mjs` and is enforced by `scripts/check-boundaries.mjs`:
manifests may declare only the layers beneath them, sources may import only those, `core` imports
no framework, and no package reads a browser global.

## Consequences

- A fix in the engine reaches every layer without duplicated logic.
- The engine can run on a server, in a worker, or under another framework binding later.
- Six packages cost more release machinery than one. Lockstep versions keep that manageable.
