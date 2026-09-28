# @vueye-table/vue

Vue composables for the vueye-table engine. `useDataTable` binds a table to the current effect
scope and exposes its snapshot as plain reactive properties beside named operations;
`useDataGrid` adds spreadsheet selection, keyboard navigation, and in-cell editing.

```bash
pnpm add @vueye-table/vue vue
```

```ts
import { useDataTable } from "@vueye-table/vue";

const table = useDataTable({ data: () => props.users, columns });
table.rows; // the current page, reactive
table.nextPage();
```

See the [repository README](https://github.com/boussadjra/vueye-table#readme) for every layer.
