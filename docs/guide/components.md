# Component reference

## `<VueyeTable>`

A complete data table: search, column visibility, sorting, selection, pagination, a live status
line, loading and empty states, and theming.

### Props

| Prop                  | Type                                       | Default                                    |
| --------------------- | ------------------------------------------ | ------------------------------------------ |
| `data`                | `readonly Row[]`, initial rows             | `[]`                                       |
| `source`              | `TableSource<Row>`                         |                                            |
| `load-more`           | `LoadMore<Row>`                            |                                            |
| `end-threshold`       | non-negative integer                       | `5`                                        |
| `columns`             | `ColumnDef<Row>[]`                         | inferred                                   |
| `row-key`             | path or `(row, index) => RowKey`           | `id`, then index                           |
| `selectable`          | `boolean \| "single" \| "multiple"`        | `false`                                    |
| `select-scope`        | `"page" \| "all"`                          | `"all"`                                    |
| `manual`              | `boolean`                                  | `true` with `load-more`, otherwise `false` |
| `row-count`           | `number`, the total for `manual`           |                                            |
| `loading`             | `boolean`                                  | `false`                                    |
| `loading-text`        | `string`                                   | `"Loading…"`                               |
| `caption`             | `string`                                   |                                            |
| `searchable`          | `boolean`                                  | `true`                                     |
| `search-placeholder`  | `string`                                   | `"Search…"`                                |
| `column-toggle`       | `boolean`                                  | `true`                                     |
| `pagination`          | `boolean`                                  | `true`                                     |
| `page-size-options`   | `number[]`                                 | `[5, 10, 20, 50]`                          |
| `density`             | `"compact" \| "comfortable" \| "spacious"` | `"comfortable"`                            |
| `striped`, `bordered` | `boolean`                                  | `false`                                    |
| `hover`               | `boolean`                                  | `true`                                     |
| `sticky-header`       | `boolean`                                  | `false`                                    |
| `max-height`          | CSS height                                 |                                            |
| `theme`               | `"light" \| "dark"`                        | follows the system                         |

`selectable`, `select-scope`, `manual`, and `row-key` are read when the table is created.

Both full components also accept `row-can-expand: (item) => boolean`, `expand-mode: 'single' | 'multiple'`
(default `'multiple'`), `tree-column: string`, and `keep-alive-detail: boolean` (default false).
Tree props mirror engine options: `get-children`, `set-children`, `get-parent-key`, `has-children`,
`load-children`, `tree-filter`, `paginate-by`. Callbacks, filter/page mode, eligibility and expansion
mode are creation options. See [expansion](/guide/expansion) and [trees](/guide/trees).
The `expanded` slot receives `{ row, rowIndex }`; `v-model:expanded` accepts readonly row keys or
`true`. `expand` / `collapse` events receive `(item, row)`.

Choose `source` or `load-more`; both full components accept them and show loaded counts and retry controls. They default to no pagination with either option. Supply explicit columns for an empty initial dataset. See [Vue sources and cursor loading](/guide/streaming#manage-a-source-in-vue).

`virtual`, `height`, `row-height`, `overscan`, `paginate`, and grid `virtual-columns`/`column-width` are described in the [virtualization guide](/guide/virtualization#component-props). Virtualization is opt-in; full virtual tables default to no paging and a sticky header. Its renderer options are creation options, while data and state stay reactive.

### v-model

`page`, `page-size`, `sorting`, `search`, `filters`, `hidden-columns`, and `selected`. See
[State and v-model](/guide/state).

### Events

| Event          | Payload                                                        |
| -------------- | -------------------------------------------------------------- |
| `state-change` | The whole `TableState`, after each change a user makes.        |
| `row-click`    | `(item, row)`. Clicking a selection checkbox does not emit it. |

### Slots

| Slot          | Props                                                                                                                    |
| ------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `cell.<id>`   | `{ item, row, value, display, column }`                                                                                  |
| `header.<id>` | `{ column }`                                                                                                             |
| `toolbar`     | `{ table }`, placed between the search and the column menu                                                               |
| `footer`      | `{ table }`, placed after the status line                                                                                |
| `empty`       | Shown when no row passes the search and filters.                                                                         |
| `loading`     | Shown while `loading` with no rows yet.                                                                                  |
| `status`      | `TableStatusSlotProps`: range, selection, `loadState`, `loadedRowCount`, `loadError`, `canLoadMore`, `retry`, `loadNext` |

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

Use `label` for the grid's accessible name and `aria-describedby` to reference keyboard instructions or other help. `VueyeGrid` and `VtGrid` forward this description to the focusable grid element.

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

The grid also accepts the `status` slot with `TableStatusSlotProps`.

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
| `VtLoadMore`         | A styled load-more or retry button. Props: `label`, `loading-label`, `retry-label`.                                         |
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

| Component                               | Role                                                                                                               |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `DataTableRoot`                         | Provides the table; renders `<table>` with `aria-rowcount`.                                                        |
| `DataTableCaption`                      | The caption.                                                                                                       |
| `DataTableHeader`, `DataTableHeaderRow` | The header section and row.                                                                                        |
| `DataTableHeaderCell`                   | A header cell with `aria-sort`. Slot: `{ column, sort, toggleSort }`.                                              |
| `DataTableSortButton`                   | Toggles a column's sort; Shift adds it to the sort.                                                                |
| `DataTableBody`                         | Body rows. Slots: `default` with `{ rows }`, `empty`.                                                              |
| `DataTableRow`                          | A row with `aria-selected`. Slot: `{ row, selected, columns }`.                                                    |
| `DataTableCell`                         | A cell. Slot: `{ row, column, value, display }`.                                                                   |
| `DataTableEmpty`                        | Renders its slot only when no row matches.                                                                         |
| `DataTableSelectAll`                    | The select-all checkbox, indeterminate when partial. Slot: `{ state, toggle }`.                                    |
| `DataTableSelectRow`                    | A row's checkbox. Slot: `{ selected, toggle }`.                                                                    |
| `DataTableSearch`                       | The search input. Prop: `debounce` in milliseconds.                                                                |
| `DataTablePagination`                   | Page buttons with `aria-current`. Slot: `{ page, pageCount, items, … }`.                                           |
| `DataTablePageSize`                     | The page size `<select>`.                                                                                          |
| `DataTableColumnVisibility`             | A checkbox per column. Slot: `{ columns, toggle }`.                                                                |
| `DataTableStatus`                       | A polite live region. Slot: `{ start, end, rowCount, … }`.                                                         |
| `DataTableLoadMore`                     | A keyboard-accessible cursor load-more or source retry button.                                                     |
| `DataTableExpandToggle`                 | Disclosure button. Props: `row`, optional `controls`, `expand-label`, `collapse-label`. Slot: `{ row, expanded }`. |
| `DataTableDetailRow`                    | Deferred full-width detail. Props: `row`, `colspan`, optional `keep-alive`. Slot: `{ row }`.                       |
| `DataTableTreeCell`                     | Indentation, disclosure and child-load recovery. Props: `row`, `as`. Slots: `default`, `toggle` with `{ row }`.    |
| `DataGridRoot`                          | A `role="grid"` spreadsheet with keyboard and clipboard handling.                                                  |
| `DataGridBody`                          | Grid rows. Slots: `cell`, `rowHeader`.                                                                             |
| `DataGridCell`                          | A grid cell with selection, editing, and `aria-selected`. Slots: `default`, `editor`.                              |

## Composables

Roots (`DataTableRoot`, `DataGridRoot`, `VtTable`, `VtGrid`) accept `tree-column` and
`keep-alive-detail`. `DataTableBody` adds `row` and `detail` slots with `{ row, rowIndex }`;
`DataGridBody` adds `detail` with the same props. `DataTableCell` / `DataGridCell` accept
`:tree="false"` for manually wrapped tree content. `DataTableSelectRow` adds `indeterminate` to
its slot, reflecting loaded-subtree coverage. Status slots add `loadingChildrenCount` and
`childErrorCount`; custom status content owns its progress/failure announcements.

Styled equivalents are `VtExpandToggle`, `VtDetailRow`, `VtTreeCell`. Styled roots forward their
`expanded` slot, and `VtBody` exposes `row` / `detail` slots. All disclosure IDs are instance-scoped
and stable across SSR hydration. `--vt-tree-indent` controls the logical indentation step.

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

`data` defaults to an empty array. `source` and `loadMore` accept values or refs. A source factory tracks its synchronous reactive reads and restarts on changes. `streamOptions`, `scheduleFrame` and `endThreshold` are creation options. The binding adds `loadingMode`, `canLoadMore`, `loadError`, `loadNext()` and `retry()`; see [streaming](/guide/streaming).

`useDataGrid(table, { treeColumn: () => 'name' })` chooses the column that handles tree keys.
The optional callback stays reactive. `table.tree` indicates configured hierarchy independently
of whether any rows exist. Tree callbacks and modes are creation options on `useDataTable` too.
