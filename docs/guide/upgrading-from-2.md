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

Search, column filters, multi-column sorting, column visibility, server mode (`manual`), CSV and
TSV export, a spreadsheet (`<VueyeGrid>`) with editing, clipboard, and undo, dark mode, density,
and theming through CSS custom properties.
