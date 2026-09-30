# State and v-model

Everything a user can change about a table is one plain, serializable object:

```ts
interface TableState {
  sorting: { column: string; direction: "asc" | "desc" }[];
  search: string;
  filters: Record<string, unknown>;
  pagination: { page: number; pageSize: number };
  selection: (string | number)[]; // row keys
  hiddenColumns: string[];
  columnOrder: string[];
}
```

Because it is data, the state can be saved, restored, compared, written to the URL, or sent to a
server. Every change goes through a named operation (`toggleSort`, `search`, `filter`,
`goToPage`, `select`, `toggleColumn`, …), each operation skips changes that change nothing, and a
new frozen state replaces the old one.

## v-model on the full components

`<VueyeTable>` gives each piece of state its own `v-model`, so you bind only what you care about:

```vue
<script setup lang="ts">
import { ref } from "vue";
import type { RowKey, SortRule } from "vueye-table";

const page = ref(1);
const sorting = ref<readonly SortRule[]>([{ column: "placedAt", direction: "desc" }]);
const search = ref("");
const filters = ref<Readonly<Record<string, unknown>>>({ status: ["paid", "shipped"] });
const selected = ref<readonly RowKey[]>([]);
</script>

<template>
  <VueyeTable
    v-model:page="page"
    v-model:sorting="sorting"
    v-model:search="search"
    v-model:filters="filters"
    v-model:selected="selected"
    :data="orders"
    :columns="columns"
    selectable
  />
</template>
```

| v-model                  | Type                      |
| ------------------------ | ------------------------- |
| `v-model:page`           | `number`, from 1          |
| `v-model:page-size`      | `number`                  |
| `v-model:sorting`        | `readonly SortRule[]`     |
| `v-model:search`         | `string`                  |
| `v-model:filters`        | `Record<string, unknown>` |
| `v-model:hidden-columns` | `readonly string[]`       |
| `v-model:selected`       | `readonly RowKey[]`       |

State you leave unbound stays inside the table. `@state-change` delivers the whole state after
every change a user makes, which is the easiest way to persist all of it.

Search, filters, and sorting return to page 1. Changing the page size keeps the first visible row
in view.

## Driving the table from outside

A bound value is the source of truth. Set it and the table follows:

```ts
filters.value = { ...filters.value, status: ["refunded"] }; // show refunds
search.value = ""; // clear the search box
sorting.value = []; // back to the data's order
```

Filters are often drawn outside the table, as chips or a sidebar. They only need to write
`filters`:

```vue
<button
  v-for="status in ['pending', 'paid', 'shipped']"
  :key="status"
  :aria-pressed="filters.status === status"
  @click="filters = { ...filters, status }"
>
  {{ status }}
</button>
```

## Saving and restoring

Restore the state as initial `v-model` values and save it on every change. Browser storage is only
available in the browser, so read it after mounting when the page is rendered on a server.

```vue
<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { SortRule, TableState } from "vueye-table";

const sorting = ref<readonly SortRule[]>([]);
const hiddenColumns = ref<readonly string[]>([]);

onMounted(() => {
  const saved = localStorage.getItem("orders-table");
  if (saved) {
    const state = JSON.parse(saved) as TableState;
    sorting.value = state.sorting;
    hiddenColumns.value = state.hiddenColumns;
  }
});

function save(state: TableState): void {
  localStorage.setItem("orders-table", JSON.stringify(state));
}
</script>

<template>
  <VueyeTable
    v-model:sorting="sorting"
    v-model:hidden-columns="hiddenColumns"
    :data="orders"
    :columns="columns"
    @state-change="save"
  />
</template>
```

## Keeping state in the URL

A shareable link needs the page, the search, and the filters in the query string. Map the query to
`v-model` values and back. With Vue Router:

```ts
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();

const page = computed({
  get: () => Number(route.query.page ?? 1),
  set: (value) => router.replace({ query: { ...route.query, page: String(value) } }),
});
const search = computed({
  get: () => String(route.query.q ?? ""),
  set: (value) => router.replace({ query: { ...route.query, q: value || undefined, page: "1" } }),
});
```

For typed, validated URL state with defaults and canonical output,
[QueryWeave](https://github.com/boussadjra/queryweave) keeps the same kind of plain state in the
URL, and its fields bind to these `v-model`s.

## Reading the table

The full components expose the binding. Everything a renderer needs is a plain reactive property:

```vue
<script setup lang="ts">
import { computed, useTemplateRef } from "vue";

const orders = useTemplateRef("orders");

// Revenue of every row that passes the search and filters, on all pages.
const revenue = computed(
  () => orders.value?.table.processedRows.reduce((sum, row) => sum + row.original.total, 0) ?? 0,
);
</script>

<template>
  <VueyeTable ref="orders" :data="data" :columns="columns" />
  <p>Filtered revenue: {{ revenue }}</p>
</template>
```

| Property                                         | What it holds                                        |
| ------------------------------------------------ | ---------------------------------------------------- |
| `rows`                                           | Rows on the current page.                            |
| `processedRows`                                  | Every row that passes search and filters, sorted.    |
| `rowCount`, `totalRowCount`                      | Rows after and before searching and filtering.       |
| `page`, `pageSize`, `pageCount`                  | Pagination, with the page clamped into range.        |
| `pageStart`, `pageEnd`                           | 1-based positions of the first and last rows shown.  |
| `columns`, `allColumns`                          | Visible columns, and every column, in display order. |
| `selectedCount`, `pageSelection`, `allSelection` | Selection size and `"none"`, `"some"`, or `"all"`.   |
| `state`                                          | The current `TableState`.                            |
| `issues`                                         | Problems the table recovered from.                   |

Each row gives `key`, `original` (your object), `getValue(columnId)`, and `getDisplay(columnId)`.
`getSelectedRows()` returns the selected rows that are present in the data.

## With the composable

`useDataTable` takes the same state through `state`, a ref or getter of a partial state, and
reports changes through `onStateChange`:

```ts
import { shallowRef } from "vue";
import { useDataTable, type TableState } from "vueye-table";

const saved = shallowRef<Partial<TableState>>({ pagination: { page: 1, pageSize: 25 } });

const table = useDataTable({
  data: () => orders.value,
  columns,
  state: saved,
  onStateChange: (state) => {
    saved.value = state;
  },
});

table.search("refund");
table.toggleSort("total");
table.filter("status", ["refunded"]);
```

Snapshot fields are plain reactive properties, not refs, so templates read `table.rows` directly.
Watching one needs a getter: `watch(() => table.page, …)`.

## Issues

Invalid state never breaks a table. A page size that is not a positive whole number falls back to
10, a page out of range is clamped, and state that names a column that does not exist is ignored.
Each recovery is reported in `table.issues` with a code (`invalid_page_size`, `unknown_column`,
`duplicate_row_key`, …) and a message, so nothing is dropped silently.
