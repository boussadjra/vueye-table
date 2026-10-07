# @vueye-table/headless

For opt-in virtualization, place `DataTableRoot`/`DataGridRoot` inside `DataTableViewport` and pass `virtual` on the root or body. Native spacers preserve logical row indices; grids can also window columns. Use `DataTableVirtualColumns` and `injectVirtualRenderer` for custom headers. See [component virtualization](../../docs/guide/virtualization.md) and ADR 0013 in this repository.

Unstyled, accessible Vue components for vueye-table: `DataTableRoot`, header, body, row, and cell
components, sort buttons, selection checkboxes, search, pagination, page size, column visibility,
a live status region, and a keyboard-driven spreadsheet grid (`DataGridRoot`, `DataGridCell`).
State is exposed through slot props and `data-*` attributes, and every component accepts `as`.

```bash
pnpm add @vueye-table/headless vue
```

See the [repository README](https://github.com/boussadjra/vueye-table#readme) for every layer.
