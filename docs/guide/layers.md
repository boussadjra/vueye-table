# Layers

vueye-table is built around one idea: a table is data plus state plus operations, and rendering is
a separate concern. Each package depends only on the layers beneath it.

| Layer               | Package                 | Use it when                                                |
| ------------------- | ----------------------- | ---------------------------------------------------------- |
| Full UI             | `vueye-table`           | You want a complete table or spreadsheet in one tag.       |
| Styled components   | `@vueye-table/styled`   | You want the look, arranged your own way.                  |
| Headless components | `@vueye-table/headless` | You want accessible behavior with your own markup and CSS. |
| Vue composables     | `@vueye-table/vue`      | You want reactive state and nothing rendered.              |
| Engine              | `@vueye-table/core`     | You are outside Vue, on a server, or writing a binding.    |
| Nuxt module         | `@vueye-table/nuxt`     | You use Nuxt 4.                                            |

## Headless

```vue
<script setup lang="ts">
import { DataTableRoot, DataTablePagination, DataTableSearch, useDataTable } from "vueye-table";

const table = useDataTable({ data: users, columns });
</script>

<template>
  <DataTableRoot :table="table" as="div">
    <DataTableSearch />
    <article v-for="row in table.rows" :key="row.key">{{ row.getDisplay("name.first") }}</article>
    <DataTablePagination />
  </DataTableRoot>
</template>
```

Headless components render semantic, accessible markup (`aria-sort`, `aria-selected`,
`aria-rowindex`, a polite live status, grid keyboard navigation) with `data-*` state attributes
and no styles. Every one accepts `as` and exposes its state through slot props.

## Engine

```ts
import { createTable } from "@vueye-table/core";

const table = createTable({ data: users, columns: [{ id: "age" }, { id: "city" }] });
table.search("lon");
table.toggleSort("age");
table.getSnapshot().rows; // the current page
table.exportRows(); // CSV of every filtered row
```

The state is plain serializable data, so it can be saved, restored, sent to a server, or kept in
the URL. The reasoning behind the split is in [ADR 0001](/adr/0001-layered-packages).
