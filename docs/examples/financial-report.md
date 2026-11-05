---
aside: false
---

<script setup lang="ts">
import FinancialReport from "../.vitepress/theme/examples/financial-report/FinancialReport.vue";
</script>

# Financial report

Review a fictional company's FY2026 operating expenses: 60 cost lines across three regions and
five departments, budget against actual, with native group subtotals and a pinned all-line total.
Group by Region or Department, collapse a header, filter the lines and change the display units.
Choose None for an ordinary flat table.

<DemoFrame title="FinancialReport.vue">
  <FinancialReport />
</DemoFrame>

## Grouping belongs to the engine

The report uses `useDataTable` with `initialState.grouping: ['region']` and `paginate: false`.
`VtBody` renders the keyed group/data sequence. Its `group` slot customizes the label content
while retaining the native disclosure button, hierarchy level, expansion state and accessible
row index. Changing the segmented control calls `groupBy`; expansion uses `toggleGroup`,
`expandAllGroups` and `collapseAllGroups`.

Group membership, subtotal values and expansion share the table's filter/sort/group pipeline.
The grouped column is hidden from leaf cells, because each group label already names its value.
Sorting applies through the engine's documented group/leaf ordering, rather than the previous
report-specific subtotal-ordering helper. See [grouping](/guide/grouping).

## Add amounts; derive percentages from totals

Quarterly amounts, full-year cost, budget and variance use `aggregate: 'sum'`.
Variance is budget minus actual. Variance percentage uses a custom aggregate:

```ts
aggregate: (_values, lines) => {
  const budget = lines.reduce((sum, line) => sum + line.budget, 0);
  const actual = lines.reduce((sum, line) => sum + line.q1 + line.q2 + line.q3 + line.q4, 0);
  return budget === 0 ? 0 : (budget - actual) / budget;
};
```

This is a ratio of totals, not an average of leaf percentages. `formatAggregate` applies the
same unit formatting as the data cells. Slots `aggregate.variance` and `aggregate.variancePct`
retain the report's positive/negative treatment without interpreting values as HTML.

::: details Column definitions and reference data
<<< ../.vitepress/theme/examples/financial-report/report.ts
:::

## Keep total scopes explicit

The summary cards and quarterly chart use `processedRows`: filtered centre leaves, including
leaves in collapsed groups. Their count is a count of cost lines, not the engine's grouped
pagination units. Collapse changes presentation without changing these filtered totals.

The pinned **All-line total** is a fixed reference for all 60 source cost lines. The example
adds one immutable summary record and pins its stable key with `rowPinning.bottom`.
The engine excludes it from centre grouping, aggregates and pagination, so its amounts are
never counted twice. It stays visible when filters match no centre rows. Its label and the
footnote distinguish it from the filtered cards and group subtotals.

The custom row slot uses `DataTableRow` and `DataTableCell`, including the spanning summary
label, so measured pin insets and accessible indices still come from the shared components.
See [row pinning](/guide/row-pinning) for filter visibility and manual-page rules.

## Compose it yourself

A report with application-specific group ordering or cross-table sections can still build
buckets over ungrouped `processedRows`:

```ts
const buckets = new Map<string, (typeof table.processedRows)[number][]>();
for (const row of table.processedRows) {
  const key = String(row.getValue("region"));
  const bucket = buckets.get(key) ?? [];
  bucket.push(row);
  buckets.set(key, bucket);
}
```

Keep native grouping disabled for that composition and own the structural markup, keyboard
controls, counts and aggregation policy. The built-in model is preferable when grouping must
participate in selection, expansion, pagination, editing or streaming.

::: details Runnable report source
<<< ../.vitepress/theme/examples/financial-report/FinancialReport.vue
:::
