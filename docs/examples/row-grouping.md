---
aside: false
---

<script setup lang="ts">
import RowGrouping from "../.vitepress/theme/components/RowGrouping.vue";
import GroupedRows from "../.vitepress/theme/components/GroupedRows.vue";
</script>

# Project budgets by region and team

The full components render nested group headers, aligned aggregates and sticky reference rows.
Switch between table/grid and virtual/native scrolling, move aggregates to footers, and append a
sample batch. Group by chooses the outer-to-inner order. Row actions in Table mode move records
between top, centre and bottom regions. Enable editing to change a leaf budget or actual cost.

<GroupedRows />

## Composing a custom renderer

Illustrative project budgets demonstrate nested grouping, filtered subtotals, group selection,
editing and incremental ingestion. Collapse a region, edit an actual cost, or add a project:
the group model keeps the totals and leaf identities together.

<RowGrouping />

The example uses `useDataTable` and a custom table body over `renderItems`. Group records supply
the labels, selection coverage and aggregate cells. Leaf rows use their ordinary row keys for
editing. The percentage subtotal divides summed variance by summed budget; it does not average
row percentages. The full component example above supplies the same group model through built-in renderers.

See [grouping and aggregation](/guide/grouping) for the API and migration notes, and
[the source](https://github.com/boussadjra/vueye-table/blob/main/docs/.vitepress/theme/components/RowGrouping.vue).

## Full component source

<<< ../.vitepress/theme/components/GroupedRows.vue
