# @vueye-table/nuxt

The Nuxt 4 module for vueye-table. It auto-imports `<VueyeTable>`, `<VueyeGrid>`,
`useDataTable`, `useDataGrid`, and `defineColumns`, and adds the stylesheet.

```bash
pnpm add @vueye-table/nuxt vueye-table
```

```ts
export default defineNuxtConfig({
  modules: ["@vueye-table/nuxt"],
  vueyeTable: {
    css: true, // add vueye-table/style.css
    components: true, // VueyeTable and VueyeGrid
    layers: false, // also the headless and styled components
    composables: true,
  },
});
```

See the [repository README](https://github.com/boussadjra/vueye-table#readme) for every layer.
