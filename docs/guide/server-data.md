# Server-side data

When the data is too large to send to the browser, the server searches, filters, sorts, and pages
it, and the table presents one page at a time. Add `manual` and give the total in `row-count`:

```vue
<script setup lang="ts">
import { ref, shallowRef, watch } from "vue";
import type { SortRule } from "vueye-table";

const page = ref(1);
const pageSize = ref(25);
const sorting = ref<readonly SortRule[]>([]);
const search = ref("");
const filters = ref<Readonly<Record<string, unknown>>>({});

const rows = shallowRef<readonly Issue[]>([]);
const total = ref(0);
const loading = ref(false);

let controller: AbortController | undefined;

watch(
  [page, pageSize, sorting, search, filters],
  async () => {
    controller?.abort(); // a newer request replaces an older one
    controller = new AbortController();
    loading.value = true;
    try {
      const result = await fetchIssues(
        {
          page: page.value,
          pageSize: pageSize.value,
          sorting: sorting.value,
          search: search.value,
          filters: filters.value,
        },
        { signal: controller.signal },
      );
      rows.value = result.rows;
      total.value = result.total;
      loading.value = false;
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        loading.value = false;
        throw error;
      }
    }
  },
  { immediate: true },
);
</script>

<template>
  <VueyeTable
    v-model:page="page"
    v-model:page-size="pageSize"
    v-model:sorting="sorting"
    v-model:search="search"
    v-model:filters="filters"
    manual
    :row-count="total"
    :data="rows"
    :columns="columns"
    :loading="loading"
  />
</template>
```

The [server-side API example](/examples/server-side) runs this against a simulated API with a live
network log.

## What manual mode changes

- `data` is the current page. The table shows it as it is, without searching, filtering, sorting,
  or slicing it again.
- `row-count` is the total across all pages. The pagination, the page count, and the
  "26–50 of 10,000 rows" status come from it.
- Search, filters, and sorting still return to page 1, and a new page size still keeps the first
  visible row in view, so the `v-model` values you send are the ones a user expects.
- Selecting "all" selects the rows on the page, the only rows the browser has. Selection holds row
  keys, so a selected row stays selected when its page comes back.

## Sending the state

The state is plain data, so a request is a direct mapping. A query string is a common shape:

```ts
function toQuery(state: {
  page: number;
  pageSize: number;
  sorting: readonly SortRule[];
  search: string;
  filters: Readonly<Record<string, unknown>>;
}): URLSearchParams {
  const query = new URLSearchParams({ page: String(state.page), size: String(state.pageSize) });
  if (state.sorting.length > 0) {
    query.set(
      "sort",
      state.sorting.map((rule) => (rule.direction === "desc" ? "-" : "") + rule.column).join(","),
    );
  }
  if (state.search) {
    query.set("q", state.search);
  }
  for (const [column, value] of Object.entries(state.filters)) {
    query.set(column, Array.isArray(value) ? value.join(",") : String(value));
  }
  return query;
}
```

## Running the same pipeline on the server

The pipeline stages are pure functions exported from `@vueye-table/core`, which has no framework
and no Node.js dependency. A Node, Nitro, or NestJS handler can run the exact search, filter, and
sort rules the browser would:

```ts
import { createTable } from "@vueye-table/core";

export function queryIssues(all: readonly Issue[], state: TableStatePatch) {
  const table = createTable({ data: all, columns, initialState: state });
  const snapshot = table.getSnapshot();
  return { rows: snapshot.rows.map((row) => row.original), total: snapshot.rowCount };
}
```

For a database, translate the state into the query instead: `sorting` into `ORDER BY`, `filters`
into `WHERE`, and `pagination` into `LIMIT` and `OFFSET`. With Drizzle:

```ts
import { and, asc, desc, ilike, inArray, sql } from "drizzle-orm";

const where = and(
  state.search ? ilike(issues.title, `%${state.search}%`) : undefined,
  Array.isArray(state.filters.state) ? inArray(issues.state, state.filters.state) : undefined,
);
const orderBy = state.sorting.map((rule) =>
  rule.direction === "desc" ? desc(issues[rule.column]) : asc(issues[rule.column]),
);
const rows = await db
  .select()
  .from(issues)
  .where(where)
  .orderBy(...orderBy)
  .limit(state.pagination.pageSize)
  .offset((state.pagination.page - 1) * state.pagination.pageSize);
const [{ count }] = await db
  .select({ count: sql<number>`count(*)` })
  .from(issues)
  .where(where);
```

Check column names against an allow-list before they reach a query; the state comes from the
client.

## Loading states

`loading` draws a progress bar along the top of the table and sets `aria-busy`. While the first
page is loading there are no rows, and the table shows `loading-text` (or the `loading` slot)
instead of the empty state:

```vue
<VueyeTable manual :loading="loading" loading-text="Fetching issues…" … />
```

Keep the previous page in `data` while the next one loads, as the example above does, so the
table does not flash empty between pages.
