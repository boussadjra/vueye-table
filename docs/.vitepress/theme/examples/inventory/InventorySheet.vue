<script setup lang="ts">
import { computed, ref, shallowRef } from "vue";
import { toA1, type CellChange, type DataTableBinding, type TableIssue } from "vueye-table";

import ChangeLog from "./ChangeLog.vue";
import {
  CATEGORIES,
  columns,
  formatMoney,
  inventory,
  stockStatus,
  stockValue,
  type Category,
  type ChangeEntry,
  type StockItem,
  type StockStatus,
} from "./inventory";

type Scope = Category | "All";

const rows = shallowRef<readonly StockItem[]>(inventory);
const category = ref<Scope>("All");
const grid = ref<{ readonly table: DataTableBinding<unknown> } | null>(null);

// The category filter is ordinary table state: an array keeps rows whose value is one of it.
const filters = computed(() => (category.value === "All" ? {} : { category: [category.value] }));

const inScope = computed(() =>
  category.value === "All"
    ? rows.value
    : rows.value.filter((row) => row.category === category.value),
);

// The summary is derived from the rows `v-model:data` hands back, so it follows every edit.
const summary = computed(() => {
  let value = 0;
  let units = 0;
  let low = 0;
  let out = 0;
  for (const item of inScope.value) {
    value += stockValue(item);
    units += item.onHand;
    const status = stockStatus(item);
    low += status === "Low" ? 1 : 0;
    out += status === "Out" ? 1 : 0;
  }
  return { value, units, low, out, skus: inScope.value.length };
});

const counts = computed(() => {
  const found: Record<Scope, number> = {
    All: rows.value.length,
    Audio: 0,
    Computing: 0,
    Home: 0,
    Outdoor: 0,
  };
  for (const item of rows.value) {
    found[item.category] += 1;
  }
  return found;
});

const scopes: readonly Scope[] = ["All", ...CATEGORIES];

// ---------------------------------------------------------------------------------------------
// A1 addresses. A cell is addressed by its place in what is shown: the row on the page and the
// column among the visible columns, which is what the grid's letters and row numbers show.

function addressOf(rowKey: unknown, columnId: string | undefined): string {
  const table = grid.value?.table;
  if (!table || columnId === undefined) {
    return "";
  }
  const row = table.rows.findIndex((candidate) => candidate.key === rowKey);
  const column = table.columns.findIndex((candidate) => candidate.id === columnId);
  return row < 0 || column < 0 ? "" : toA1({ row, column });
}

function headerOf(columnId: string | undefined): string {
  return (
    grid.value?.table.columns.find((column) => column.id === columnId)?.header ?? columnId ?? ""
  );
}

function itemOf(sku: unknown): StockItem | undefined {
  return rows.value.find((row) => row.sku === sku);
}

// ---------------------------------------------------------------------------------------------
// Rejected input, from `@edit-error`.

interface Rejection {
  readonly id: string;
  readonly reference: string;
  readonly column: string;
  readonly columnId: string;
  readonly sku: string;
  readonly product: string;
  readonly message: string;
}

const rejections = shallowRef<readonly Rejection[]>([]);

function onEditError(issues: readonly TableIssue[]): void {
  rejections.value = issues.map((issue, index) => ({
    id: `${String(issue.rowKey)}:${issue.column ?? ""}:${index}`,
    reference: addressOf(issue.rowKey, issue.column),
    column: headerOf(issue.column),
    columnId: issue.column ?? "",
    sku: String(issue.rowKey ?? ""),
    product: itemOf(issue.rowKey)?.name ?? "",
    message:
      issue.code === "read_only_cell"
        ? `${headerOf(issue.column)} is calculated from other columns and can't be typed over.`
        : issue.message,
  }));
}

// ---------------------------------------------------------------------------------------------
// Accepted edits, from `@edit`.

const entries = shallowRef<readonly ChangeEntry[]>([]);
const total = ref(0);
const exports = ref(0);
let sequence = 0;

function show(change: CellChange<unknown>, value: unknown): string {
  const column = grid.value?.table.columns.find((candidate) => candidate.id === change.column);
  return column ? column.format(value, change.row) : String(value ?? "");
}

function onEdit(changes: readonly CellChange<unknown>[]): void {
  total.value += changes.length;
  // A cell that now holds an accepted value is no longer in error.
  const fixed = new Set(changes.map((change) => `${String(change.rowKey)}:${change.column}`));
  rejections.value = rejections.value.filter((item) => !fixed.has(`${item.sku}:${item.columnId}`));
  const next = changes.map((change): ChangeEntry => {
    sequence += 1;
    const before = change.previous;
    const after = change.value;
    const delta =
      typeof before === "number" && typeof after === "number" && change.column !== "unitCost"
        ? {
            direction: after >= before ? ("up" as const) : ("down" as const),
            text: `${after >= before ? "+" : "−"}${Math.abs(after - before)}`,
          }
        : undefined;
    return {
      id: sequence,
      reference: addressOf(change.rowKey, change.column),
      sku: String(change.rowKey),
      product: (change.row as StockItem).name,
      column: headerOf(change.column),
      previous: show(change, before),
      value: show(change, after),
      delta,
    };
  });
  entries.value = [...next.toReversed(), ...entries.value].slice(0, 30);
}

// ---------------------------------------------------------------------------------------------
// Toolbar actions. The download is created inside the click handler, never during render, so the
// page renders the same on the server.

const canUndo = computed(() => grid.value?.table.canUndo ?? false);
const canRedo = computed(() => grid.value?.table.canRedo ?? false);

function download(): void {
  const table = grid.value?.table;
  if (!table) {
    return;
  }
  // Visible columns, every filtered row, each cell as its formatted text.
  const csv = table.exportRows();
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `inventory-${category.value.toLowerCase()}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
  exports.value += 1;
}

// ---------------------------------------------------------------------------------------------
// Cell rendering helpers for the `cell.<id>` slots.

function asItem(item: unknown): StockItem {
  return item as StockItem;
}

const STATUS_TONE: Record<StockStatus, string> = { "In stock": "ok", Low: "low", Out: "out" };

function toneOf(item: unknown): string {
  return STATUS_TONE[stockStatus(asItem(item))];
}

/** How full the bar is: the reorder point sits at 40% of the track. */
function fill(item: unknown): number {
  const { onHand, reorderPoint } = asItem(item);
  const scale = Math.max(1, reorderPoint) * 2.5;
  return Math.min(100, Math.round((onHand / scale) * 100));
}

const INITIALS: Record<Category, string> = {
  Audio: "Au",
  Computing: "Cp",
  Home: "Hm",
  Outdoor: "Od",
};
</script>

<template>
  <DemoFrame title="InventorySheet.vue">
    <div class="inventory">
      <section class="summary" aria-label="Stock summary" aria-live="polite">
        <div class="tile tile-value">
          <span class="tile-label">Stock value</span>
          <span class="tile-number">{{ formatMoney(summary.value) }}</span>
          <span class="tile-note">
            {{ summary.units.toLocaleString("en-US") }} units ·
            {{ category === "All" ? "all categories" : category }}
          </span>
        </div>
        <div class="tile">
          <span class="tile-label">SKUs</span>
          <span class="tile-number">{{ summary.skus }}</span>
          <span class="tile-note">across 3 warehouses</span>
        </div>
        <div class="tile" data-tone="low">
          <span class="tile-label"><i aria-hidden="true" />Low stock</span>
          <span class="tile-number">{{ summary.low }}</span>
          <span class="tile-note">at or under reorder point</span>
        </div>
        <div class="tile" data-tone="out">
          <span class="tile-label"><i aria-hidden="true" />Out of stock</span>
          <span class="tile-number">{{ summary.out }}</span>
          <span class="tile-note">nothing on hand</span>
        </div>
      </section>

      <div class="toolbar">
        <div class="segmented" role="group" aria-label="Category">
          <button
            v-for="scope in scopes"
            :key="scope"
            type="button"
            :aria-pressed="category === scope"
            @click="category = scope"
          >
            {{ scope }}<span class="segment-count">{{ counts[scope] }}</span>
          </button>
        </div>
        <div class="actions">
          <button type="button" class="ghost" :disabled="!canUndo" @click="grid?.table.undo()">
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M6 4 3 7l3 3M3.5 7H10a3 3 0 0 1 0 6H8" />
            </svg>
            Undo
          </button>
          <button type="button" class="ghost" :disabled="!canRedo" @click="grid?.table.redo()">
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="m10 4 3 3-3 3M12.5 7H6a3 3 0 0 0 0 6h2" />
            </svg>
            Redo
          </button>
          <button type="button" class="primary" @click="download">
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M8 2.5v8m-3.5-3.5L8 10.5 11.5 7M3 13.5h10" />
            </svg>
            Download CSV
          </button>
        </div>
      </div>

      <Transition name="issues">
        <section
          v-if="rejections.length > 0"
          class="issues"
          role="alert"
          aria-label="Rejected cells"
        >
          <header class="issues-head">
            <span class="issues-icon" aria-hidden="true">!</span>
            <span class="issues-title">
              {{ rejections.length }} {{ rejections.length === 1 ? "cell was" : "cells were" }} not
              changed
            </span>
            <button type="button" class="issues-dismiss" @click="rejections = []">Dismiss</button>
          </header>
          <ul>
            <li v-for="rejection in rejections.slice(0, 6)" :key="rejection.id">
              <span class="issue-ref">{{ rejection.reference || "—" }}</span>
              <span class="issue-where">
                <b>{{ rejection.column }}</b> · {{ rejection.product || rejection.sku }}
              </span>
              <span class="issue-message">{{ rejection.message }}</span>
            </li>
          </ul>
          <p v-if="rejections.length > 6" class="issues-more">
            and {{ rejections.length - 6 }} more. The rest of the paste was applied.
          </p>
        </section>
      </Transition>

      <VueyeGrid
        ref="grid"
        v-model:data="rows"
        :columns="columns"
        :filters="filters"
        :toolbar="false"
        row-key="sku"
        label="Inventory"
        column-letters
        sticky-header
        max-height="30rem"
        class="inventory-grid"
        @edit="onEdit"
        @edit-error="onEditError"
      >
        <template #cell.sku="{ value }">
          <span class="sku">{{ value }}</span>
        </template>
        <template #cell.name="{ item, value }">
          <span class="product">
            <span class="product-mark" :data-category="asItem(item).category" aria-hidden="true">
              {{ INITIALS[asItem(item).category] }}
            </span>
            <span class="product-name">{{ value }}</span>
          </span>
        </template>
        <template #cell.warehouse="{ value }">
          <span class="warehouse"><i :data-warehouse="value" aria-hidden="true" />{{ value }}</span>
        </template>
        <template #cell.onHand="{ item, display }">
          <span class="on-hand" :data-tone="toneOf(item)">
            <span class="meter" aria-hidden="true">
              <span class="meter-fill" :style="{ width: `${fill(item)}%` }" />
              <span class="meter-mark" />
            </span>
            <span class="qty">{{ display }}</span>
          </span>
        </template>
        <template #cell.reorderPoint="{ display }">
          <span class="num muted">{{ display }}</span>
        </template>
        <template #cell.unitCost="{ value }">
          <span class="num">{{ formatMoney(value as number) }}</span>
        </template>
        <template #cell.value="{ value }">
          <span class="num strong">{{ formatMoney(value as number) }}</span>
        </template>
        <template #cell.status="{ item, value }">
          <span class="pill" :data-tone="toneOf(item)"><i aria-hidden="true" />{{ value }}</span>
        </template>
      </VueyeGrid>

      <aside class="hints" aria-label="Keyboard shortcuts">
        <div class="hints-intro">
          <p class="hints-title">Works like a spreadsheet</p>
          <p>
            Copy a block from Excel or Google Sheets and paste it onto a cell: the range lands from
            that corner, each value goes through the column's parser, and bad cells are reported
            while the rest apply.
          </p>
        </div>
        <dl class="keys">
          <div>
            <dt><kbd>Enter</kbd><kbd>F2</kbd></dt>
            <dd>Edit, or just type</dd>
          </div>
          <div>
            <dt><kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd></dt>
            <dd>Move</dd>
          </div>
          <div>
            <dt><kbd>Shift</kbd><span>+</span><kbd>↓</kbd></dt>
            <dd>Extend the range</dd>
          </div>
          <div>
            <dt><kbd>⌘/Ctrl</kbd><span>+</span><kbd>C</kbd><kbd>V</kbd><kbd>X</kbd></dt>
            <dd>Copy, paste, cut</dd>
          </div>
          <div>
            <dt><kbd>Delete</kbd></dt>
            <dd>Clear the range</dd>
          </div>
          <div>
            <dt><kbd>⌘/Ctrl</kbd><span>+</span><kbd>Z</kbd><kbd>Y</kbd></dt>
            <dd>Undo, redo</dd>
          </div>
        </dl>
      </aside>
    </div>

    <template #side>
      <ChangeLog :entries="entries" :total="total" :exports="exports" />
    </template>
  </DemoFrame>
</template>

<style scoped>
.inventory {
  --inv-ok: #15803d;
  --inv-low: #b4461c;
  --inv-out: #c42b1c;
  --inv-surface: var(--vp-c-bg-soft);

  container-type: inline-size;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 14px;
  min-width: 0;
}

/* Keep the wide grid scrolling inside its surface instead of widening the demo. */
.inventory-grid {
  grid-template-columns: minmax(0, 1fr);
  min-width: 0;
}

.dark .inventory {
  --inv-ok: #5ee39a;
  --inv-low: #ffa071;
  --inv-out: #ff7f7f;
  --inv-surface: rgb(255 255 255 / 0.03);
}

/* Summary --------------------------------------------------------------------------------- */

.summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

@container (max-width: 479px) {
  .tile:not(.tile-value) .tile-note {
    display: none;
  }
}

@container (min-width: 620px) {
  .summary {
    grid-template-columns: 1.5fr repeat(3, minmax(0, 1fr));
  }
}

.tile {
  position: relative;
  display: grid;
  gap: 2px;
  padding: 12px 14px;
  overflow: hidden;
  background: var(--inv-surface);
  border: 1px solid var(--vy-card-border);
  border-radius: var(--vy-radius-md);
}

.tile-value {
  grid-column: 1 / -1;
  background:
    radial-gradient(140% 120% at 100% 0%, rgb(160 45 230 / 0.14), transparent 55%),
    radial-gradient(120% 120% at 0% 100%, rgb(225 88 58 / 0.1), transparent 60%), var(--inv-surface);
}

@container (min-width: 620px) {
  .tile-value {
    grid-column: auto;
  }
}

.tile-label {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  font-weight: 500;
  color: var(--vp-c-text-2);
}

.tile-label i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--tone);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--tone) 20%, transparent);
}

.tile[data-tone="low"] {
  --tone: var(--inv-low);
}

.tile[data-tone="out"] {
  --tone: var(--inv-out);
}

.tile-number {
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  color: var(--vp-c-text-1);
}

.tile[data-tone] .tile-number {
  color: var(--tone);
}

.tile-value .tile-number {
  background: var(--vy-gradient-strong);
  background-clip: text;
  color: transparent;
}

.dark .tile-value .tile-number {
  background: var(--vy-gradient);
  background-clip: text;
}

.tile-note {
  font-size: 12px;
  color: var(--vp-c-text-3);
  font-variant-numeric: tabular-nums;
}

/* Toolbar --------------------------------------------------------------------------------- */

.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.segmented {
  display: flex;
  max-width: 100%;
  padding: 3px;
  overflow-x: auto;
  background: var(--inv-surface);
  border: 1px solid var(--vy-card-border);
  border-radius: 11px;
  scrollbar-width: none;
}

.segmented button {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 6px;
  padding: 5px 11px;
  font-size: 13px;
  font-weight: 500;
  color: var(--vp-c-text-2);
  border-radius: 8px;
  transition:
    background 0.2s var(--vy-ease),
    color 0.2s var(--vy-ease);
}

.segmented button:hover {
  color: var(--vp-c-text-1);
}

.segmented button[aria-pressed="true"] {
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg);
  box-shadow:
    0 1px 2px rgb(19 18 26 / 0.08),
    0 0 0 1px var(--vy-card-border);
}

.dark .segmented button[aria-pressed="true"] {
  background: rgb(255 255 255 / 0.09);
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.08);
}

.segment-count {
  min-width: 18px;
  padding: 0 5px;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: var(--vp-c-text-3);
  background: var(--vp-c-default-soft);
  border-radius: 999px;
}

.segmented button[aria-pressed="true"] .segment-count {
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}

.actions {
  display: flex;
  gap: 6px;
}

.actions button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 9px;
  transition:
    opacity 0.2s,
    background 0.2s var(--vy-ease),
    transform 0.2s var(--vy-ease);
}

.actions svg {
  width: 15px;
  height: 15px;
  fill: none;
  stroke: currentcolor;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.ghost {
  color: var(--vp-c-text-1);
  background: var(--inv-surface);
  border: 1px solid var(--vy-card-border);
}

.ghost:hover:not(:disabled) {
  border-color: var(--vp-c-brand-1);
}

.ghost:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.primary {
  color: #fff;
  background: var(--vy-gradient-strong);
  box-shadow: 0 6px 18px -8px rgb(160 45 230 / 0.7);
}

.primary:hover {
  transform: translateY(-1px);
}

.segmented button:focus-visible,
.actions button:focus-visible,
.issues-dismiss:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}

/* Validation messages ---------------------------------------------------------------------- */

.issues {
  padding: 12px 14px;
  color: var(--vp-c-text-1);
  background: color-mix(in srgb, var(--inv-out) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--inv-out) 30%, transparent);
  border-radius: var(--vy-radius-md);
}

.issues-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.issues-icon {
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  background: var(--inv-out);
  border-radius: 50%;
}

.dark .issues-icon {
  color: #1a0c0c;
}

.issues-title {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
}

.issues-dismiss {
  padding: 3px 9px;
  font-size: 12px;
  color: var(--vp-c-text-2);
  border: 1px solid var(--vy-card-border);
  border-radius: 7px;
}

.issues-dismiss:hover {
  color: var(--vp-c-text-1);
}

.issues ul {
  display: grid;
  gap: 6px;
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
}

.issues li {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 2px 10px;
  align-items: baseline;
  font-size: 13px;
  line-height: 1.5;
}

.issue-ref {
  grid-row: span 2;
  min-width: 36px;
  padding: 1px 6px;
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  font-weight: 600;
  text-align: center;
  color: var(--inv-out);
  background: color-mix(in srgb, var(--inv-out) 12%, transparent);
  border-radius: 6px;
}

.issue-where {
  color: var(--vp-c-text-2);
}

.issue-where b {
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.issue-message {
  color: var(--vp-c-text-1);
}

@container (min-width: 720px) {
  .issues li {
    grid-template-columns: auto 220px minmax(0, 1fr);
  }

  .issue-ref {
    grid-row: auto;
  }
}

.issues-more {
  margin: 8px 0 0;
  font-size: 12.5px;
  color: var(--vp-c-text-2);
}

.issues-enter-active,
.issues-leave-active {
  transition:
    opacity 0.25s var(--vy-ease),
    transform 0.25s var(--vy-ease);
}

.issues-enter-from,
.issues-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* Grid cells ------------------------------------------------------------------------------ */

.inventory-grid :deep(.vt-grid td) {
  font-variant-numeric: tabular-nums;
}

.sku {
  font-family: var(--vp-font-family-mono);
  font-size: 12.5px;
  color: var(--vp-c-text-2);
}

.product {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  max-width: 100%;
  vertical-align: middle;
}

.product-mark {
  display: grid;
  flex: none;
  place-items: center;
  width: 24px;
  height: 24px;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: #fff;
  border-radius: 7px;
}

.product-mark[data-category="Audio"] {
  background: linear-gradient(135deg, #8a24c9, #c9117f);
}

.product-mark[data-category="Computing"] {
  background: linear-gradient(135deg, #0a6fb0, #6a2fd6);
}

.product-mark[data-category="Home"] {
  background: linear-gradient(135deg, #b0127a, #c2410c);
}

.product-mark[data-category="Outdoor"] {
  background: linear-gradient(135deg, #0f7a52, #0a6fb0);
}

.product-name {
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
}

.warehouse {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.warehouse i {
  width: 6px;
  height: 6px;
  border-radius: 2px;
  background: var(--vp-c-text-3);
}

.warehouse i[data-warehouse="Rotterdam"] {
  background: #e1583a;
}

.warehouse i[data-warehouse="Atlanta"] {
  background: #0c93df;
}

.warehouse i[data-warehouse="Singapore"] {
  background: #a02de6;
}

.num {
  font-variant-numeric: tabular-nums;
}

.num.muted {
  color: var(--vp-c-text-2);
}

.num.strong {
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.on-hand {
  --tone: var(--inv-ok);

  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  width: 100%;
}

.on-hand[data-tone="low"] {
  --tone: var(--inv-low);
}

.on-hand[data-tone="out"] {
  --tone: var(--inv-out);
}

.meter {
  position: relative;
  flex: none;
  width: 52px;
  height: 6px;
  background: color-mix(in srgb, var(--vp-c-text-3) 18%, transparent);
  border-radius: 999px;
}

.meter-fill {
  position: absolute;
  inset: 0 auto 0 0;
  background: var(--tone);
  border-radius: inherit;
  transition: width 0.4s var(--vy-ease);
}

.meter-mark {
  position: absolute;
  top: -3px;
  bottom: -3px;
  left: 40%;
  width: 2px;
  background: var(--vp-c-text-2);
  border-radius: 1px;
}

.qty {
  min-width: 34px;
  font-weight: 600;
  text-align: end;
  color: var(--vp-c-text-1);
}

.on-hand:not([data-tone="ok"]) .qty {
  padding: 0 7px;
  color: var(--tone);
  background: color-mix(in srgb, var(--tone) 13%, transparent);
  border-radius: 6px;
}

.pill {
  --tone: var(--inv-ok);

  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 9px 2px 7px;
  font-size: 12px;
  font-weight: 600;
  color: var(--tone);
  background: color-mix(in srgb, var(--tone) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--tone) 24%, transparent);
  border-radius: 999px;
}

.pill[data-tone="low"] {
  --tone: var(--inv-low);
}

.pill[data-tone="out"] {
  --tone: var(--inv-out);
}

.pill i {
  width: 6px;
  height: 6px;
  background: currentcolor;
  border-radius: 50%;
}

/* Hints ----------------------------------------------------------------------------------- */

.hints {
  display: grid;
  gap: 14px;
  padding: 14px 16px;
  background:
    linear-gradient(var(--inv-surface), var(--inv-surface)),
    repeating-linear-gradient(0deg, var(--vy-grid-line) 0 1px, transparent 1px 26px);
  border: 1px dashed var(--vy-card-border);
  border-radius: var(--vy-radius-md);
}

@container (min-width: 760px) {
  .hints {
    grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.4fr);
    align-items: start;
  }
}

.hints p {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--vp-c-text-2);
}

.hints .hints-title {
  margin-bottom: 4px;
  font-family: var(--vy-font-serif);
  font-size: 19px;
  font-style: italic;
  color: var(--vp-c-text-1);
}

.keys {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 8px 16px;
  margin: 0;
}

.keys div {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.keys dt {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 12px;
  color: var(--vp-c-text-3);
}

.keys dd {
  margin: 0;
  font-size: 12.5px;
  color: var(--vp-c-text-2);
}

kbd {
  display: inline-block;
  min-width: 22px;
  padding: 1px 6px;
  font-family: var(--vp-font-family-mono);
  font-size: 11.5px;
  line-height: 1.5;
  text-align: center;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-border);
  border-bottom-width: 2px;
  border-radius: 6px;
}
</style>
