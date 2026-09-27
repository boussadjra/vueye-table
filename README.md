# vueye-table

A Vue framework for data, data tables, and spreadsheets.

vueye-table began as a single table component. Version 3 is a rewrite around one idea: a table is
data plus state plus operations, and rendering is a separate concern. A framework-independent
engine owns searching, filtering, sorting, pagination, selection, column visibility, editing,
undo, clipboard, and export. Vue layers sit on top of it, and you pick the one that fits:

| Layer               | Package                 | Use it when                                                |
| ------------------- | ----------------------- | ---------------------------------------------------------- |
| Full UI             | `vueye-table`           | You want a complete table or spreadsheet in one tag.       |
| Styled components   | `@vueye-table/styled`   | You want the look, arranged your own way.                  |
| Headless components | `@vueye-table/headless` | You want accessible behavior with your own markup and CSS. |
| Vue composables     | `@vueye-table/vue`      | You want reactive state and nothing rendered.              |
| Engine              | `@vueye-table/core`     | You are outside Vue, on a server, or writing a binding.    |
| Nuxt module         | `@vueye-table/nuxt`     | You use Nuxt 4.                                            |

Each layer depends only on the layers beneath it, and `vueye-table` re-exports all of them, so
one install covers every level.

> **Status:** `3.0.0-alpha`. The API is provisional and may change between alpha releases. The
> 2.x component lives on the [`legacy`](https://github.com/boussadjra/vueye-table/tree/legacy)
> branch; see [Upgrading from 2.x](./docs/guide/upgrading-from-2.md).

## Install

```bash
pnpm add vueye-table
```

Vue 3.5 or newer is a peer dependency.

## Full table

```vue
<script setup lang="ts">
import "vueye-table/style.css";
import { ref } from "vue";
import { VueyeTable, defineColumns, type RowKey } from "vueye-table";

interface User {
  id: number;
  name: { first: string; last: string };
  age: number;
  city: string;
}

const users: User[] = [
  { id: 1, name: { first: "Ada", last: "Lovelace" }, age: 36, city: "London" },
  { id: 2, name: { first: "Alan", last: "Turing" }, age: 41, city: "Wilmslow" },
];

const columns = defineColumns<User>([
  { id: "name.first", header: "First name" },
  { id: "name.last", header: "Last name" },
  { id: "age", align: "end", format: (age) => `${age} years` },
  { id: "city" },
]);

const selected = ref<readonly RowKey[]>([]);
</script>

<template>
  <VueyeTable v-model:selected="selected" :data="users" :columns="columns" selectable striped>
    <template #cell.city="{ value }">
      <strong>{{ value }}</strong>
    </template>
  </VueyeTable>
</template>
```

Column ids are typed paths into your rows, so `format` above receives a `number`. Without
`columns`, columns are inferred from the data.

Every piece of state has a `v-model`: `page`, `pageSize`, `sorting`, `search`, `filters`,
`hiddenColumns`, and `selected`. Add `manual` and `row-count` to let a server search, sort, and
page, with the table presenting whatever page it returns.

## Spreadsheet

```vue
<VueyeGrid v-model:data="lines" :columns="columns" column-letters />
```

Cells edit in place. Arrows, Tab, Home, and End move; Shift extends the range; Enter or typing
starts an edit; Delete clears; and copy, cut, paste, undo, and redo behave like a spreadsheet
application. Each edit emits a new array; the one you passed in is never mutated. Text is parsed
by the column's type, and a value that cannot be read is refused and reported through
`edit-error`.

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
the URL.

## Nuxt

```ts
export default defineNuxtConfig({
  modules: ["@vueye-table/nuxt"],
});
```

The module auto-imports `<VueyeTable>`, `<VueyeGrid>`, `useDataTable`, `useDataGrid`, and
`defineColumns`, and adds the stylesheet. Set `vueyeTable: { layers: true }` to also register the
headless and styled components.

## Theming

The styled layer is driven by CSS custom properties on `.vt-surface`:

```css
.vt-surface {
  --vt-accent: #0f766e;
  --vt-radius: 4px;
  --vt-font-size: 0.8125rem;
}
```

Dark colors follow `prefers-color-scheme`; `theme="dark"` or `theme="light"` forces one.
Density is `compact`, `comfortable`, or `spacious`.

## Development

```bash
pnpm install
pnpm playground      # every layer, side by side
pnpm docs            # the documentation site
pnpm test            # every Vitest project
pnpm check           # format, lint, types, tests with coverage, build, boundaries, packages
```

Architecture lives in [ARCHITECTURE.md](./ARCHITECTURE.md) and decisions in
[docs/adr](./docs/adr).

## License

[MIT](./LICENSE)
