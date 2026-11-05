# Nuxt

With `layers: true`, editor primitives `DataCellEditor`, `DataTableEditRoot`,
`DataTableEditCell`, `DataTableRowActions`, `VtCellEditor` and `VtRowActions` are also registered.
Full-component `edit-mode` and `editor.<id>` slots work with the default component registration;
see [editing](/guide/editing).

<!-- current-release:start -->

```bash
pnpm add @vueye-table/nuxt@3.0.0-beta.9
```

<!-- current-release:end -->

This is a prerelease for application feedback. Keep directly installed vueye-table packages on
the same version. See the [beta contract](/guide/beta) for API guarantees and acceptance limits.

```ts
export default defineNuxtConfig({
  modules: ["@vueye-table/nuxt"],
});
```

The module auto-imports `<VueyeTable>`, `<VueyeGrid>`, `useDataTable`, `useDataGrid`, and
`defineColumns`, and adds the stylesheet. Every table is created inside a component, so no state
is shared between requests.

| Option        | Default | Effect                                                                                |
| ------------- | ------- | ------------------------------------------------------------------------------------- |
| `css`         | `true`  | Add the styled theme to every page.                                                   |
| `components`  | `true`  | Register `<VueyeTable>` and `<VueyeGrid>`.                                            |
| `layers`      | `false` | Also register the headless (`DataTable*`, `DataGrid*`) and styled (`Vt*`) components. |
| `composables` | `true`  | Auto-import `useDataTable`, `useDataGrid`, and `defineColumns`.                       |

Options go under `vueyeTable` in `nuxt.config`.

With `layers: true`, `DataTableLoadMore` and `VtLoadMore` are registered alongside the status controls. Sources start after client mount, so a server-rendered table can use initial rows without opening its async source. See [Vue sources and cursor loading](/guide/streaming#manage-a-source-in-vue).

The same option registers `DataTableExpandToggle`, `DataTableDetailRow`, `DataTableTreeCell` and
their styled equivalents `VtExpandToggle`, `VtDetailRow`, `VtTreeCell`. Expansion IDs use Vue's
SSR-stable instance IDs; provide the same initial rows and expanded state on server and client.
See [row expansion](/guide/expansion) and [tree data](/guide/trees).

Full tables and grids also support resizing, column/row pinning, grouping and aggregate slots.
The module's current `layers` registration list does not include the newer standalone layout and
grouping primitives. When composing those directly, import them in `<script setup>` from
`vueye-table` (for example `DataTableColumnResizer`, `DataTableLeadingCell`, `DataTableGroupRow`,
`DataTableAggregateCell`, `DataTablePinnedRow`, `VtGroupRow`, `VtGroupBy`). Full-component
`resizable-columns`, `groupable`, pinning models and `group` / `aggregate.<id>` slots work with
the default registration. See [components](/guide/components).
