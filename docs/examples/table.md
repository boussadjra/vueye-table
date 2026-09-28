---
aside: false
---

<script setup lang="ts">
import { ref, shallowRef } from "vue";
import { defineColumns, type RowKey, type TableState } from "vueye-table";

import { makeEmployees, type Employee } from "../.vitepress/theme/data";

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
const state = shallowRef<TableState>({
  sorting: [],
  search: "",
  filters: {},
  pagination: { page: 1, pageSize: 10 },
  selection: [],
  hiddenColumns: ["started"],
  columnOrder: [],
});
const updates = ref(0);

function onStateChange(next: TableState): void {
  state.value = next;
  updates.value += 1;
}
</script>

# Full table

`<VueyeTable>` with search, sorting (Shift-click for several columns), column visibility,
selection, and pagination. {{ selected.length }} selected.

<DemoFrame title="EmployeeTable.vue">
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
    @state-change="onStateChange"
  >
    <template #cell.active="{ value }">{{ value ? "Active" : "Inactive" }}</template>
  </VueyeTable>
  <template v-slot:side>
    <StatePanel label="@state-change" :value="state" :count="updates">
      Use the table and its state appears here: plain data you can save, restore, or send.
    </StatePanel>
  </template>
</DemoFrame>

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
  @state-change="onStateChange"
>
  <template #cell.active="{ value }">{{ value ? "Active" : "Inactive" }}</template>
</VueyeTable>
```
