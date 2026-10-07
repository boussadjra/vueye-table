# Component reference

## `<VueyeTable>`

A complete data table: search, column visibility, sorting, selection, pagination, a live status
line, loading and empty states, and theming.

### Props

| Prop                  | Type                                       | Default            |
| --------------------- | ------------------------------------------ | ------------------ |
| `data`                | `readonly Row[]`                           | required           |
| `columns`             | `ColumnDef<Row>[]`                         | inferred           |
| `row-key`             | path or `(row, index) => RowKey`           | `id`, then index   |
| `selectable`          | `boolean \| "single" \| "multiple"`        | `false`            |
| `select-scope`        | `"page" \| "all"`                          | `"all"`            |
| `manual`              | `boolean`                                  | `false`            |
| `row-count`           | `number`, the total for `manual`           |                    |
| `loading`             | `boolean`                                  | `false`            |
| `loading-text`        | `string`                                   | `"Loading…"`       |
| `caption`             | `string`                                   |                    |
| `searchable`          | `boolean`                                  | `true`             |
| `search-placeholder`  | `string`                                   | `"Search…"`        |
| `column-toggle`       | `boolean`                                  | `true`             |
| `pagination`          | `boolean`                                  | `true`             |
| `page-size-options`   | `number[]`                                 | `[5, 10, 20, 50]`  |
| `density`             | `"compact" \| "comfortable" \| "spacious"` | `"comfortable"`    |
| `striped`, `bordered` | `boolean`                                  | `false`            |
| `hover`               | `boolean`                                  | `true`             |
| `sticky-header`       | `boolean`                                  | `false`            |
| `max-height`          | CSS height                                 |                    |
| `theme`               | `"light" \| "dark"`                        | follows the system |

`selectable`, `select-scope`, `manual`, and `row-key` are read when the table is created.

### v-model

`page`, `page-size`, `sorting`, `search`, `filters`, `hidden-columns`, and `selected`. See
[State and v-model](/guide/state).

### Events

| Event          | Payload                                                        |
| -------------- | -------------------------------------------------------------- |
| `state-change` | The whole `TableState`, after each change a user makes.        |
| `row-click`    | `(item, row)`. Clicking a selection checkbox does not emit it. |

### Slots

| Slot          | Props                                                                                 |
| ------------- | ------------------------------------------------------------------------------------- |
| `cell.<id>`   | `{ item, row, value, display, column }`                                               |
| `header.<id>` | `{ column }`                                                                          |
| `toolbar`     | `{ table }`, placed between the search and the column menu                            |
| `footer`      | `{ table }`, placed after the status line                                             |
| `empty`       | Shown when no row passes the search and filters.                                      |
| `loading`     | Shown while `loading` with no rows yet.                                               |
| `status`      | `{ start, end, rowCount, totalRowCount, selectedCount }`, replacing "1–10 of 57 rows" |

### Exposed

`table`: the [binding](/guide/state#reading-the-table), with every snapshot field and operation.

```vue
<script setup lang="ts">
import { useTemplateRef } from "vue";

const orders = useTemplateRef("orders");
const exportCsv = () => orders.value?.table.exportRows({ format: "csv" });
</script>

<template>
  <VueyeTable ref="orders" :data="data" :columns="columns" />
</template>
```

## `<VueyeGrid>`

An editable spreadsheet over an array. It accepts the props of `<VueyeTable>` for columns, keys,
surface, and state, with these differences:

| Prop                                        | Type      | Default                                                             |
| ------------------------------------------- | --------- | ------------------------------------------------------------------- |
| `editable`                                  | `boolean` | `true`: columns are editable unless their definition says otherwise |
| `row-numbers`                               | `boolean` | `true`                                                              |
| `column-letters`                            | `boolean` | `false`                                                             |
| `label`                                     | `string`  | `"Spreadsheet"`, the grid's accessible name                         |
| `toolbar`                                   | `boolean` | `true`: undo, redo, and CSV export buttons                          |
| `searchable`, `column-toggle`, `pagination` | `boolean` | `false`                                                             |

Events: `update:data`, `edit`, `edit-error`, `export`, `state-change`, and the state `v-model`
updates. Slots: `cell.<id>` with `{ item, row, column, value, display, editable }`. See
[Editing and spreadsheets](/guide/editing).

## Styled components

`@vueye-table/styled` arranges the headless components with the theme. Each reads the table
provided by `<VtTable>`, `<VtGrid>`, or `provideDataTable`.

| Component            | Renders                                                                                                                     |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `VtTable`            | The surface, loading bar, scroll area, and table. Props: `table` and the surface options.                                   |
| `VtHeader`           | Header cells with sort buttons and indicators. Slots: `header.<id>`, `header`, `before`, `after`.                           |
| `VtBody`             | Body rows with the empty state. Slots: `default`, `empty`.                                                                  |
| `VtGrid`             | The spreadsheet surface. Props: `table`, `label`, `row-numbers`, `column-letters`, and surface options. Slots: `cell.<id>`. |
| `VtToolbar`          | A bar for controls above or below a table.                                                                                  |
| `VtSearch`           | A search field with an icon.                                                                                                |
| `VtColumnVisibility` | A "Columns" menu of checkboxes.                                                                                             |
| `VtPageSize`         | "Rows per page" with a picker. Prop: `options`.                                                                             |
| `VtPagination`       | Previous, numbered, and next buttons.                                                                                       |
| `VtStatus`           | "1–10 of 57 rows, 3 selected", announced politely.                                                                          |
| `VtEmpty`            | The empty state. Prop: `text`.                                                                                              |
| `VtSortIndicator`    | The sort arrow, with priority in multi-column sorts.                                                                        |

```vue
<script setup lang="ts">
import {
  VtPagination,
  VtSearch,
  VtStatus,
  VtTable,
  VtToolbar,
  provideDataTable,
  useDataTable,
} from "vueye-table";

const table = useDataTable({ data: orders, columns });
provideDataTable(table); // for the controls outside <VtTable>
</script>

<template>
  <VtToolbar><VtSearch /></VtToolbar>
  <VtTable :table="table" sticky-header max-height="24rem" />
  <VtToolbar><VtStatus /><VtPagination /></VtToolbar>
</template>
```

Controls outside `<VtTable>` need the table provided above them, which is what
`provideDataTable(table)` does in the component that creates it.

## Headless components

`@vueye-table/headless` renders semantic, accessible markup with no styles. Every component takes
`as` to change its element and passes its state to its default slot.

| Component                               | Role                                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------------------- |
| `DataTableRoot`                         | Provides the table; renders `<table>` with `aria-rowcount`.                           |
| `DataTableCaption`                      | The caption.                                                                          |
| `DataTableHeader`, `DataTableHeaderRow` | The header section and row.                                                           |
| `DataTableHeaderCell`                   | A header cell with `aria-sort`. Slot: `{ column, sort, toggleSort }`.                 |
| `DataTableSortButton`                   | Toggles a column's sort; Shift adds it to the sort.                                   |
| `DataTableBody`                         | Body rows. Slots: `default` with `{ rows }`, `empty`.                                 |
| `DataTableRow`                          | A row with `aria-selected`. Slot: `{ row, selected, columns }`.                       |
| `DataTableCell`                         | A cell. Slot: `{ row, column, value, display }`.                                      |
| `DataTableEmpty`                        | Renders its slot only when no row matches.                                            |
| `DataTableSelectAll`                    | The select-all checkbox, indeterminate when partial. Slot: `{ state, toggle }`.       |
| `DataTableSelectRow`                    | A row's checkbox. Slot: `{ selected, toggle }`.                                       |
| `DataTableSearch`                       | The search input. Prop: `debounce` in milliseconds.                                   |
| `DataTablePagination`                   | Page buttons with `aria-current`. Slot: `{ page, pageCount, items, … }`.              |
| `DataTablePageSize`                     | The page size `<select>`.                                                             |
| `DataTableColumnVisibility`             | A checkbox per column. Slot: `{ columns, toggle }`.                                   |
| `DataTableStatus`                       | A polite live region. Slot: `{ start, end, rowCount, … }`.                            |
| `DataGridRoot`                          | A `role="grid"` spreadsheet with keyboard and clipboard handling.                     |
| `DataGridBody`                          | Grid rows. Slots: `cell`, `rowHeader`.                                                |
| `DataGridCell`                          | A grid cell with selection, editing, and `aria-selected`. Slots: `default`, `editor`. |

## Composables

| Function                      | Returns                                                  |
| ----------------------------- | -------------------------------------------------------- |
| `useDataTable(options)`       | A reactive binding: snapshot fields and operations.      |
| `useDataGrid(table)`          | Spreadsheet selection, editing, clipboard, and keys.     |
| `provideDataTable(table)`     | Makes a table available to components below.             |
| `injectDataTable()`           | Reads the provided table, or throws naming the provider. |
| `defineColumns<Row>(columns)` | Typed column definitions.                                |

`useDataTable` options: `data`, `columns`, `rowCount`, and `state` accept refs or getters;
`rowKey`, `initialState`, `selectionMode`, `selectScope`, `manual`, `paginate`, `historyLimit`, `pasteLimit`,
`onStateChange`, `onDataChange`, and `onEditIssues` are read once.
