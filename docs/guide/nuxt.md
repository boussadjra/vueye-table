# Nuxt

```bash
pnpm add @vueye-table/nuxt
```

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
