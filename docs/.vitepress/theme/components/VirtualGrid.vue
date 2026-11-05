<script setup lang="ts">
import { computed, nextTick, ref, useId, type ComponentPublicInstance } from "vue";
import {
  useDataGrid,
  useDataTable,
  useVirtualRows,
  useVirtualColumns,
  type RowKey,
  type VirtualColumnItem,
} from "vueye-table";

import DemoFrame from "./DemoFrame.vue";

const id = useId();
const scroller = ref<HTMLElement | null>(null);
const TOTAL_KEY = -1;
const data = Array.from({ length: 20_000 }, (_, index) => ({
  id: index,
  name: `Sample row ${index + 1}`,
  team: ["Support", "Sales", "Engineering", "Operations"][index % 4]!,
  amount: ((index % 100) + 1) * 25,
}));
const table = useDataTable<(typeof data)[number]>({
  data: [
    ...data,
    {
      id: TOTAL_KEY,
      name: "All-row total",
      team: "All teams",
      amount: data.reduce((sum, row) => sum + row.amount, 0),
    },
  ],
  columns: Array.from({ length: 24 }, (_, index) => ({
    id: `c${index}`,
    header: index === 2 ? "Amount" : `Column ${index + 1}`,
    accessor: (row) =>
      index === 0
        ? row.name
        : index === 1
          ? row.team
          : index === 2
            ? row.amount
            : row.id === TOTAL_KEY
              ? index === 23
                ? `${data.length.toLocaleString("en-US")} rows`
                : ""
              : `${row.id + 1} · ${index + 1}`,
    editable: false,
    width: index === 0 ? 160 : index === 23 ? 100 : 176,
  })),
  paginate: false,
  columnPinning: { start: ["c0"], end: ["c23"] },
  initialState: { rowPinning: { top: [], bottom: [TOTAL_KEY] } },
});
const grid = useDataGrid(table);
const rows = useVirtualRows(table, {
  scrollElement: scroller,
  estimateRowHeight: (index) => (table.renderItems[index]?.kind === "group" ? 48 : 40),
  overscan: 3,
  grid,
  pinnedRowHeights: { top: 0, bottom: 40 },
});
const columns = useVirtualColumns(grid, {
  scrollElement: scroller,
  estimateColumnWidth: 176,
  overscan: 1,
});

function cellId(row: number, column: number): string {
  return `${id}-${row}-${column}`;
}
const activeCellId = computed(() => {
  const focus = grid.selection?.focus;
  return focus &&
    columns.items.some((item) => item.index === focus.column) &&
    (rows.items.some(
      (item) => item.renderItem.kind === "row" && item.renderItem.rowIndex === focus.row,
    ) ||
      table.gridRows[focus.row]?.key === TOTAL_KEY)
    ? cellId(focus.row, focus.column)
    : undefined;
});
function measure(element: Element | ComponentPublicInstance | null, key: RowKey): void {
  rows.measureElement(element, key);
}
function onKey(event: KeyboardEvent): void {
  if (event.target !== event.currentTarget) return;
  if (grid.handleKey(event)) event.preventDefault();
}
function focusLast(): void {
  activate(table.gridRows.length - 1, table.columns.length - 1);
}
function focusFirst(): void {
  activate(0, 0);
}
function activate(row: number, column: number): void {
  grid.focusCell({ row, column });
  void nextTick(() => scroller.value?.focus({ preventScroll: true }));
}
const presentationIndices = computed(
  () => new Map<RowKey, number>(table.renderItems.map((item, index) => [item.key, index + 1])),
);
const presentationCount = computed(() => table.renderItems.length + table.bottomRows.length);
function columnOffset(item: VirtualColumnItem<(typeof data)[number]>): number {
  if (item.column.pinned === "start") return columns.offset + item.column.pinOffset;
  if (item.column.pinned === "end")
    return (
      columns.offset +
      columns.viewportSize +
      table.pinnedStartWidth +
      table.pinnedEndWidth -
      item.column.pinOffset -
      item.size
    );
  return item.start;
}
function toggleGrouping(): void {
  grid.setGrouping(grid.grouping.length ? [] : ["c1"]);
  focusFirst();
}
</script>

<template>
  <DemoFrame title="VirtualGrid.vue">
    <div class="controls">
      <button type="button" @click="focusFirst">Focus first cell</button>
      <button type="button" @click="focusLast">Focus last cell</button>
      <button type="button" @click="table.resizeColumn('c0', 280)">Widen first column</button>
      <button type="button" @click="table.resetColumnSize()">Reset column widths</button>
      <button type="button" :aria-pressed="!!grid.grouping.length" @click="toggleGrouping">
        {{ grid.grouping.length ? "Remove grouping" : "Group by team" }}
      </button>
      <button
        type="button"
        :aria-pressed="!!grid.columnPinning.start.length"
        @click="
          table.setState({
            columnPinning: grid.columnPinning.start.length
              ? { start: [], end: [] }
              : { start: ['c0'], end: ['c23'] },
          })
        "
      >
        {{ grid.columnPinning.start.length ? "Unpin edges" : "Pin edges" }}
      </button>
    </div>
    <p :id="`${id}-help`">
      20,000 sample rows · 24 columns. Pinned edges stay visible while the centre scrolls. Group by
      team, then collapse a group or use the arrow keys inside the grid. Column 3 contains sample
      amounts; the read-only all-row total stays pinned below the centre and outside every group.
    </p>
    <div
      ref="scroller"
      class="scroller"
      :role="table.grouped ? 'treegrid' : 'grid'"
      aria-label="Virtual sample grid"
      :aria-describedby="`${id}-help`"
      :aria-rowcount="presentationCount"
      :aria-colcount="table.columns.length"
      :aria-activedescendant="activeCellId"
      tabindex="0"
      @keydown="onKey"
    >
      <div
        class="canvas"
        :style="{ height: `${rows.totalSize}px`, width: `${columns.totalSize}px` }"
      >
        <template v-for="item in rows.items" :key="item.key">
          <div
            v-if="item.renderItem.kind === 'row'"
            :ref="(element) => measure(element, item.key)"
            class="row"
            role="row"
            :aria-rowindex="presentationIndices.get(item.key)"
            :aria-level="table.grouped ? item.renderItem.row.depth + 1 : undefined"
            :style="{ transform: `translateY(${item.start}px)` }"
          >
            <div
              v-for="column in columns.items"
              :id="cellId(item.renderItem.rowIndex, column.index)"
              :key="column.key"
              class="cell"
              :class="{
                pinned: !!column.column.pinned,
                active: grid.isFocused({ row: item.renderItem.rowIndex, column: column.index }),
              }"
              role="gridcell"
              :aria-colindex="column.index + 1"
              aria-readonly="true"
              :style="{
                width: `${column.size}px`,
                transform: `translateX(${columnOffset(column)}px)`,
              }"
              @click="activate(item.renderItem.rowIndex, column.index)"
            >
              {{ item.renderItem.row.getDisplay(column.column.id) }}
            </div>
          </div>
          <div
            v-else-if="item.renderItem.kind === 'group'"
            :ref="(element) => measure(element, item.key)"
            class="row group-row"
            role="row"
            :aria-rowindex="presentationIndices.get(item.key)"
            :aria-level="item.renderItem.depth + 1"
            :aria-expanded="item.renderItem.isExpanded"
            :style="{ transform: `translateY(${item.start}px)` }"
          >
            <div role="gridcell" :aria-colspan="table.columns.length">
              <button
                type="button"
                :aria-expanded="item.renderItem.isExpanded"
                :style="{ transform: `translateX(${columns.offset}px)` }"
                @click="grid.toggleGroup(item.renderItem.key)"
              >
                {{ item.renderItem.isExpanded ? "Collapse" : "Expand" }}
                {{ item.renderItem.value }} ({{ item.renderItem.leafCount }} rows)
              </button>
            </div>
          </div>
        </template>
      </div>
      <div
        v-for="row in table.bottomRows"
        :key="row.key"
        class="total-row"
        role="row"
        :aria-rowindex="presentationCount"
        :aria-level="table.grouped ? 1 : undefined"
        :style="{ width: `${columns.totalSize}px` }"
      >
        <div
          v-for="column in columns.items"
          :id="cellId(table.gridRows.length - 1, column.index)"
          :key="column.key"
          class="cell"
          :class="{
            pinned: !!column.column.pinned,
            active: grid.isFocused({ row: table.gridRows.length - 1, column: column.index }),
          }"
          role="gridcell"
          aria-readonly="true"
          :aria-colindex="column.index + 1"
          :style="{ width: `${column.size}px`, transform: `translateX(${columnOffset(column)}px)` }"
          @click="activate(table.gridRows.length - 1, column.index)"
        >
          {{ row.getDisplay(column.column.id) }}
        </div>
      </div>
    </div>
    <p role="status">
      {{ rows.items.length }} render items and {{ columns.centerItems.length }} centre columns +
      {{ columns.pinnedStartItems.length + columns.pinnedEndItems.length }} pinned columns<span
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
.total-row {
  position: sticky;
  bottom: 0;
  height: 40px;
  z-index: 2;
  background: var(--vp-c-bg-soft);
  border-top: 1px solid var(--vp-c-border);
  font-weight: 600;
}
.total-row .cell {
  background: var(--vp-c-bg-soft);
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
.pinned {
  z-index: 1;
  background: var(--vp-c-bg-soft);
}
.pinned.active {
  background: color-mix(in srgb, var(--vp-c-brand-1) 15%, var(--vp-c-bg-soft));
}
.group-row {
  height: 48px;
  background: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vy-card-border);
}
.group-row button {
  height: 48px;
  border-radius: 0;
  font-weight: 600;
}
@media (max-width: 639px) {
  p {
    max-inline-size: 40ch;
  }
}
</style>
