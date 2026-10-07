# Row expansion

Use expansion to show extra content beneath a data row. [Try the orders example](/examples/row-expansion).

```ts
const table = useDataTable({
  data: orders,
  columns: [{ id: "customer" }],
  getRowCanExpand: (order) => order.lines.length > 0,
  initialState: { expanded: ["order-1"] },
});
table.toggleExpanded("order-1");
table.expandAll();
table.collapseAll();
```

Rows expose `canExpand` and `isExpanded`. Render `table.renderItems` for data and details: each item has `kind` (`row` or `detail`), a stable `key`, its parent `row`, and the parent's `rowIndex` in `table.rows`. Use `item.key` for Vue keys and virtual measurements. Create separate HTML ids for accessible disclosure buttons.

Details do not change `rows`, `rowCount`, pagination or grid positions. Sorting, searching, exports and edits operate on data rows. The current styled table does not render details; use your own renderer as shown in the example. Component integration is tracked separately.

## State and operations

`state.expanded` is a readonly key array or `true`. The default is `[]`. `true` expands every eligible row, including new data. Closing one row in this mode converts the state into the remaining known eligible keys. Unknown, filtered or removed keys remain saved and reopen when their rows return.

`toggleExpanded(key, expanded?)` toggles one eligible row or sets its explicit state. Missing and ineligible rows are no-ops. `expandAll()` and `collapseAll()` update expansion in one operation. Controlled state and `onStateChange` work as with other state fields. `setState` does not call `onStateChange`; `reset` restores initial expansion.

`expandMode: 'single'` allows one open key. Opening another row replaces the previous key in one notification. State arrays use their last key; `true` and `expandAll()` choose the first eligible processed row. `expandMode` and `getRowCanExpand` are read when creating the table.

Invalid runtime state falls back to `[]` and appears in `table.issues` as `invalid_expanded`; duplicates are removed. A full `TableState` literal now requires `expanded`. You can store expansion in your own URL adapter; no query parameter is written automatically.

See [ADR 0007](/adr/0007-expansion-and-trees) for the shared render-item contract. Tree rows are planned in #81.
