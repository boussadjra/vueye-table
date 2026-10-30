---
aside: false
---

<script setup lang="ts">
import RowGrouping from "../.vitepress/theme/components/RowGrouping.vue";
</script>

# Project budgets by region and team

Illustrative project budgets demonstrate nested grouping, filtered subtotals, group selection,
editing and incremental ingestion. Collapse a region, edit an actual cost, or add a project:
the group model keeps the totals and leaf identities together.

<RowGrouping />

The example uses `useDataTable` and a custom table body over `renderItems`. Group records supply
the labels, selection coverage and aggregate cells. Leaf rows use their ordinary row keys for
editing. The percentage subtotal divides summed variance by summed budget; it does not average
row percentages. Built-in group components remain follow-up work.

See [grouping and aggregation](/guide/grouping) for the API and migration notes, and
[the source](https://github.com/boussadjra/vueye-table/blob/main/docs/.vitepress/theme/components/RowGrouping.vue).
