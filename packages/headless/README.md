# @vueye-table/headless

Unstyled, accessible Vue components for vueye-table: `DataTableRoot`, header, body, row, and cell
components, sort buttons, selection checkboxes, search, pagination, page size, column visibility,
a live status region, and a keyboard-driven spreadsheet grid (`DataGridRoot`, `DataGridCell`).
State is exposed through slot props and `data-*` attributes. Primitives with `as` let you choose
their element; structural group/pinned-row composition retains native table rows.

`DataTableGroupRow` and `DataTableAggregateCell` render groups and aggregate headers/footers.
`DataTablePinnedRow` provides measured sticky-region context, `DataTableColumnResizer` supplies
pointer/keyboard resizing, and `DataTableLeadingCell` aligns utility columns. Typed editors,
row actions, tree cells and deferred details compose with the same table/grid providers.

For opt-in virtualization, place `DataTableRoot`/`DataGridRoot` inside `DataTableViewport` and pass
`virtual` on the root or body. Both table and grid bodies support virtual columns and retain
pinned columns. Use `DataTableVirtualColumns` and `injectVirtualRenderer` for custom headers.
See [virtualization](https://github.com/boussadjra/vueye-table/blob/main/docs/guide/virtualization.md)
and [components](https://github.com/boussadjra/vueye-table/blob/main/docs/guide/components.md).

```bash
pnpm add @vueye-table/headless vue
```

See the [repository README](https://github.com/boussadjra/vueye-table#readme) for every layer.
