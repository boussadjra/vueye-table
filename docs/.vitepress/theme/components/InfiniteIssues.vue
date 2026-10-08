<script setup lang="ts">
import { ref } from "vue";
import { VueyeTable, type ColumnDef, type LoadMore } from "vueye-table";

import { fetchPage, ISSUE_COUNT, type Issue } from "../examples/server-side/api";
import DemoFrame from "./DemoFrame.vue";

const failNext = ref(false);
const columns: readonly ColumnDef<Issue>[] = [
  { id: "number", header: "Issue", width: 90 },
  { id: "title", width: 350 },
  { id: "state", width: 100 },
  { id: "author", width: 130 },
];
const loadMore: LoadMore<Issue> = async ({ cursor, state, signal }) => {
  const page = typeof cursor === "number" ? cursor : 1;
  const fail = failNext.value;
  failNext.value = false;
  const result = await fetchPage(
    {
      page,
      size: 25,
      q: state.search,
      labels: [],
      sort: state.sorting.map((rule) => `${rule.direction === "desc" ? "-" : ""}${rule.column}`),
    },
    { signal, fail },
  );
  return { rows: result.rows, cursor: page + 1, done: page * 25 >= result.total };
};
</script>

<template>
  <DemoFrame title="InfiniteIssues.vue" class="completion-demo">
    <div class="demo-controls">
      <button type="button" :disabled="failNext" @click="failNext = true">
        {{ failNext ? "Failure queued" : "Fail next request" }}
      </button>
    </div>
    <p class="demo-help">
      {{ ISSUE_COUNT.toLocaleString("en-US") }} generated issues share the paged example’s simulated
      API. Search or sort starts a fresh query. Scroll near the end or choose Load more rows; queue
      a failure to try Retry loading.
    </p>
    <VueyeTable
      :columns="columns"
      :load-more="loadMore"
      row-key="number"
      virtual
      height="var(--completion-height)"
      :row-height="44"
      :end-threshold="3"
      :column-toggle="false"
      caption="Sample issues"
      search-placeholder="Search sample issues…"
    />
  </DemoFrame>
</template>

<style src="./completion-demos.css"></style>
