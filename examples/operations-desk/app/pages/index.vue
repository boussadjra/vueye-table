<script setup lang="ts">
import { ref, shallowRef } from "vue";
import type { ColumnDef, DataTableBinding, LoadMore } from "vueye-table";

import { money, type Order } from "../utils/operations";
const surface = shallowRef<{ table: DataTableBinding<Order> }>();
const total = ref(100_000);
const latency = ref(600);
const failNext = ref(false);
const requests = ref(0);
const columns: readonly ColumnDef<Order>[] = [
  { id: "reference", header: "Order", width: 170 },
  { id: "customer", header: "Customer", width: 240 },
  { id: "status", header: "Status", width: 130 },
  { id: "warehouse", header: "Warehouse", width: 140 },
  {
    id: "total",
    header: "Value",
    type: "number",
    align: "end",
    width: 150,
    format: (value) => money(value),
  },
  { id: "created", header: "Created", width: 140 },
];
const loadMore: LoadMore<Order> = async ({ cursor, state, signal }) => {
  await Promise.resolve();
  const fail = failNext.value;
  failNext.value = false;
  requests.value++;
  const sort = state.sorting[0];
  const result = await $fetch<{ rows: Order[]; total: number; cursor: number; done: boolean }>(
    "/api/orders",
    {
      signal,
      query: {
        cursor: typeof cursor === "number" ? cursor : 0,
        search: state.search,
        sort: sort?.column ?? "id",
        desc: sort?.direction === "desc" ? "1" : "0",
        delay: latency.value,
        fail: fail ? "1" : "0",
      },
    },
  );
  total.value = result.total;
  return result;
};
function order(value: unknown): Order {
  return value as Order;
}
</script>

<template>
  <section>
    <h1>Order queue</h1>
    <p>
      Search and sort 100,000 orders on the server. Scroll to load another page, select orders for a
      picking run, and open an order to inspect its notes.
    </p>
    <div class="controls">
      <label
        >Response delay
        <select v-model.number="latency">
          <option :value="0">Immediate</option>
          <option :value="600">600 ms</option>
          <option :value="1800">1.8 seconds</option>
        </select></label
      >
      <button :disabled="failNext" @click="failNext = true">
        {{ failNext ? "Outage queued" : "Fail next request" }}
      </button>
      <button :disabled="!surface?.table.canLoadMore" @click="surface?.table.loadNext()">
        Load next page
      </button>
    </div>
    <div class="summary" aria-live="polite">
      <span>{{ total.toLocaleString() }} matching orders</span
      ><span>{{ surface?.table.loadedRowCount ?? 0 }} loaded</span
      ><span>{{ surface?.table.selectedCount ?? 0 }} selected</span
      ><span>{{ requests }} requests</span>
    </div>
    <div class="table-panel">
      <VueyeTable
        ref="surface"
        :columns="columns"
        :load-more="loadMore"
        :row-count="total"
        :pagination="false"
        :column-toggle="false"
        selectable
        virtual
        height="460px"
        :row-height="44"
        :overscan="3"
        :end-threshold="5"
        caption="Warehouse order queue"
        search-placeholder="Search order or customer…"
      >
        <template #expanded="{ row }"
          ><div class="detail">
            <strong>{{ order(row.original).reference }} · Picking instructions</strong>
            <p>
              Check the delivery label before reserving stock. This order belongs to
              {{ order(row.original).warehouse }}.
            </p>
            <p v-if="order(row.original).id % 2 === 0">
              Long handling note: pack fragile items separately, confirm the carrier collection
              window, and leave the customer’s multilingual label intact: مكتبة الأفق · Éditions du
              Port.
            </p>
          </div></template
        >
      </VueyeTable>
    </div>
  </section>
</template>
