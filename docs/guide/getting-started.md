# Getting started

## Install

```bash
pnpm add vueye-table
```

Vue 3.5 or newer is a peer dependency. `vueye-table` re-exports every layer, so one install covers
the engine, the composables, and the headless and styled components.

## A full table

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

## A spreadsheet

```vue
<VueyeGrid v-model:data="lines" :columns="columns" column-letters />
```

Cells edit in place. Each edit emits a new array; the one you passed in is never mutated. Text is
parsed by the column's type, and a value that cannot be read is refused and reported through
`edit-error`. Try it on the [spreadsheet example](/examples/grid).

## Registering globally

```ts
import "vueye-table/style.css";
import { createApp } from "vue";
import { VueyeTablePlugin } from "vueye-table";

createApp(App).use(VueyeTablePlugin).mount("#app");
```

## Theming

The styled layer is driven by CSS custom properties on `.vt-surface`:

```css
.vt-surface {
  --vt-accent: #0f766e;
  --vt-radius: 4px;
  --vt-font-size: 0.8125rem;
}
```

Dark colors follow `prefers-color-scheme`; `theme="dark"` or `theme="light"` forces one. Density
is `compact`, `comfortable`, or `spacious`.

## Next steps

- [Columns](/guide/columns): paths, computed values, formatting, sorting, and filters.
- [State and v-model](/guide/state): control, save, and restore what users change.
- [Server-side data](/guide/server-data): let a server search, sort, and page.
- [Large datasets and virtualization](/guide/virtualization): disable pagination and calculate a rendered slice.
- [Editing and spreadsheets](/guide/editing): parsing, validation, the clipboard, and undo.
- [Theming](/guide/theming): custom properties, dark mode, and density.
- [Examples](/examples/): real screens built with every layer.
