# @vueye-table/vue

Vue composables for the vueye-table engine. `useDataTable` binds a table to the current effect
scope and exposes its snapshot as plain reactive properties beside named operations;
`useDataGrid` adds spreadsheet selection, keyboard navigation, and in-cell editing.

Bindings forward column sizing/pinning, grouping and row pinning operations and snapshots.
Use `gridRows` for grid data-cell coordinates across top/centre/bottom regions; `renderItems`
includes structural group/detail items. `useVirtualRows` / `useVirtualColumns` measure and anchor
keyed layouts, and source/cursor bindings manage cancellation and reactive query changes. See
[state](https://github.com/boussadjra/vueye-table/blob/main/docs/guide/state.md) and
[virtualization](https://github.com/boussadjra/vueye-table/blob/main/docs/guide/virtualization.md).

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
