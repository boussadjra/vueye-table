<script setup lang="ts">
import { computed, ref, useId, type CSSProperties } from "vue";
import { defineColumns, useDataTable, type TableColumn } from "vueye-table";

import {
  makeOrders,
  money,
  shortDate,
  itemCount,
  STATUSES,
  type Order,
} from "../examples/orders-dashboard/orders";
import DemoFrame from "./DemoFrame.vue";

const id = useId();
const direction = ref<"ltr" | "rtl">("ltr");
const scroller = ref<HTMLElement | null>(null);
const table = useDataTable<Order>({
  data: makeOrders(8),
  rowKey: "id",
  columns: defineColumns<Order>([
    { id: "id", header: "Order", width: 108, minWidth: 96, maxWidth: 180, pinned: "start" },
    { id: "customer.name", header: "Customer", width: 208 },
    {
      id: "status",
      width: 136,
      format: (value) => STATUSES.find((status) => status.id === value)?.label ?? value,
    },
    { id: "date", header: "Placed", width: 144, format: shortDate },
    { id: "channel", width: 180 },
    { id: "items", header: "Items", width: 88, align: "end", accessor: itemCount },
    { id: "shipping", width: 120, align: "end", format: (value) => money(value) },
    { id: "total", width: 112, align: "end", format: (value) => money(value), pinned: "end" },
  ]),
  paginate: false,
});
const customerPinned = computed(() => table.getColumn("customer.name")?.pinned === "start");
const orderHidden = computed(() => table.state.hiddenColumns.includes("id"));
const orderWide = computed(() => (table.getColumn("id")?.width ?? 108) > 108);
const tableWidth = computed(() =>
  table.columns.reduce((sum, column) => sum + (column.width ?? 120), 0),
);

function columnStyle(column: TableColumn<Order>, header = false): CSSProperties {
  const style: CSSProperties = { width: `${column.width}px`, textAlign: column.align };
  if (header) {
    style.position = "sticky";
    style.top = "0";
    style.zIndex = 2;
  }
  if (column.pinned) {
    style.position = "sticky";
    style.zIndex = header ? 3 : 1;
    if (column.pinned === "start") style.insetInlineStart = `${column.pinOffset}px`;
    else style.insetInlineEnd = `${column.pinOffset}px`;
  }
  return style;
}
function scrollTable(): void {
  scroller.value?.scrollBy({ left: direction.value === "rtl" ? -280 : 280 });
}
function reset(): void {
  table.reset();
  direction.value = "ltr";
  scroller.value?.scrollTo({ left: 0, top: 0 });
}
</script>

<template>
  <DemoFrame title="ColumnPinning.vue">
    <section class="pinning-demo" :dir="direction" aria-label="Column pinning example">
      <div class="demo-heading">
        <h2>Keep the important columns in view</h2>
        <p>Scroll through eight sample orders. Order stays at the start; Total stays at the end.</p>
      </div>
      <div class="controls" role="group" aria-label="Try column pinning">
        <button
          type="button"
          :aria-pressed="customerPinned"
          @click="table.pinColumn('customer.name', customerPinned ? false : 'start')"
        >
          {{ customerPinned ? "Unpin customer" : "Pin customer" }}
        </button>
        <button
          type="button"
          :aria-pressed="orderWide"
          :disabled="orderHidden"
          @click="table.resizeColumn('id', orderWide ? 108 : 160)"
        >
          {{ orderWide ? "Reset order width" : "Widen order" }}
        </button>
        <button type="button" :aria-pressed="orderHidden" @click="table.toggleColumn('id')">
          {{ orderHidden ? "Show order" : "Hide order" }}
        </button>
        <button type="button" @click="scrollTable">Scroll table</button>
        <label :for="`${id}-rtl`" class="direction-toggle">
          <input
            :id="`${id}-rtl`"
            type="checkbox"
            :checked="direction === 'rtl'"
            @change="direction = direction === 'ltr' ? 'rtl' : 'ltr'"
          />
          Right-to-left
        </label>
        <button type="button" class="reset" @click="reset">Reset</button>
      </div>
      <div
        ref="scroller"
        class="scroller"
        tabindex="0"
        role="region"
        aria-label="Scrollable sample orders"
        :aria-describedby="`${id}-hint`"
      >
        <table :style="{ width: `${tableWidth}px` }" :aria-colcount="table.columns.length">
          <caption class="sr-only">
            Sample orders with pinned start and end columns
          </caption>
          <colgroup>
            <col
              v-for="column in table.columns"
              :key="column.id"
              :style="{ width: `${column.width}px` }"
            />
          </colgroup>
          <thead>
            <tr>
              <th
                v-for="(column, index) in table.columns"
                :key="column.id"
                scope="col"
                :aria-colindex="index + 1"
                :data-column="column.id"
                :data-pinned="column.pinned"
                :data-pinned-edge="column.isPinnedEdge ? column.pinned : undefined"
                :style="columnStyle(column, true)"
              >
                <span class="header-label"
                  >{{ column.header
                  }}<span v-if="column.pinned" class="pin-label">{{ column.pinned }}</span></span
                >
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in table.rows" :key="row.key">
              <td
                v-for="(column, index) in table.columns"
                :key="column.id"
                :aria-colindex="index + 1"
                :data-column="column.id"
                :data-pinned="column.pinned"
                :data-pinned-edge="column.isPinnedEdge ? column.pinned : undefined"
                :style="columnStyle(column)"
              >
                <bdi v-if="column.id === 'id' || column.id === 'total'">{{
                  row.getDisplay(column.id)
                }}</bdi>
                <span v-else>{{ row.getDisplay(column.id) }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="demo-footer" role="status" aria-live="polite">
        <p :id="`${id}-hint`">
          {{
            direction === "rtl"
              ? "Start is on the right; end is on the left."
              : "Start is on the left; end is on the right."
          }}
        </p>
        <p>
          Start {{ table.pinnedStartWidth }} px <span aria-hidden="true">·</span> End
          {{ table.pinnedEndWidth }} px
        </p>
      </div>
    </section>
  </DemoFrame>
</template>

<style scoped>
.pinning-demo {
  color: var(--vp-c-text-1);
}
.demo-heading {
  margin-block-end: 20px;
}
.demo-heading h2 {
  margin: 0 0 8px;
  padding: 0;
  border: 0;
  font-size: 20px;
  font-weight: 650;
  line-height: 1.3;
  letter-spacing: -0.025em;
}
.demo-heading p,
.demo-footer p {
  margin: 0;
  color: var(--vp-c-text-2);
  font-size: 13px;
  line-height: 1.6;
}
.controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-block-end: 16px;
}
button {
  min-height: 36px;
  padding: 6px 10px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  font-size: 12px;
  font-weight: 550;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
}
button:hover:not(:disabled) {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}
button[aria-pressed="true"] {
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
}
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.reset {
  margin-inline-start: auto;
}
.direction-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  padding-inline: 6px;
  font-size: 12px;
  color: var(--vp-c-text-2);
  cursor: pointer;
}
.direction-toggle input {
  accent-color: var(--vp-c-brand-1);
}
.scroller {
  max-height: 410px;
  overflow: auto;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  isolation: isolate;
  scrollbar-color: var(--vp-c-border) var(--vp-c-bg-soft);
  overflow-anchor: none;
}
table {
  min-width: 100%;
  margin: 0;
  table-layout: fixed;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 13px;
}
th,
td {
  height: 48px;
  padding: 10px 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  border: 0;
  border-block-end: 1px solid var(--vp-c-divider);
  background: var(--vy-card);
  font-variant-numeric: tabular-nums;
}
th {
  height: 52px;
  color: var(--vp-c-text-2);
  font-size: 12px;
  font-weight: 600;
  background: var(--vp-c-bg-soft);
}
td[data-pinned] {
  background: var(--vp-c-bg-alt);
  font-weight: 550;
}
tbody tr:hover td {
  background: var(--vp-c-bg-soft);
}
tbody tr:last-child td {
  border-block-end: 0;
}
[data-pinned-edge="start"] {
  border-inline-end: 1px solid var(--vp-c-border);
}
[data-pinned-edge="end"] {
  border-inline-start: 1px solid var(--vp-c-border);
}
.header-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.pin-label {
  color: var(--vp-c-brand-1);
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.035em;
}
.demo-footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 4px 20px;
  padding-block-start: 12px;
}
.demo-footer p:last-child {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
@media (max-width: 639px) {
  .demo-heading h2 {
    max-width: 25ch;
    font-size: 18px;
  }
  .controls {
    gap: 6px;
  }
  .scroller {
    max-height: 330px;
  }
  .demo-footer p {
    font-size: 12px;
  }
}
</style>
