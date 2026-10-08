<script setup lang="ts">
import { ref } from "vue";
import {
  VueyeGrid,
  VueyeTable,
  type ColumnDef,
  type LoadMore,
  type SourceContext,
} from "vueye-table";

import DemoFrame from "./DemoFrame.vue";

interface Sample {
  readonly id: number;
  readonly account: string;
  readonly region: string;
  readonly amount: number;
}
const mode = ref<"feed" | "pages">("feed");
const surface = ref<"table" | "grid">("table");
const region = ref("North");
const revision = ref(0);
const failNext = ref(false);
const columns: readonly ColumnDef<Sample>[] = [
  { id: "account", header: "Account", width: 200 },
  { id: "region", header: "Region", width: 120 },
  { id: "amount", header: "Amount", type: "number", align: "end", width: 120 },
];
const records = (start: number, count: number, zone: string): Sample[] =>
  Array.from({ length: count }, (_, index) => ({
    id: start + index,
    account: `Sample account ${start + index + 1}`,
    region: zone,
    amount: 100 + start + index,
  }));
function pause(signal: AbortSignal, ms: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const abort = (): void => {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      reject(new Error("Loading stopped"));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, ms);
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
  });
}
function feed({ signal }: SourceContext): AsyncIterable<readonly Sample[]> {
  const zone = region.value;
  void revision.value;
  return (async function* () {
    for (let start = 0; start < 240; start += 20) {
      // Sequential delays model a feed arriving over time.
      // eslint-disable-next-line no-await-in-loop
      await pause(signal, 300);
      if (failNext.value) {
        failNext.value = false;
        throw new Error("Simulated connection failure");
      }
      yield records(start, 20, zone);
    }
  })();
}
const loadMore: LoadMore<Sample> = async ({ cursor, state, signal }) => {
  const start = typeof cursor === "number" ? cursor : 0;
  await pause(signal, 350);
  if (failNext.value) {
    failNext.value = false;
    throw new Error("Simulated connection failure");
  }
  const rows = records(start, 25, region.value).map((row) => ({
    ...row,
    account: state.search ? `${state.search} ${row.id + 1}` : row.account,
  }));
  return { rows, cursor: start + rows.length, done: start + rows.length >= 150 };
};
</script>

<template>
  <DemoFrame title="StreamingRows.vue" class="stream-demo">
    <div class="controls">
      <label
        >Load method
        <select v-model="mode">
          <option value="feed">Live feed</option>
          <option value="pages">Cursor pages</option>
        </select></label
      >
      <label
        >View
        <select v-model="surface">
          <option value="table">Data table</option>
          <option value="grid">Spreadsheet</option>
        </select></label
      >
      <label
        >Region
        <select v-model="region">
          <option>North</option>
          <option>South</option>
        </select></label
      >
      <button type="button" @click="revision++">Restart loading</button>
      <button type="button" :disabled="failNext" @click="failNext = true">
        {{ failNext ? "Failure queued" : "Fail next request" }}
      </button>
    </div>
    <p>
      Generated sample records.
      {{
        mode === "feed"
          ? "240 rows arrive in batches. Change region to restart the feed."
          : "150 rows load in cursor pages. Scroll near the end or choose Load more rows. Search starts a fresh query."
      }}
      Queue a failure to try the retry control.
    </p>
    <component
      :is="surface === 'table' ? VueyeTable : VueyeGrid"
      :key="`${mode}-${surface}-${mode === 'pages' ? `${region}-${revision}` : ''}`"
      :columns="columns"
      :source="mode === 'feed' ? feed : undefined"
      :load-more="mode === 'pages' ? loadMore : undefined"
      virtual
      height="var(--stream-demo-height)"
      :row-height="40"
      :overscan="2"
      :end-threshold="3"
      :column-toggle="false"
      :toolbar="false"
      :editable="false"
      :selectable="surface === 'table'"
      :searchable="mode === 'pages'"
      caption="Sample accounts"
      label="Streaming sample accounts"
    />
  </DemoFrame>
</template>

<style scoped>
.stream-demo {
  --stream-demo-height: 280px;
}
@media (max-width: 640px) {
  .stream-demo {
    --stream-demo-height: 200px;
  }
}
.controls {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 12px;
}
label {
  display: grid;
  gap: 4px;
  color: var(--vp-c-text-2);
  font-size: 13px;
}
select,
button {
  padding: 8px 12px;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: var(--vy-radius-sm);
  font-size: 13px;
}
button:hover {
  background: var(--vp-c-brand-soft);
}
button:disabled {
  opacity: 0.6;
}
select:focus-visible,
button:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 3px;
}
p {
  margin: 12px 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--vp-c-text-2);
}
</style>
