<script setup lang="ts">
import type { ColumnDef } from "@vueye-table/core";
import { DataTableCaption } from "@vueye-table/headless";
import { VtBody, VtHeader, VtTable, VtStatus } from "@vueye-table/styled";
import { provideDataTable, useDataTable, type SourceContext } from "@vueye-table/vue";
import { computed } from "vue";

import type { ReceivingEvent } from "../utils/operations";
const props = defineProps<{ count: number; fail: boolean }>();
async function* feed({ signal }: SourceContext): AsyncGenerator<ReceivingEvent> {
  const response = await fetch(`/api/receiving?count=${props.count}&fail=${props.fail ? 1 : 0}`, {
    signal,
  });
  if (!response.ok || !response.body)
    throw new Error(
      `Receiving connection failed (${response.status}). Restart receiving to retry.`,
    );
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      // Each chunk depends on the previous read; parallel reads lose the stream boundary.
      // eslint-disable-next-line no-await-in-loop
      const next = await reader.read();
      buffer += decoder.decode(next.value, { stream: !next.done });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) if (line) yield JSON.parse(line) as ReceivingEvent;
      if (next.done) break;
    }
    if (buffer.trim()) throw new Error("Receiving stream ended with an incomplete record.");
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
const columns: readonly ColumnDef<ReceivingEvent>[] = [
  { id: "reference", header: "Delivery", width: 150 },
  { id: "warehouse", header: "Warehouse", width: 150 },
  { id: "quantity", header: "Units", type: "number", width: 100 },
  { id: "message", header: "Receiving note", width: 500 },
];
const table = useDataTable<ReceivingEvent>({
  data: [],
  columns,
  rowKey: "id",
  paginate: false,
  source: feed,
  streamOptions: { expectedRowCount: props.count, batchSize: 50 },
});
provideDataTable(table);
const summary = computed(
  () =>
    `${table.loadedRowCount.toLocaleString()} of ${props.count.toLocaleString()} deliveries · ${table.loadState}`,
);
</script>

<template>
  <div>
    <p class="notice" role="status">{{ summary }}</p>
    <div class="table-panel">
      <VtTable :table="table" virtual height="460px" :row-height="44" :overscan="3"
        ><DataTableCaption>Live receiving deliveries</DataTableCaption><VtHeader /><VtBody
      /></VtTable>
    </div>
    <VtStatus />
  </div>
</template>
