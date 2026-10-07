<script setup lang="ts">
import { ref, useId, type ComponentPublicInstance } from "vue";
import {
  useDataGrid,
  useDataTable,
  useVirtualRows,
  useVirtualColumns,
  type RowKey,
} from "vueye-table";

import DemoFrame from "./DemoFrame.vue";

const id = useId();
const scroller = ref<HTMLElement | null>(null);
const data = Array.from({ length: 20_000 }, (_, index) => ({
  id: index,
  name: `Sample row ${index + 1}`,
}));
const table = useDataTable<(typeof data)[number]>({
  data,
  columns: Array.from({ length: 24 }, (_, index) => ({
    id: `c${index}`,
    accessor: (row) => `${row.name} · ${index + 1}`,
  })),
  paginate: false,
});
const grid = useDataGrid(table);
const rows = useVirtualRows(table, {
  scrollElement: scroller,
  estimateRowHeight: 40,
  overscan: 3,
  grid,
});
const columns = useVirtualColumns(grid, {
  scrollElement: scroller,
  estimateColumnWidth: 176,
  overscan: 1,
});

function cellId(row: number, column: number): string {
  return `${id}-${row}-${column}`;
}
function measure(element: Element | ComponentPublicInstance | null, key: RowKey): void {
  rows.measureElement(element, key);
}
function onKey(event: KeyboardEvent): void {
  if (grid.handleKey(event)) event.preventDefault();
}
function focusLast(): void {
  grid.focusCell({ row: table.rows.length - 1, column: table.columns.length - 1 });
}
function focusFirst(): void {
  grid.focusCell({ row: 0, column: 0 });
}
</script>

<template>
  <DemoFrame title="VirtualGrid.vue">
    <div class="controls">
      <button type="button" @click="focusFirst">Focus first cell</button>
      <button type="button" @click="focusLast">Focus last cell</button>
    </div>
    <p :id="`${id}-help`">
      20,000 sample rows · 24 columns. Focus the grid and use the arrow keys to move.
    </p>
    <div
      ref="scroller"
      class="scroller"
      role="grid"
      aria-label="Virtual sample grid"
      :aria-describedby="`${id}-help`"
      :aria-rowcount="table.rows.length"
      :aria-colcount="table.columns.length"
      :aria-activedescendant="
        grid.selection ? cellId(grid.selection.focus.row, grid.selection.focus.column) : undefined
      "
      tabindex="0"
      @keydown="onKey"
    >
      <div
        class="canvas"
        :style="{ height: `${rows.totalSize}px`, width: `${columns.totalSize}px` }"
      >
        <div
          v-for="item in rows.items"
          :key="item.key"
          :ref="(element) => measure(element, item.key)"
          class="row"
          role="row"
          :aria-rowindex="item.renderItem.rowIndex + 1"
          :style="{ transform: `translateY(${item.start}px)` }"
        >
          <div
            v-for="column in columns.items"
            :id="cellId(item.renderItem.rowIndex, column.index)"
            :key="column.key"
            class="cell"
            :class="{
              active: grid.isFocused({ row: item.renderItem.rowIndex, column: column.index }),
            }"
            role="gridcell"
            :aria-colindex="column.index + 1"
            :style="{ width: `${column.size}px`, transform: `translateX(${column.start}px)` }"
            @click="grid.focusCell({ row: item.renderItem.rowIndex, column: column.index })"
          >
            {{ item.renderItem.row.getDisplay(column.column.id) }}
          </div>
        </div>
      </div>
    </div>
    <p role="status">
      {{ rows.items.length }} rows and {{ columns.items.length }} columns rendered<span
        v-if="grid.selection"
      >
        · Active cell: row {{ grid.selection.focus.row + 1 }}, column
        {{ grid.selection.focus.column + 1 }}</span
      >.
    </p>
  </DemoFrame>
</template>

<style scoped>
.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
button {
  padding: 8px 12px;
  font-size: 13px;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-soft);
  border-radius: var(--vy-radius-sm);
}
button:hover {
  background: var(--vp-c-brand-soft);
}
button:focus-visible,
.scroller:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 3px;
}
p {
  margin: 12px 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--vp-c-text-2);
}
p:last-child {
  margin-bottom: 0;
}
.scroller {
  height: 240px;
  overflow: auto;
  border: 1px solid var(--vy-card-border);
  border-radius: var(--vy-radius-sm);
  scrollbar-color: var(--vp-c-border) var(--vy-card);
  overflow-anchor: none;
}
.canvas {
  position: relative;
}
.row {
  position: absolute;
  inset-inline-start: 0;
  top: 0;
  width: 100%;
  height: 40px;
}
.cell {
  position: absolute;
  top: 0;
  left: 0;
  height: 40px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  border-bottom: 1px solid var(--vy-card-border);
  border-inline-end: 1px solid var(--vy-card-border);
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-variant-numeric: tabular-nums;
}
.active {
  background: var(--vp-c-brand-soft);
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: -2px;
}
</style>
