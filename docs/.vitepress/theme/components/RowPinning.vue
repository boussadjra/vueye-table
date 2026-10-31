<script setup lang="ts">
import { computed, useId } from "vue";
import { useDataGrid, useDataTable, type RowKey } from "vueye-table";

import DemoFrame from "./DemoFrame.vue";

interface Stock {
  id: number;
  item: string;
  quantity: number;
  price: number;
}
const id = useId();
const seed: readonly Stock[] = [
  { id: 1, item: "Canvas tote", quantity: 48, price: 12 },
  { id: 2, item: "Steel bottle", quantity: 32, price: 24 },
  { id: 3, item: "Desk organiser", quantity: 18, price: 16 },
  { id: 4, item: "Linen notebook", quantity: 64, price: 9 },
  { id: 5, item: "Travel pouch", quantity: 27, price: 18 },
  { id: 6, item: "Reference sample", quantity: 1, price: 0 },
  { id: 7, item: "Cable wrap", quantity: 80, price: 6 },
  { id: 8, item: "Gift sleeve", quantity: 96, price: 4 },
];
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const table = useDataTable<Stock>({
  data: seed,
  columns: [
    { id: "item" },
    {
      id: "quantity",
      editable: true,
      type: "number",
      validate: (value) =>
        (Number.isInteger(value) && value >= 0) || "Enter a whole quantity of zero or more.",
    },
    { id: "price", format: (value) => money.format(value) },
  ],
  initialState: { rowPinning: { top: [1], bottom: [6] }, pagination: { page: 1, pageSize: 3 } },
});
const grid = useDataGrid(table);
const regions = computed(() => [
  { key: "top", label: "Top", rows: table.topRows, offset: 0 },
  { key: "centre", label: "Centre", rows: table.rows, offset: table.topRows.length },
  {
    key: "bottom",
    label: "Bottom",
    rows: table.bottomRows,
    offset: table.topRows.length + table.rows.length,
  },
]);
const active = computed(() =>
  grid.selection ? grid.cellAt(grid.selection.focus)?.row.original.item : undefined,
);
function search(event: Event): void {
  table.search((event.target as HTMLInputElement).value);
}
function pin(key: RowKey, event: Event): void {
  const side = (event.target as HTMLSelectElement).value;
  table.pinRow(key, side === "top" || side === "bottom" ? side : false);
}
function edit(key: RowKey, event: Event): void {
  const input = event.target as HTMLInputElement;
  const result = table.edit({ rowKey: key, column: "quantity", input: input.value });
  input.setCustomValidity(result.issues[0]?.message ?? "");
  input.reportValidity();
  input.value = String(table.getRow(key)?.original.quantity ?? "");
}
function onKey(event: KeyboardEvent): void {
  if (event.target !== event.currentTarget) return;
  if (grid.handleKey(event)) event.preventDefault();
}
function refresh(): void {
  const row = table.topRows[0]?.original;
  if (row) table.upsertData([{ ...row, quantity: row.quantity + 5 }]);
}
function remove(): void {
  const key = table.topRows[0]?.key;
  if (key !== undefined) table.removeData([key]);
}
function reset(): void {
  table.setData(seed);
  table.reset();
  grid.focusCell({ row: 0, column: 0 });
}
</script>

<template>
  <DemoFrame title="RowPinning.vue">
    <div class="pinning-demo">
      <div class="controls">
        <label :for="`${id}-search`">Find an item</label>
        <input
          :id="`${id}-search`"
          type="search"
          :value="table.state.search"
          placeholder="Search the centre; pins stay visible"
          @input="search"
        />
        <button type="button" @click="table.toggleSort('quantity')">Sort by quantity</button>
        <button
          type="button"
          :disabled="!table.topRows.length || table.topRows[0]?.isDirty"
          @click="refresh"
        >
          Refresh top quantity
        </button>
        <button
          type="button"
          :disabled="!table.topRows.length || table.topRows[0]?.isDirty"
          @click="remove"
        >
          Remove first top pin
        </button>
        <button type="button" @click="reset">Reset demo</button>
      </div>
      <p class="hint">
        Illustrative inventory. Choose a pin position, edit a quantity, or focus the grid and use
        arrow keys.
      </p>
      <div
        class="table-scroll"
        role="region"
        aria-label="Inventory keyboard controls"
        tabindex="0"
        @keydown="onKey"
      >
        <table
          role="grid"
          :aria-rowcount="table.gridRows.length + 1"
          aria-colcount="4"
          aria-label="Inventory with pinned rows"
        >
          <thead>
            <tr>
              <th scope="col">Item</th>
              <th scope="col" class="number">Quantity</th>
              <th scope="col" class="number">Unit price</th>
              <th scope="col">Pin position</th>
            </tr>
          </thead>
          <tbody v-for="region in regions" :key="region.key" :class="`region-${region.key}`">
            <tr
              v-for="(row, index) in region.rows"
              :key="row.key"
              :aria-rowindex="region.offset + index + 2"
              :data-region="region.key"
              :style="{
                '--pin-offset': `${region.key === 'top' ? 42 + index * 56 : (region.rows.length - index - 1) * 56}px`,
              }"
            >
              <th
                scope="row"
                :class="{ active: grid.isFocused({ row: region.offset + index, column: 0 }) }"
                @click="grid.focusCell({ row: region.offset + index, column: 0 })"
              >
                {{ row.original.item
                }}<span v-if="region.key !== 'centre'" class="pin-label"
                  >{{ region.label }} pin</span
                >
              </th>
              <td
                class="number"
                :class="{ active: grid.isFocused({ row: region.offset + index, column: 1 }) }"
              >
                <input
                  type="number"
                  min="0"
                  step="1"
                  :aria-label="`Quantity for ${row.original.item}`"
                  :value="row.original.quantity"
                  @focus="grid.focusCell({ row: region.offset + index, column: 1 })"
                  @change="edit(row.key, $event)"
                />
              </td>
              <td
                class="number"
                :class="{ active: grid.isFocused({ row: region.offset + index, column: 2 }) }"
                @click="grid.focusCell({ row: region.offset + index, column: 2 })"
              >
                {{ row.getDisplay("price") }}
              </td>
              <td>
                <select
                  :aria-label="`Pin position for ${row.original.item}`"
                  :value="region.key"
                  @change="pin(row.key, $event)"
                >
                  <option value="centre">Centre</option>
                  <option value="top">Top</option>
                  <option value="bottom">Bottom</option>
                </select>
              </td>
            </tr>
            <tr v-if="region.key === 'centre' && !region.rows.length">
              <td colspan="4" class="empty">
                No matching centre items. Pinned items remain visible.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="footer">
        <p role="status">
          {{ table.rowCount }} centre {{ table.rowCount === 1 ? "item" : "items" }} ·
          {{ table.topRows.length + table.bottomRows.length }} pinned · Page {{ table.page }} of
          {{ table.pageCount }}<span v-if="active"> · Active: {{ active }}</span>
        </p>
        <div>
          <button type="button" :disabled="!table.canPreviousPage" @click="table.previousPage">
            Previous</button
          ><button type="button" :disabled="!table.canNextPage" @click="table.nextPage">
            Next
          </button>
        </div>
      </div>
      <p v-for="(problem, index) in table.issues" :key="index" class="hint">
        {{ problem.message }}
      </p>
      <details>
        <summary>Page CSV in visual order</summary>
        <pre>{{ table.exportRows({ pageOnly: true }) }}</pre>
      </details>
    </div>
  </DemoFrame>
</template>

<style scoped>
.pinning-demo {
  color: var(--vp-c-text-1);
  font-size: 0.875rem;
}
.controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.625rem;
}
.controls label {
  font-weight: 600;
}
.controls input {
  flex: 1;
  min-width: min(100%, 16rem);
}
button,
input,
select {
  font: inherit;
  color: inherit;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  padding: 0.5rem 0.625rem;
}
button {
  cursor: pointer;
}
button:hover:not(:disabled) {
  background: var(--vp-c-bg-soft);
}
button:disabled {
  opacity: 0.5;
  cursor: default;
}
:is(button, input, select, summary, .table-scroll):focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 3px;
}
.hint {
  color: var(--vp-c-text-2);
  font-size: 0.8rem;
  margin-block: 0.875rem;
}
.table-scroll {
  overflow: auto;
  max-height: 380px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
}
table {
  display: table;
  width: 100%;
  min-width: 640px;
  border-collapse: separate;
  border-spacing: 0;
  margin: 0;
  white-space: nowrap;
}
th,
td {
  border: 0;
  border-block-end: 1px solid var(--vp-c-divider);
  padding: 0.5rem 0.875rem;
  height: 56px;
  text-align: start;
  background: var(--vp-c-bg);
}
thead th {
  position: sticky;
  top: 0;
  height: 42px;
  z-index: 3;
  background: var(--vp-c-bg-soft);
  font-weight: 600;
}
tbody th {
  font-weight: 500;
}
.region-top :is(th, td),
.region-bottom :is(th, td) {
  position: sticky;
  z-index: 2;
  background: var(--vp-c-bg-soft);
}
.region-top :is(th, td) {
  top: var(--pin-offset);
}
.region-bottom :is(th, td) {
  bottom: var(--pin-offset);
}
tr:nth-child(2n) {
  background: transparent;
}
.number {
  text-align: end;
  font-variant-numeric: tabular-nums;
}
td input {
  width: 5.5rem;
  text-align: end;
  font-variant-numeric: tabular-nums;
}
.pin-label {
  display: block;
  font-size: 0.7rem;
  color: var(--vp-c-text-2);
}
.active {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: -2px;
}
.empty {
  text-align: center;
  color: var(--vp-c-text-2);
  height: 80px;
}
.footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-block: 1rem;
}
.footer p {
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
  margin: 0;
}
.footer button + button {
  margin-inline-start: 0.5rem;
}
summary {
  font-weight: 600;
  cursor: pointer;
}
pre {
  overflow-x: auto;
  background: var(--vp-c-bg-soft);
  padding: 1rem;
  font-size: 0.75rem;
}
@media (max-width: 600px) {
  .controls label {
    width: 100%;
  }
  .controls input {
    min-width: 100%;
  }
}
</style>
