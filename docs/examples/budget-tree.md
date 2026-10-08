<script setup>
import BudgetTree from '../.vitepress/theme/components/BudgetTree.vue'
</script>

# Editable department tree

<BudgetTree />

The generated plan is flat adjacency data: `getParentKey` relates each project to its department.
Edit child allocations, select a department, scroll, undo, save locally or revert. Parent amounts
are independently stored planning values. They are not live sums of children.

Checkbox selection uses a companion `useDataTable` binding over the same rows. Its department
checkboxes show partial selection and cascade to loaded descendants. `VueyeGrid` keeps its
built-in spreadsheet range selection for editing.

Edit **Engineering project 1**, then choose **Receive sample update**. Core refuses an ingestion
update that conflicts with a local dirty row; the message explains why the local value remains.
This combines trees, editing, ingestion, selection and virtual rendering without modifying input rows.

Run `pnpm docs:dev` and open `/examples/budget-tree`.
[BudgetTree.vue](https://github.com/boussadjra/vueye-table/blob/main/docs/.vitepress/theme/components/BudgetTree.vue)
contains the complete example. See [validation and saving](/guide/validation) and
[virtualization](/guide/virtualization).
