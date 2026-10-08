# Upgrading from 2.x

Version 3 is a rewrite. `<VueyeTable>` still exists in the `vueye-table` package, but its props
follow the new engine. The 2.x source is on the `legacy` branch.

## Install

```diff
- import { VueyeTable } from "vueye-table";
+ import "vueye-table/style.css";
+ import { VueyeTable } from "vueye-table";
```

The stylesheet is now a separate import. Nuxt users replace `nuxt-vueye-table` with
`@vueye-table/nuxt`, which adds the stylesheet itself.

## Props

| 2.x                           | 3.x                                                             |
| ----------------------------- | --------------------------------------------------------------- |
| `data`                        | `data`                                                          |
| `columnHeaders`               | `columns`, with `id` as a path (`"name.first"`) and `header`    |
| `itemValue`                   | `rowKey`, a path or a function; defaults to `id`                |
| `perPage`                     | `v-model:page-size`                                             |
| `currentPage`                 | `v-model:page`                                                  |
| `perPageOptions`              | `page-size-options`, an array                                   |
| `loading`                     | `loading`                                                       |
| `selected` (items)            | `v-model:selected` (row keys) with `selectable`                 |
| `selectMode: 'page' \| 'all'` | `select-scope: 'page' \| 'all'`                                 |
| `caption`                     | `caption`                                                       |
| `summary`                     | removed; describe the table in `caption` or surrounding content |

Selection now holds row keys rather than items, so it survives data reloads and works with
server pages. Read the selected items with the exposed table:
`tableRef.value.table.getSelectedRows()`.

## Slots

| 2.x                                           | 3.x                                                      |
| --------------------------------------------- | -------------------------------------------------------- |
| `headerCell.<key>`, `headerCellContent.<key>` | `header.<id>` with `{ column, sort, toggleSort }`        |
| `itemCell.<key>`, `itemCellContent.<key>`     | `cell.<id>` with `{ item, row, value, display, column }` |
| `headers`, `rows`, `row`, `checkbox`          | build the table from headless or styled components       |

When a slot replaced a whole region in 2.x, compose that region in 3.x from
`@vueye-table/styled` or `@vueye-table/headless` with `useDataTable`, which keep the behavior
and let you own the markup.

## New in 3.x

### Expansion and editing

The legacy branch's [ExpandRows example](https://github.com/boussadjra/vueye-table/blob/legacy/src/views/guide/ExpandRows.vue)
used `#expand="{ item }"`. Replace it with `#expanded="{ row }"` and read `row.original`;
use `row-can-expand` to choose expandable rows and `v-model:expanded` for controlled keys.
`expand-mode="single"` limits open details. Hierarchies use `getChildren` or `getParentKey`;
a detail slot is not a tree data model. See [expansion](/guide/expansion) and [trees](/guide/trees).

For application-owned editable cells from 2.x, move parsing and constraints into column
definitions. Use `VueyeTable edit-mode="cell"` / `"row"` with `editable: true` columns,
or `VueyeGrid` for spreadsheet defaults. Bind `v-model:data` to receive immutable arrays.
Custom controls move to `editor.<id>` slots. Local save events do not persist remotely;
use [pending changes and acknowledged baselines](/guide/validation). No legacy edit event
is assumed to be equivalent to the new persistence contract.

Search, column filters, multi-column sorting, column visibility, server mode (`manual`), CSV and
TSV export, a spreadsheet (`<VueyeGrid>`) with editing, clipboard, and undo, dark mode, density,
and theming through CSS custom properties.

## Export and paste behavior in 3.x alpha

`exportRows()` now prefixes formula-like CSV/TSV cell text and headers with an apostrophe by
default. For example, text `=1+1` exports as `'=1+1`, while the numeric value `-12` stays
`-12`. Pass `{ escapeFormulas: false }` only when literal output is required and the
destination handles that text safely. Clipboard copies preserve literal text by default;
`table.copy(range, { escapeFormulas: true })` and `grid.copy({ escapeFormulas: true })`
enable escaping.

Pastes now stop at the visible grid and parsing limits. Excess input reports a
`paste_truncated` issue; a field cut short by the character limit is not written.
`createTable` and `useDataTable` accept `pasteLimit: { maxCells, maxLength }` to change the
defaults of 100,000 parsed fields and 5,000,000 UTF-16 code units. See
[editing and spreadsheets](/guide/editing#paste-limits).

Column paths containing `__proto__`, `constructor`, or `prototype` are ignored with
`unsafe_path` issues. Safe inherited getters remain readable. Unsafe `setPath` writes return the
original input unchanged; its optional fourth argument receives the issue.
