<script setup lang="ts">
import { onScopeDispose, ref } from "vue";
import {
  DataTableCaption,
  useDataTable,
  VtBody,
  VtHeader,
  VtTable,
  type ColumnDef,
} from "vueye-table";

import { parseNdjson, simulatedLogs, type LogEntry } from "../examples/live-logs/source";
import DemoFrame from "./DemoFrame.vue";

const columns: readonly ColumnDef<LogEntry>[] = [
  { id: "id", header: "Sequence", width: 100 },
  { id: "level", width: 90 },
  { id: "message", width: 420 },
];
const table = useDataTable({ data: [], columns, rowKey: "id", paginate: false });
const running = ref(false);
let controller: AbortController | undefined;
async function start(): Promise<void> {
  if (running.value) return;
  controller = new AbortController();
  table.setData([]);
  running.value = true;
  try {
    await table.stream(parseNdjson(simulatedLogs(controller.signal), controller.signal), {
      signal: controller.signal,
      batchSize: 5,
      expectedRowCount: 80,
    });
  } finally {
    running.value = false;
  }
}
onScopeDispose(() => controller?.abort());
</script>

<template>
  <DemoFrame title="LiveLogs.vue" class="completion-demo">
    <div class="demo-controls">
      <button type="button" :disabled="running" @click="start">Start sample feed</button>
      <button type="button" :disabled="!running" @click="controller?.abort()">Stop feed</button>
    </div>
    <p class="demo-help">
      80 generated log records arrive as NDJSON bytes. Stop preserves received rows; start replaces
      them. No remote service is contacted.
    </p>
    <p class="demo-status" role="status">
      {{ table.loadState }} · {{ table.loadedRowCount }} / 80 records received
    </p>
    <VtTable :table="table" virtual height="var(--completion-height)" :row-height="40">
      <DataTableCaption>Sample worker logs</DataTableCaption>
      <VtHeader />
      <VtBody />
    </VtTable>
  </DemoFrame>
</template>

<style src="./completion-demos.css"></style>
