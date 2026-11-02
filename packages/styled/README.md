# @vueye-table/styled

Themed Vue components for vueye-table (`VtTable`, `VtGrid`, `VtToolbar`, `VtSearch`,
`VtPagination`, `VtPageSize`, `VtColumnVisibility`, `VtStatus`, `VtEmpty`) and a stylesheet
driven by CSS custom properties, with dark mode and three densities.

`VtGroupRow` supplies nested group rows and aggregate headers/footers; `VtGroupBy` adds and orders
grouping columns. Default bodies measure top/bottom pin bands, and row actions move pins between
regions. Resize handles, sticky columns and opaque pinned intersections share inherited theme tokens.

`VtTable` and `VtGrid` accept opt-in `virtual`, `height`, `rowHeight`, `overscan` and
`virtualColumns`. Grids also accept `columnWidth`. Headers and body share widths and slices;
the supplied binding retains its pagination choice. See
[virtualization](https://github.com/boussadjra/vueye-table/blob/main/docs/guide/virtualization.md)
and [grouping](https://github.com/boussadjra/vueye-table/blob/main/docs/guide/grouping.md).

```bash
pnpm add @vueye-table/styled vue
```

```ts
import "@vueye-table/styled/style.css";
```

See the [repository README](https://github.com/boussadjra/vueye-table#readme) for every layer.
