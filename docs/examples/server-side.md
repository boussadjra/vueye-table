---
aside: false
---

<script setup lang="ts">
import IssueTracker from "../.vitepress/theme/examples/server-side/IssueTracker.vue";
</script>

# Server-side API

An issue tracker with 10,000 issues that live on a server. The browser only ever holds the page on
screen: `<VueyeTable manual>` sends its state out through `v-model`, a small composable turns that
state into a request, and the table shows whatever comes back. Page, sort, search, and filter by
state or label, and watch the requests in the network panel; switch on **Fail next request** to see
the error path.

<IssueTracker />

## How it works

### The table presents; the server decides

With `manual`, the table does no searching, filtering, sorting, or paging of its own. `data` is the
current page exactly as the server sent it, and `rowCount` is the number of matching rows across
every page, which is what the pagination and the status line count from. `loading` draws the
progress bar and dims the rows while the next page is on its way.

```vue
<VueyeTable
  v-model:page="page"
  v-model:page-size="pageSize"
  v-model:sorting="sorting"
  v-model:search="search"
  v-model:filters="filters"
  :data="rows"
  :columns="columns"
  row-key="number"
  manual
  :row-count="total"
  :loading="loading"
  loading-text="Fetching issues from /api/issues…"
/>
```

Sort headers, the search box, and the pagination work as usual. They change the table's state, and
the state reaches you through `v-model` instead of reshaping local rows.

### State in, query out

The table's state is plain data, so turning it into a request is a mapping. Sort rules become
`sort=-updated`, and filters become query parameters. Search, sort, and filter operations return
to page 1 on their own, so a new search never asks the server for page 40 of a shorter list.

```ts
function currentQuery(): IssueQuery {
  return {
    page: page.value,
    size: pageSize.value,
    sort: sorting.value.map((rule) => (rule.direction === "desc" ? "-" : "") + rule.column),
    q: search.value.trim(),
    state: filters.value["state"] as IssueState | undefined,
    labels: (filters.value["labels"] as readonly string[] | undefined) ?? [],
  };
}
```

The server applies the same steps the table would: filter, count, sort, then cut out one page. It
also clamps a page past the end and says which page it served, and the composable follows it.

### One request at a time

One watcher covers every piece of state. A change sends a request at once, except a change of
search text, which waits for a 300 ms pause. A newer request aborts the one still in flight, so a
slow answer to an old question can never overwrite a newer one; those show as `aborted` in the
network panel.

```ts
watch([page, pageSize, sorting, search, filters], () => {
  if (search.value !== sentSearch) {
    clearTimeout(timer);
    timer = setTimeout(load, 300);
    return;
  }
  load();
});

async function load() {
  controller?.abort();
  const own = (controller = new AbortController());
  loading.value = true;
  try {
    const result = await fetchPage(currentQuery(), { signal: own.signal });
    rows.value = result.rows;
    total.value = result.total;
  } catch (reason) {
    if (!isAbort(reason)) error.value = String(reason);
  } finally {
    if (controller === own) loading.value = false;
  }
}
```

The first request starts in `onMounted`, so the server-rendered page shows the loading state and
never fetches while rendering.

### Filters from outside the table

The state and label controls are not part of the table, but they go through the table's own
`filter` operation, reached through a template ref. That keeps filters on the same path as search
and sort: the filter changes, the page returns to 1, and both arrive through `v-model` together.

```ts
const view = useTemplateRef<{ readonly table: AnyDataTableBinding }>("view");

function setFilter(column: "state" | "labels", value: unknown): void {
  view.value?.table.filter(column, value);
}
```

A filter belongs to a column, so `labels` is defined as a column with `hidden: true`; the labels
already show inside the issue cell.

### Loading, stale pages, and errors

Rows are replaced only when an answer arrives, so the previous page stays on screen, dimmed, while
the next one loads. On the first load there is nothing to keep, and `loading-text` fills the empty
body instead. A failed request leaves the last good page in place and shows a banner with
**Retry**. When nothing has loaded yet, the `#empty` slot shows the error and the same button.

```vue
<template #empty>
  <div v-if="error">
    Could not load issues.
    <button type="button" @click="retry">Retry</button>
  </div>
  <div v-else>No issues match.</div>
</template>
```

The API here is a deterministic in-memory list built from a seeded generator, with a latency
derived from the query, so the same request always takes the same time. Swap `fetchPage` for a
real `fetch` that forwards the `AbortSignal` and nothing else changes.

## Related

- [Server-side data](/guide/server-data): `manual`, `rowCount`, and when to page on the server.
- [State and v-model](/guide/state): the state shape and which operations return to page 1.
- [Columns](/guide/columns): hidden columns, `format`, and cell slots.
- [Component reference](/guide/components): every prop, slot, and event of `<VueyeTable>`.
- [Theming](/guide/theming): the custom properties behind the styled table.
