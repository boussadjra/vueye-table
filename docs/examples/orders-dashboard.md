---
aside: false
---

<script setup lang="ts">
import OrdersDashboard from "../.vitepress/theme/examples/orders-dashboard/OrdersDashboard.vue";
</script>

# Orders dashboard

An admin screen for a small shop's last 90 days: 240 orders, their customers, and where each one
stands. It is one `<VueyeTable>` with custom cells and `v-model` state, surrounded by ordinary Vue:
summary tiles that follow the filters, status chips and a date range that write column filters,
bulk actions over the selection, inline line items and a detail drawer. Open the disclosure
beside an order to expand its items; click the order link or row to open the drawer. These are
generated sample orders.

<DemoFrame title="OrdersDashboard.vue">
  <OrdersDashboard />
</DemoFrame>

## How it works

### Filters are state the page owns

The status chips and the date inputs never talk to the table directly. They write one `filters`
object, and `v-model:filters` hands it to the table. An array keeps rows whose value is one of its
items; `{ min, max }` keeps values inside an inclusive range, and `YYYY-MM-DD` strings compare as
days.

```ts
const filters = ref<Readonly<Record<string, unknown>>>({});

function setStatus(status: OrderStatus | "all"): void {
  filters.value = { ...filters.value, status: status === "all" ? undefined : [status] };
}

function setRange(bound: "min" | "max", value: string): void {
  const next = { ...range.value, [bound]: value || undefined };
  filters.value = { ...filters.value, date: next.min || next.max ? next : undefined };
}
```

```vue
<VueyeTable
  ref="tableRef"
  v-model:selected="selected"
  v-model:filters="filters"
  v-model:search="search"
  :data="orders"
  :columns="columns"
  row-key="id"
  selectable
  sticky-header
  max-height="30rem"
  :density="density"
  @row-click="openOrder"
/>
```

### Tiles read the rows the table kept

`<VueyeTable>` exposes its binding as `table`. `processedRows` is every row that passed the search
and filters, across all pages, so the tiles summarize what the table shows rather than the page
alone. Before the component mounts there is no ref yet; with no filters every order passes, so the
fallback matches the first render on the server and the client.

```ts
const tableRef = ref<{ readonly table: DataTableBinding<unknown> } | null>(null);

const visibleOrders = computed<readonly Order[]>(
  () =>
    (tableRef.value?.table.processedRows.map((row) => row.original) as Order[] | undefined) ??
    orders.value,
);
```

### Chip counts come from a second, headless table

A count next to "Paid" should say how many paid orders the current search and date range hold,
whichever chip is active. A `useDataTable` over the same data and columns, with every filter but
the status, answers that without rendering anything.

```ts
const counter = useDataTable<Order>({
  data: orders,
  columns,
  rowKey: "id",
  state: () => ({ search: search.value, filters: { ...filters.value, status: undefined } }),
});
```

### Cells are slots; text stays in the columns

Each column's `format` decides the text a cell searches, sorts beside, and exports. The
`cell.<id>` slots only decide how it looks: an avatar with the email under the name, a pill with a
status dot, a relative day above the date.

```ts
const columns = defineColumns<Order>([
  { id: "id", header: "Order" },
  { id: "customer", accessor: (order) => order.customer.name },
  { id: "status", format: statusLabel, searchable: false },
  { id: "date", format: shortDate, searchable: false },
  { id: "items", accessor: itemCount, align: "end", searchable: false },
  { id: "total", align: "end", format: (total) => money(total), searchable: false },
]);
```

```vue
<template #cell.status="{ item, display }">
  <span class="pill" :data-status="item.status"><i class="dot" />{{ display }}</span>
</template>
```

### Bulk actions replace the array

"Mark as shipped" maps the orders into a new array and assigns it; the table follows its `data`
and keeps its sorting, filters, and page. The CSV export runs in the click handler, the only place
a download can happen. With a selection it exports just those rows through a throwaway
`createTable`; otherwise it calls `exportRows()` on the visible table, which writes every filtered
row with each column's `format`.

```ts
orders.value = orders.value.map((order) =>
  ids.has(order.id) && shippable(order) ? { ...order, status: "shipped" } : order,
);

const csv = selected.value.length
  ? createTable<Order>({ data: selectedRows, columns, rowKey: "id" }).exportRows({
      columns: binding.columns.map((column) => column.id),
    })
  : binding.exportRows();
```

## Related guides

- [Columns](/guide/columns): `accessor`, `format`, alignment, and custom filters.
- [State](/guide/state): every `v-model` and the plain state object behind them.
- [Components](/guide/components): `<VueyeTable>` props, slots, and events.
- [Layers](/guide/layers): when a headless `useDataTable` beside the component is the right tool.
- [Theming](/guide/theming): the custom properties the styled table reads.
