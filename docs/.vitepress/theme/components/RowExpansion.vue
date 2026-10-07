<script setup lang="ts">
import { useId } from "vue";
import { useDataTable } from "vueye-table";

import DemoFrame from "./DemoFrame.vue";

const id = useId();
const table = useDataTable({
  data: [
    { id: "order-1", customer: "Ada Bennett", lines: ["Notebook × 2", "Pencil set × 1"] },
    { id: "order-2", customer: "Sam Rivera", lines: ["Desk lamp × 1"] },
    { id: "order-3", customer: "Maya Chen", lines: [] },
  ],
  columns: [{ id: "customer" }],
  getRowCanExpand: (order) => order.lines.length > 0,
  initialState: { pagination: { page: 1, pageSize: 2 } },
});
</script>

<template>
  <DemoFrame title="RowExpansion.vue">
    <div class="controls">
      <button type="button" @click="table.expandAll">Expand all</button>
      <button type="button" @click="table.collapseAll">Collapse all</button>
    </div>
    <div class="results">
      <table aria-label="Orders with details">
        <thead>
          <tr>
            <th scope="col">Order</th>
            <th scope="col">Customer</th>
            <th scope="col">Items</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="item in table.renderItems" :key="item.key">
            <tr v-if="item.kind === 'row'">
              <td>{{ item.row.key }}</td>
              <td>{{ item.row.original.customer }}</td>
              <td>
                <button
                  v-if="item.row.canExpand"
                  type="button"
                  :aria-expanded="item.row.isExpanded"
                  :aria-controls="`${id}-${item.rowIndex}`"
                  @click="table.toggleExpanded(item.row.key)"
                >
                  {{ item.row.isExpanded ? "Hide" : "Show" }} items<span class="sr-only">
                    for {{ item.row.key }}</span
                  ></button
                ><span v-else>No items</span>
              </td>
            </tr>
            <tr v-else :id="`${id}-${item.rowIndex}`" class="detail">
              <td colspan="3">
                <ul>
                  <li v-for="line in item.row.original.lines" :key="line">{{ line }}</li>
                </ul>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
    <div class="controls footer">
      <button type="button" :disabled="!table.canPreviousPage" @click="table.previousPage">
        Previous page
      </button>
      <p role="status">
        Page {{ table.page }} of {{ table.pageCount }} · {{ table.rowCount }} orders
      </p>
      <button type="button" :disabled="!table.canNextPage" @click="table.nextPage">
        Next page
      </button>
    </div>
  </DemoFrame>
</template>

<style scoped>
.controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}
.results {
  overflow: auto;
  margin-top: 16px;
  border: 1px solid var(--vy-card-border);
  border-radius: var(--vy-radius-sm);
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
th,
td {
  padding: 12px;
  text-align: start;
  white-space: nowrap;
}
th {
  color: var(--vp-c-text-2);
  font-weight: 500;
  background: var(--vp-c-bg-soft);
}
td {
  border-top: 1px solid var(--vy-card-border);
}
.detail td {
  background: var(--vp-c-bg-soft);
}
ul {
  margin: 0;
  padding-inline-start: 20px;
}
button {
  padding: 8px 12px;
  border-radius: var(--vy-radius-sm);
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  font-size: 13px;
}
button:hover:not(:disabled) {
  background: var(--vp-c-brand-soft);
}
button:disabled {
  opacity: 0.45;
}
button:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 3px;
}
.footer {
  margin-top: 16px;
}
p {
  margin: 0;
  color: var(--vp-c-text-2);
  font-size: 13px;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>
