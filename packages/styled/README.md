# @vueye-table/styled

`VtTable` and `VtGrid` accept opt-in `virtual`, `height`, `rowHeight` and `overscan`. A virtual grid also accepts `virtualColumns` and `columnWidth`; headers and body use the same widths and column slice. The supplied binding retains its pagination choice. See `docs/guide/virtualization.md` and the runnable 100k-record component example.

Themed Vue components for vueye-table (`VtTable`, `VtGrid`, `VtToolbar`, `VtSearch`,
`VtPagination`, `VtPageSize`, `VtColumnVisibility`, `VtStatus`, `VtEmpty`) and a stylesheet
driven by CSS custom properties, with dark mode and three densities.

```bash
pnpm add @vueye-table/styled vue
```

```ts
import "@vueye-table/styled/style.css";
```

See the [repository README](https://github.com/boussadjra/vueye-table#readme) for every layer.
