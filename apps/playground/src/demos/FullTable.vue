<script setup lang="ts">
import { ref } from "vue";
import { defineColumns, type RowKey } from "vueye-table";

import { makeEmployees, type Employee } from "../data";

const employees = makeEmployees(137);
const columns = defineColumns<Employee>([
  { id: "name.first", header: "First name" },
  { id: "name.last", header: "Last name" },
  { id: "email", sortable: false },
  { id: "department" },
  {
    id: "salary",
    align: "end",
    format: (salary) => `$${salary.toLocaleString("en-US")}`,
  },
  { id: "active", header: "Status", searchable: false },
  { id: "started", hidden: true },
]);

const selected = ref<readonly RowKey[]>([]);
const page = ref(1);
</script>

<template>
  <section class="demo">
    <p>
      <code>&lt;VueyeTable&gt;</code> with search, sorting (Shift-click for several columns), column
      visibility, selection, and pagination. Page {{ page }}, {{ selected.length }} selected.
    </p>
    <VueyeTable
      v-model:selected="selected"
      v-model:page="page"
      :data="employees"
      :columns="columns"
      caption="Employees"
      selectable
      striped
      sticky-header
      max-height="32rem"
      :page-size-options="[10, 25, 50]"
    >
      <template #cell.active="{ value }">
        <span class="badge">{{ value ? "Active" : "Inactive" }}</span>
      </template>
    </VueyeTable>
  </section>
</template>
