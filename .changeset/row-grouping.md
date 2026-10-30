---
"@vueye-table/core": minor
"@vueye-table/vue": minor
"@vueye-table/headless": patch
---

Add nested row grouping and filtered-leaf aggregation to flat client tables. Group state,
expansion, selection, pagination, editing, streaming and grouped export share one memoized
model. Columns support bucketing, numeric and custom aggregates, and subtotal formatting.
Invalid input and callback failures recover with TableIssues.

Complete TableState literals must add `grouping: []` and `expandedGroups: true`. The
TableRenderItem union gains `kind: "group"`; renderers must narrow the kind before reading
`row` or `rowIndex`. Partial state patches remain compatible. Manual tables forward state
without aggregating server pages; trees ignore grouping with an issue. Built-in group rows
and controls remain follow-up work; the runnable example uses a custom body.
