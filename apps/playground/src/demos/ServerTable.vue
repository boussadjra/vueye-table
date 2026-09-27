<script setup lang="ts">
import { ref, shallowRef, watch } from "vue";
import { defineColumns, type SortRule } from "vueye-table";

import { fetchPage, makeEmployees, type Employee } from "../data";

const database = makeEmployees(512);
const columns = defineColumns<Employee>([
  { id: "name.last", header: "Last name" },
  { id: "department" },
  { id: "salary", align: "end" },
]);

const rows = shallowRef<Employee[]>([]);
const total = ref(0);
const loading = ref(false);
const page = ref(1);
const pageSize = ref(10);
const search = ref("");
const sorting = ref<readonly SortRule[]>([]);

watch(
  [page, pageSize, search, sorting],
  async () => {
    loading.value = true;
    const [sort] = sorting.value;
    const result = await fetchPage(database, {
      page: page.value,
      pageSize: pageSize.value,
      search: search.value,
      ...(sort ? { sort } : {}),
    });
    rows.value = result.rows;
    total.value = result.total;
    loading.value = false;
  },
  { immediate: true },
);
</script>

<template>
  <section class="demo">
    <p>
      <code>manual</code> mode: the table only presents the page a server returns. Every
      <code>v-model</code> change triggers a new request.
    </p>
    <VueyeTable
      v-model:page="page"
      v-model:page-size="pageSize"
      v-model:search="search"
      v-model:sorting="sorting"
      :data="rows"
      :columns="columns"
      :row-count="total"
      :loading="loading"
      :column-toggle="false"
      manual
    />
  </section>
</template>
