---
aside: false
---

<script setup lang="ts">
import ColumnPinning from "../.vitepress/theme/components/ColumnPinning.vue";
</script>

# Column pinning

Keep identifiers and totals visible while the middle columns scroll. Try pinning Customer beside
Order, widening Order, or hiding it: the remaining pins move into place without gaps. Switch to
right-to-left to see the same logical `start` and `end` state follow the reading direction.

<ColumnPinning />

## One display order

The engine returns start-pinned columns, centre columns, and end-pinned columns in one
`table.columns` list. The example renders that list once, so native table order and accessible
column indices match clipboard ranges and grid coordinates.

```ts
const table = useDataTable({
  data: orders,
  columns: [
    { id: "id", width: 108, pinned: "start" },
    { id: "customer.name", width: 208 },
    { id: "total", width: 112, pinned: "end" },
  ],
});
table.pinColumn("customer.name", "start");
table.resizeColumn("id", 160); // Customer's pinOffset now follows the new width.
table.pinColumn("customer.name", false);
```

## Render the layout data

This example supplies its own sticky cells and fixed table layout. It uses `pinOffset` with
`inset-inline-start` or `inset-inline-end`, so no separate RTL offset calculation is needed.
`isPinnedEdge` identifies the boundary next to the scrolling centre. Hidden pins stay in state
but contribute no width or edge marker.

Built-in pinned component props, controls, and horizontal virtualization of just the centre are
follow-up work. See [the column guide](/guide/columns#pinning-columns) and
[ADR 0024](/adr/0024-column-sizing-and-pinning) for the core contract.

## Source

<<< ../.vitepress/theme/components/ColumnPinning.vue
