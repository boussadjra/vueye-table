<script setup lang="ts">
import { ref } from "vue";
import { useData } from "vitepress";
import { defineColumns, type RowKey } from "vueye-table";

import { makeEmployees, type Employee } from "./data";

const { isDark } = useData();
const employees = makeEmployees(137);
const columns = defineColumns<Employee>([
  { id: "name.first", header: "First name" },
  { id: "name.last", header: "Last name" },
  { id: "department" },
  { id: "salary", align: "end", format: (salary) => `$${salary.toLocaleString("en-US")}` },
  { id: "active", header: "Status", searchable: false },
  { id: "started", hidden: true },
]);
const selected = ref<readonly RowKey[]>([]);
</script>

# Full table

`<VueyeTable>` with search, sorting (Shift-click for several columns), column visibility,
selection, and pagination. {{ selected.length }} selected.

<div class="demo">
  <VueyeTable
    v-model:selected="selected"
    :data="employees"
    :columns="columns"
    :theme="isDark ? 'dark' : 'light'"
    caption="Employees"
    selectable
    striped
    sticky-header
    max-height="28rem"
    :page-size-options="[10, 25, 50]"
  >
    <template #cell.active="{ value }">{{ value ? "Active" : "Inactive" }}</template>
  </VueyeTable>
</div>

```vue
<VueyeTable
  v-model:selected="selected"
  :data="employees"
  :columns="columns"
  caption="Employees"
  selectable
  striped
  sticky-header
  max-height="28rem"
  :page-size-options="[10, 25, 50]"
>
  <template #cell.active="{ value }">{{ value ? "Active" : "Inactive" }}</template>
</VueyeTable>
```
