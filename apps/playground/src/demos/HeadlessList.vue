<script setup lang="ts">
import {
  DataTablePagination,
  DataTableRoot,
  DataTableSearch,
  DataTableStatus,
  defineColumns,
  useDataTable,
} from "vueye-table";

import { makeEmployees, type Employee } from "../data";

const table = useDataTable<Employee>({
  data: makeEmployees(30),
  columns: defineColumns<Employee>([
    { id: "name.first" },
    { id: "name.last" },
    { id: "department" },
  ]),
  initialState: { pagination: { page: 1, pageSize: 5 } },
});
</script>

<template>
  <section class="demo">
    <p>
      Headless components render no styles and any markup: here the table is a list of cards, with
      the engine's search, paging, and live status.
    </p>
    <DataTableRoot :table="table" as="div">
      <DataTableSearch placeholder="Search" />
      <ul class="headless-list">
        <li v-for="row in table.rows" :key="row.key">
          <strong>{{ row.getDisplay("name.first") }} {{ row.getDisplay("name.last") }}</strong>
          <span>{{ row.getDisplay("department") }}</span>
        </li>
      </ul>
      <DataTablePagination v-slot="{ page, pageCount, previous, next, canPrevious, canNext }">
        <button type="button" :disabled="!canPrevious" @click="previous">Back</button>
        {{ page }} / {{ pageCount }}
        <button type="button" :disabled="!canNext" @click="next">Forward</button>
      </DataTablePagination>
      <DataTableStatus />
    </DataTableRoot>
  </section>
</template>
