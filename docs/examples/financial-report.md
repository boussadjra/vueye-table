---
aside: false
---

<script setup lang="ts">
import FinancialReport from "../.vitepress/theme/examples/financial-report/FinancialReport.vue";
</script>

# Financial report

A finance team reviews operating expenses each quarter: 60 cost lines across three regions and five
departments, budget against actual, with subtotals per group and a grand total. The engine has no
grouping of its own, so this page composes it: `useDataTable` does search, filters, sorting, and
column visibility, and the page groups the rows it hands back and draws them with the styled
theme's `VtTable` and `VtHeader`.

<DemoFrame title="FinancialReport.vue">
  <FinancialReport />
</DemoFrame>

## How it works

### One table, one page

The table is an ordinary `useDataTable`. Its page size is larger than the data, so pagination
never splits a group, and `processedRows` holds every line that passed the search and filters, in
sorted order. The toolbar sits outside the table element, so the component provides the table
itself for `VtSearch` to find.

```ts
const table = useDataTable<CostLine>({
  data: makeCostLines(),
  columns, // a computed, see below
  rowKey: "id",
  initialState: { pagination: { page: 1, pageSize: 500 } },
});
provideDataTable(table);
```

### Grouping over `processedRows`

Grouping is a plain function over the engine's output. It buckets rows in the order they arrive,
so every group keeps the table's sort inside it, and then orders the groups themselves: by name when
the grouped column is sorted, by subtotal when a summed column is, and in their natural order
otherwise.

```ts
const groups = computed(() =>
  groupBy.value === "none"
    ? []
    : groupRows(table.processedRows, groupBy.value, table.state.sorting),
);
const grand = computed(() => totalsOf(table.processedRows));
```

Because `processedRows` is a reactive accessor, typing in the search box, toggling a region chip,
or picking "Over budget" regroups the rows, recomputes every subtotal, and redraws the chart strip
above the table in one pass.

### Aggregates through the columns

Totals read values with `row.getValue(id)`, the same accessor the cells use, so the computed
`fy` and `variance` columns sum as easily as the stored quarters. Variance % is not summed: a
subtotal's percentage is its summed variance over its summed budget, which is what a reviewer
expects and what averaging the line percentages would get wrong.

```ts
export function totalsOf(rows: readonly TableRow<CostLine>[]): Totals {
  const sums = Object.fromEntries(MEASURES.map((id) => [id, 0])) as Record<Measure, number>;
  for (const row of rows) {
    for (const id of MEASURES) {
      sums[id] += Number(row.getValue(id) ?? 0);
    }
  }
  return {
    ...sums,
    variancePct: sums.budget === 0 ? 0 : sums.variance / sums.budget,
    count: rows.length,
  };
}
```

### Rendering with the styled theme

`VtTable` takes a default slot, and with `VtHeader` inside it the header keeps its sort buttons,
`aria-sort`, and sticky position. The body is the page's own: one `tbody` per group, so each
group's header cell can use `scope="rowgroup"`, and a `tfoot` for the grand total. Subtotal cells
follow `table.columns`, so hiding the budget columns removes their totals too.

```vue
<VtTable :table="table" density="compact" sticky-header>
  <VtHeader />
  <tbody v-for="group in groups" :key="group.key" class="vt-body">
    <tr class="group">
      <SummaryCells :columns="table.columns" :span="labelSpan" :totals="group.totals" … />
    </tr>
    <template v-if="!isCollapsed(group.key)">
      <CostLineRow v-for="row in group.rows" :key="row.key" :row="row" :columns="table.columns" … />
    </template>
  </tbody>
  <tfoot>…grand total…</tfoot>
</VtTable>
```

### Units, visibility, and filters are table state

The units switch rebuilds the column definitions; the table picks up the new `format` functions and
keeps its sorting, filters, and hidden columns. "Show budget columns" is `toggleColumn`, and so is
hiding the grouped column, whose value already sits in each group's header. The
region chips and budget status are column filters: an array on `region` is the default one-of
match, and `variance` brings its own `filter` function.

```ts
const columns = computed(() => {
  const format = (value: number) => money(value, unit.value);
  return defineColumns<CostLine>([
    { id: "q1", header: "Q1", align: "end", searchable: false, format },
    // …
    {
      id: "variance",
      accessor: (line) => line.budget - fullYear(line),
      filter: (value: number, wanted) =>
        wanted === "over" ? value < 0 : wanted === "under" ? value >= 0 : true,
    },
  ]);
});

table.filter("region", ["EMEA", "APAC"]);
table.filter("variance", "over");
```

### Why grouping is left to composition

Grouping decisions differ from report to report: which fields nest, how groups are ordered, which
columns sum and which are ratios, whether a subtotal counts hidden rows, where collapsed state
lives. Built into the engine, each would need an option. Composed over `processedRows`, they are
about 60 lines of plain TypeScript that you can read and change, while search, filters, sorting,
and visibility stay in the engine and its state stays plain, serializable data.

## Related

- [Columns](/guide/columns): accessors, `format`, `filter`, and computed columns.
- [State](/guide/state): filters, hidden columns, and sorting as plain data.
- [Components](/guide/components): `VtTable`, `VtHeader`, and their slots.
- [Layers](/guide/layers): when to drop from `VueyeTable` to the composable and styled parts.
- [Theming](/guide/theming): the `--vt-*` custom properties this page builds on.
