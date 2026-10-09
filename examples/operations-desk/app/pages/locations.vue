<script setup lang="ts">
import { ref, shallowRef } from "vue";
import type { ColumnDef, DataTableBinding, TableRow } from "vueye-table";

import type { Location } from "../utils/operations";
const { data } = await useFetch<readonly Location[]>("/api/locations");
const surface = shallowRef<{ table: DataTableBinding<Location> }>();
const failNext = ref(false);
const requests = ref(0);
const filter = ref<"ancestors" | "descendants" | "strict">("ancestors");
const columns: readonly ColumnDef<Location>[] = [
  { id: "name", header: "Location", width: 320 },
  { id: "kind", header: "Type", width: 150 },
  { id: "capacity", header: "Capacity", type: "number", align: "end", width: 150 },
];
async function loadChildren(
  row: TableRow<Location>,
  signal: AbortSignal,
): Promise<readonly Location[]> {
  await Promise.resolve();
  const fail = failNext.value;
  failNext.value = false;
  requests.value++;
  return $fetch<Location[]>("/api/locations", {
    signal,
    query: { parent: row.key, delay: 700, fail: fail ? "1" : "0" },
  });
}
const getChildren = () => undefined;
const hasChildren = (row: Location) => row.kind !== "bin";
</script>

<template>
  <section>
    <h1>Warehouse locations</h1>
    <p>
      Expand a warehouse to fetch its aisles, then an aisle to fetch its bins. Select a branch to
      check descendant selection. Collapse or leave this page while a request is pending.
    </p>
    <div class="controls">
      <label
        >Search context
        <select v-model="filter">
          <option value="ancestors">Keep ancestors</option>
          <option value="descendants">Keep descendants</option>
          <option value="strict">Matching rows only</option>
        </select></label
      ><button :disabled="failNext" @click="failNext = true">
        {{ failNext ? "Outage queued" : "Fail next branch load" }}</button
      ><button @click="surface?.table.collapseAll()">Collapse locations</button>
    </div>
    <div class="summary" aria-live="polite">
      <span>{{ requests }} branch requests</span
      ><span>{{ surface?.table.selectedCount ?? 0 }} locations selected</span>
    </div>
    <div class="table-panel">
      <VueyeTable
        ref="surface"
        :data="data ?? []"
        :columns="columns"
        :get-children="getChildren"
        :has-children="hasChildren"
        :load-children="loadChildren"
        :tree-filter="filter"
        selectable
        :pagination="false"
        :column-toggle="false"
        virtual
        height="460px"
        :row-height="44"
        caption="Warehouse location tree"
        search-placeholder="Search loaded locations…"
      />
    </div>
    <p>
      Search covers branches already fetched. Failed loads expose a retry control on their branch.
    </p>
  </section>
</template>
