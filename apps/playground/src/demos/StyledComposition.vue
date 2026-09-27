<script setup lang="ts">
import {
  VtColumnVisibility,
  VtPagination,
  VtSearch,
  VtStatus,
  VtTable,
  VtToolbar,
  defineColumns,
  provideDataTable,
  useDataTable,
} from "vueye-table";

import { makeEmployees, type Employee } from "../data";

const table = useDataTable<Employee>({
  data: makeEmployees(48),
  columns: defineColumns<Employee>([
    { id: "name.last", header: "Name" },
    { id: "department" },
    { id: "salary", align: "end" },
  ]),
  initialState: { pagination: { page: 1, pageSize: 8 } },
});
provideDataTable(table);
</script>

<template>
  <section class="demo">
    <p>
      Styled building blocks arranged freely: the toolbar sits below the table and the status line
      beside the pagination.
    </p>
    <VtTable :table="table" density="compact" bordered />
    <VtToolbar>
      <VtSearch placeholder="Filter people" />
      <VtColumnVisibility />
      <VtStatus />
      <VtPagination />
    </VtToolbar>
  </section>
</template>
