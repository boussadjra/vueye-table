# vueye-table architecture

## Layers

```text
@vueye-table/core        engine: columns, row pipeline, state, selection, edits, grid, export
        ↑
@vueye-table/vue         useDataTable, useDataGrid, provide and inject
        ↑
@vueye-table/headless    unstyled, accessible components: DataTable*, DataGrid*
        ↑
@vueye-table/styled      themed components and style.css: Vt*
        ↑
vueye-table              VueyeTable, VueyeGrid, the plugin, and a re-export of every layer
        ↑
@vueye-table/nuxt        the Nuxt module
```

Each package depends only on the packages beneath it. `scripts/check-boundaries.mjs` enforces the
graph from `scripts/packages.mjs`, and the `repository` test project checks it again from the
sources, so skipping or inverting a layer fails the build.

## Data flow

```text
data + column definitions + state
        → index rows (keys, cached values)
        → filter (search terms, column filters)
        → sort (stable, several rules, empty last)
        → paginate (or all processed rows with paginate: false)
        → frozen snapshot → subscribers → Vue shallowRef → render
operations → new state → onStateChange → snapshot invalidated → subscribers
edits → parse → setValue (copy on write) → new data → onDataChange → history
viewport + estimates + keyed measurements → core virtualizer → render slice + offsets
```

Each pipeline stage is memoized on its inputs, so changing the page does not re-sort and selecting
a row does not re-filter. A `manual` table skips the pipeline and presents the page it was given.

## Core

`@vueye-table/core` compiles with `lib: ["ES2023"]` and `types: []`: no DOM, no Node.js, no
framework. It owns the vocabulary every other layer speaks: `ColumnDef`, `TableColumn`,
`TableRow`, `TableState`, `TableSnapshot`, `DataTable`, `CellEdit`, `EditResult`, `TableIssue`,
`GridSelection`, and `GridCommand`. Keyboard handling is expressed as a pure mapping from key
presses to grid commands, so the spreadsheet behavior is tested without a browser.

## Vue binding

`useDataTable` wraps one engine per effect scope. Snapshot fields are plain reactive accessor
properties on the binding, not refs, so templates read `table.rows` directly and a watcher uses a
getter. Every change goes through a named operation. Reactive arrays are unwrapped before they
reach the engine, so the engine compares and stores raw data.

## Components

Components are written as render functions in TypeScript, so the packages build with the same
tool as the engine and ship real declarations. Headless components read the table through
injection and describe state with ARIA and `data-*` attributes. The styled layer adds classes,
icons, and `style.css`, whose every value is a custom property. No component reads a browser
global: focus uses template refs and the clipboard uses event data, so everything renders on a
server.

## Testing

Vitest runs one project per package: `core` and `repository` in Node, and `vue`, `headless`,
`styled`, and `vueye-table` in happy-dom with Vue Test Utils. Tests import package sources
through aliases, so a failure points at the file that owns the behavior. Coverage thresholds are
enforced, with a stricter floor for the engine.

## Decisions

- Layered packages and their boundaries — ADR 0001.
- The engine: plain state, snapshots, operations, and issues — ADR 0002.
- Editing and the spreadsheet model — ADR 0003.
- Component layers, rendering, and theming — ADR 0004.
- Virtual layout and pagination disabling — ADR 0005.
- Export, path, and paste boundaries — ADR 0009.
