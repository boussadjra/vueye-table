<script setup lang="ts">
/*
 * An orders admin screen on <VueyeTable>: KPI tiles over the filtered rows, status chips and a
 * date range driving column filters, custom cells, a detail drawer, and bulk actions.
 */
import { computed, nextTick, ref, shallowRef } from "vue";
import {
  createTable,
  defineColumns,
  useDataTable,
  type DataTableBinding,
  type RowKey,
} from "vueye-table";

import {
  STATUSES,
  TODAY,
  avatarTone,
  dayBefore,
  initials,
  itemCount,
  makeOrders,
  money,
  relativeDay,
  shortDate,
  type Order,
  type OrderStatus,
} from "./orders";

const orders = shallowRef<readonly Order[]>(makeOrders(240));

const statusLabel = (status: OrderStatus): string =>
  STATUSES.find((entry) => entry.id === status)?.label ?? status;

const columns = defineColumns<Order>([
  { id: "id", header: "Order", width: 96 },
  {
    id: "customer",
    header: "Customer",
    accessor: (order) => order.customer.name,
    minWidth: 220,
  },
  { id: "status", format: statusLabel, searchable: false },
  { id: "date", format: shortDate, searchable: false },
  { id: "channel", hidden: true },
  {
    id: "items",
    header: "Items",
    accessor: itemCount,
    align: "end",
    searchable: false,
  },
  { id: "total", align: "end", format: (total) => money(total), searchable: false },
]);

// ---- State the page owns, shared with the table through v-model ----
const search = ref("");
const filters = ref<Readonly<Record<string, unknown>>>({});
const selected = ref<readonly RowKey[]>([]);
const density = ref<"comfortable" | "compact">("comfortable");

type ExposedTable = { readonly table: DataTableBinding<unknown> };
const tableRef = ref<ExposedTable | null>(null);

// ---- KPI tiles: computed from the rows that pass the search and filters ----
// Before mount there is no table yet, and with no filters every order passes.
const visibleOrders = computed<readonly Order[]>(
  () =>
    (tableRef.value?.table.processedRows.map((row) => row.original) as Order[] | undefined) ??
    orders.value,
);

const kpis = computed(() => {
  const list = visibleOrders.value;
  const kept = list.filter((order) => order.status !== "refunded");
  const revenue = kept.reduce((sum, order) => sum + order.total, 0);
  const refunded = list.length - kept.length;
  return [
    {
      label: "Net revenue",
      value: money(revenue, true),
      note: `${kept.length} paid orders`,
    },
    {
      label: "Orders",
      value: list.length.toLocaleString("en-US"),
      note: `of ${orders.value.length} in the last 90 days`,
    },
    {
      label: "Average order",
      value: kept.length ? money(revenue / kept.length) : "—",
      note: `${kept.reduce((sum, order) => sum + itemCount(order), 0)} items sold`,
    },
    {
      label: "Refunded",
      value: list.length ? `${((refunded / list.length) * 100).toFixed(1)}%` : "—",
      note: `${refunded} ${refunded === 1 ? "order" : "orders"}`,
    },
  ];
});

// ---- Status chips: counts from a second, headless table that ignores the status filter ----
const counter = useDataTable<Order>({
  data: orders,
  columns,
  rowKey: "id",
  state: () => ({ search: search.value, filters: { ...filters.value, status: undefined } }),
});

const statusCounts = computed(() => {
  const counts: Record<string, number> = {};
  for (const row of counter.processedRows) {
    counts[row.original.status] = (counts[row.original.status] ?? 0) + 1;
  }
  return counts;
});

const activeStatus = computed<OrderStatus | "all">(() => {
  const value = filters.value["status"];
  return Array.isArray(value) && value.length === 1 ? (value[0] as OrderStatus) : "all";
});

function setStatus(status: OrderStatus | "all"): void {
  filters.value = { ...filters.value, status: status === "all" ? undefined : [status] };
}

// ---- Date range: a { min, max } filter on the order day ----
const range = computed(() => (filters.value["date"] ?? {}) as { min?: string; max?: string });
const EARLIEST = dayBefore(89);

function setRange(bound: "min" | "max", value: string): void {
  const next = { ...range.value, [bound]: value || undefined };
  filters.value = {
    ...filters.value,
    date: next.min || next.max ? next : undefined,
  };
}

function setPreset(days: number | undefined): void {
  filters.value = {
    ...filters.value,
    date: days === undefined ? undefined : { min: dayBefore(days - 1), max: TODAY },
  };
}

const presets = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "All", days: undefined },
] as const;

function isPreset(days: number | undefined): boolean {
  const { min, max } = range.value;
  if (days === undefined) {
    return !min && !max;
  }
  return min === dayBefore(days - 1) && max === TODAY;
}

const hasFilters = computed(
  () => search.value !== "" || Object.values(filters.value).some((value) => value !== undefined),
);

function clearFilters(): void {
  search.value = "";
  filters.value = {};
}

// ---- Bulk actions ----
const selectedSet = computed(() => new Set(selected.value));
const shippable = (order: Order): boolean => order.status === "pending" || order.status === "paid";
const shippableCount = computed(
  () => orders.value.filter((order) => selectedSet.value.has(order.id) && shippable(order)).length,
);

const notice = ref("");
let noticeTimer: ReturnType<typeof setTimeout> | undefined;
function announce(text: string): void {
  notice.value = text;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => (notice.value = ""), 3200);
}

/** Replace the array: the orders passed to the table are never mutated. */
function markShipped(ids: ReadonlySet<RowKey>): number {
  let changed = 0;
  orders.value = orders.value.map((order) => {
    if (!ids.has(order.id) || !shippable(order)) {
      return order;
    }
    changed += 1;
    return { ...order, status: "shipped" };
  });
  return changed;
}

function shipSelected(): void {
  const changed = markShipped(selectedSet.value);
  selected.value = [];
  announce(`${changed} ${changed === 1 ? "order" : "orders"} marked as shipped`);
}

function exportCsv(): void {
  const binding = tableRef.value?.table;
  if (!binding) {
    return;
  }
  const visibleColumns = binding.columns.map((column) => column.id);
  let csv: string;
  let count: number;
  if (selected.value.length > 0) {
    // Only the selected rows: a throwaway headless table over them exports with the same columns.
    const rows = orders.value.filter((order) => selectedSet.value.has(order.id));
    const scratch = createTable<Order>({ data: rows, columns, rowKey: "id" });
    csv = scratch.exportRows({ columns: visibleColumns });
    scratch.destroy();
    count = rows.length;
  } else {
    csv = binding.exportRows();
    count = binding.rowCount;
  }
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  link.download = `orders-${TODAY}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
  announce(`Exported ${count} ${count === 1 ? "order" : "orders"} as CSV`);
}

// ---- Detail drawer ----
const openId = ref<string | undefined>();
const active = computed(() => orders.value.find((order) => order.id === openId.value));
const closeButton = ref<HTMLButtonElement | null>(null);
let returnFocus: HTMLElement | null = null;

function openOrder(item: unknown): void {
  returnFocus = document.activeElement as HTMLElement | null;
  openId.value = (item as Order).id;
  void nextTick(() => closeButton.value?.focus());
}

function closeOrder(): void {
  openId.value = undefined;
  returnFocus?.focus();
}

function shipActive(): void {
  if (active.value) {
    markShipped(new Set([active.value.id]));
    announce(`${active.value.id} marked as shipped`);
  }
}

const subtotal = computed(() =>
  (active.value?.items ?? []).reduce((sum, item) => sum + item.price * item.quantity, 0),
);
</script>

<template>
  <div class="od" :data-density="density">
    <header class="od-head">
      <div>
        <p class="od-eyebrow">Northwind Supply · Admin</p>
        <h3 class="od-title">Orders</h3>
      </div>
      <div class="od-head-actions">
        <div class="od-segment" role="group" aria-label="Row density">
          <button
            type="button"
            :aria-pressed="density === 'comfortable'"
            @click="density = 'comfortable'"
          >
            Comfortable
          </button>
          <button type="button" :aria-pressed="density === 'compact'" @click="density = 'compact'">
            Compact
          </button>
        </div>
        <button type="button" class="od-btn" @click="exportCsv">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M8 2v8m0 0 3-3m-3 3L5 7M3 12.5h10" />
          </svg>
          Export {{ selected.length ? "selected" : "CSV" }}
        </button>
      </div>
    </header>

    <ul class="od-kpis" aria-label="Summary of the orders shown">
      <li v-for="kpi in kpis" :key="kpi.label" class="od-kpi">
        <span class="od-kpi-label">{{ kpi.label }}</span>
        <strong class="od-kpi-value">{{ kpi.value }}</strong>
        <span class="od-kpi-note">{{ kpi.note }}</span>
      </li>
    </ul>

    <div class="od-filters">
      <div class="od-chips" role="group" aria-label="Filter by status">
        <button
          type="button"
          class="od-chip"
          :aria-pressed="activeStatus === 'all'"
          @click="setStatus('all')"
        >
          All <span class="od-count">{{ counter.rowCount }}</span>
        </button>
        <button
          v-for="status in STATUSES"
          :key="status.id"
          type="button"
          class="od-chip"
          :data-status="status.id"
          :aria-pressed="activeStatus === status.id"
          @click="setStatus(status.id)"
        >
          <i class="od-dot" aria-hidden="true" />{{ status.label }}
          <span class="od-count">{{ statusCounts[status.id] ?? 0 }}</span>
        </button>
      </div>
      <fieldset class="od-range">
        <legend class="od-sr">Order date</legend>
        <label>
          <span>From</span>
          <input
            type="date"
            :min="EARLIEST"
            :max="range.max ?? TODAY"
            :value="range.min ?? ''"
            @change="setRange('min', ($event.target as HTMLInputElement).value)"
          />
        </label>
        <span class="od-range-sep" aria-hidden="true">→</span>
        <label>
          <span>To</span>
          <input
            type="date"
            :min="range.min ?? EARLIEST"
            :max="TODAY"
            :value="range.max ?? ''"
            @change="setRange('max', ($event.target as HTMLInputElement).value)"
          />
        </label>
        <div class="od-presets" role="group" aria-label="Date presets">
          <button
            v-for="preset in presets"
            :key="preset.label"
            type="button"
            :aria-pressed="isPreset(preset.days)"
            @click="setPreset(preset.days)"
          >
            {{ preset.label }}
          </button>
        </div>
      </fieldset>
    </div>

    <Transition name="od-bulk">
      <div v-if="selected.length" class="od-bulk" role="region" aria-label="Bulk actions">
        <span class="od-bulk-count">
          <strong>{{ selected.length }}</strong> selected
        </span>
        <span class="od-bulk-spacer" />
        <button
          type="button"
          class="od-btn od-btn-primary"
          :disabled="!shippableCount"
          @click="shipSelected"
        >
          Mark {{ shippableCount }} as shipped
        </button>
        <button type="button" class="od-btn" @click="exportCsv">Export CSV</button>
        <button type="button" class="od-btn od-btn-ghost" @click="selected = []">Clear</button>
      </div>
    </Transition>

    <VueyeTable
      ref="tableRef"
      v-model:selected="selected"
      v-model:filters="filters"
      v-model:search="search"
      class="od-table"
      :data="orders"
      :columns="columns"
      row-key="id"
      :row-can-expand="() => true"
      expand-mode="single"
      caption="Orders from the last 90 days"
      selectable
      sticky-header
      max-height="30rem"
      :density="density"
      :page-size="25"
      :page-size-options="[25, 50, 100]"
      search-placeholder="Search orders or customers…"
      @row-click="openOrder"
    >
      <template #expanded="{ row }">
        <div class="od-line-items">
          <table>
            <caption>
              Line items for
              {{
                (row.original as Order).id
              }}
            </caption>
            <thead>
              <tr>
                <th scope="col">Product</th>
                <th scope="col">Quantity</th>
                <th scope="col">Unit price</th>
                <th scope="col">Line total</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="line in (row.original as Order).items" :key="line.sku">
                <td>{{ line.name }}</td>
                <td>{{ line.quantity }}</td>
                <td>{{ money(line.price) }}</td>
                <td>{{ money(line.quantity * line.price) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
      <template #cell.id="{ item }">
        <button
          type="button"
          class="od-link"
          :aria-label="`Open order ${(item as Order).id}`"
          @click.stop="openOrder(item)"
        >
          {{ (item as Order).id }}
        </button>
      </template>
      <template #cell.customer="{ item }">
        <span class="od-customer">
          <span
            class="od-avatar"
            :data-tone="avatarTone((item as Order).customer.name)"
            aria-hidden="true"
          >
            {{ initials((item as Order).customer.name) }}
          </span>
          <span class="od-customer-text">
            <span class="od-customer-name">{{ (item as Order).customer.name }}</span>
            <span class="od-customer-email">{{ (item as Order).customer.email }}</span>
          </span>
        </span>
      </template>
      <template #cell.status="{ item, display }">
        <span class="od-pill" :data-status="(item as Order).status">
          <i class="od-dot" aria-hidden="true" />{{ display }}
        </span>
      </template>
      <template #cell.date="{ item, display }">
        <span class="od-date">
          <span>{{ relativeDay((item as Order).date) }}</span>
          <time :datetime="(item as Order).date">{{ display }}</time>
        </span>
      </template>
      <template #cell.items="{ value }">
        <span class="od-items">{{ value }}</span>
      </template>
      <template #cell.total="{ display }">
        <span class="od-money">{{ display }}</span>
      </template>
      <template #empty>
        <div class="od-empty">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 7h16M4 12h10M4 17h6" />
            <circle cx="17.5" cy="16.5" r="3" />
            <path d="m19.7 18.7 1.8 1.8" />
          </svg>
          <p><strong>No orders match</strong></p>
          <p>Try another status, a wider date range, or a different search.</p>
          <button v-if="hasFilters" type="button" class="od-btn" @click="clearFilters">
            Clear filters
          </button>
        </div>
      </template>
    </VueyeTable>

    <p class="od-toast" role="status" aria-live="polite">
      <span v-if="notice">{{ notice }}</span>
    </p>

    <Transition name="od-fade">
      <div v-if="active" class="od-backdrop" aria-hidden="true" @click="closeOrder" />
    </Transition>
    <Transition name="od-drawer">
      <div v-if="active" class="od-drawer-rail">
        <aside
          class="od-drawer"
          role="dialog"
          aria-modal="true"
          aria-labelledby="od-drawer-title"
          @keydown.esc="closeOrder"
        >
          <header class="od-drawer-head">
            <div>
              <p class="od-eyebrow">{{ shortDate(active.date) }} · {{ active.channel }}</p>
              <h4 id="od-drawer-title" class="od-drawer-title">Order {{ active.id }}</h4>
            </div>
            <button
              ref="closeButton"
              type="button"
              class="od-icon-btn"
              aria-label="Close"
              @click="closeOrder"
            >
              <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8" /></svg>
            </button>
          </header>

          <div class="od-drawer-body">
            <div class="od-drawer-status">
              <span class="od-pill" :data-status="active.status">
                <i class="od-dot" aria-hidden="true" />{{ statusLabel(active.status) }}
              </span>
              <span class="od-muted">{{ relativeDay(active.date) }}</span>
            </div>

            <section class="od-card">
              <span
                class="od-avatar od-avatar-lg"
                :data-tone="avatarTone(active.customer.name)"
                aria-hidden="true"
              >
                {{ initials(active.customer.name) }}
              </span>
              <span class="od-customer-text">
                <span class="od-customer-name">{{ active.customer.name }}</span>
                <span class="od-customer-email">{{ active.customer.email }}</span>
              </span>
            </section>

            <section>
              <h5 class="od-section-title">Items · {{ itemCount(active) }}</h5>
              <ul class="od-lines">
                <li v-for="line in active.items" :key="line.sku">
                  <span class="od-thumb" aria-hidden="true">{{ line.sku.slice(0, 2) }}</span>
                  <span class="od-line-text">
                    <span>{{ line.name }}</span>
                    <span class="od-muted"
                      >{{ line.sku }} · {{ line.quantity }} × {{ money(line.price) }}</span
                    >
                  </span>
                  <span class="od-money">{{ money(line.price * line.quantity) }}</span>
                </li>
              </ul>
            </section>

            <dl class="od-totals">
              <div>
                <dt>Subtotal</dt>
                <dd>{{ money(subtotal) }}</dd>
              </div>
              <div>
                <dt>Shipping</dt>
                <dd>{{ active.shipping ? money(active.shipping) : "Free" }}</dd>
              </div>
              <div class="od-grand">
                <dt>Total</dt>
                <dd>{{ money(active.total) }}</dd>
              </div>
            </dl>
          </div>

          <footer class="od-drawer-foot">
            <button type="button" class="od-btn od-btn-ghost" @click="closeOrder">Close</button>
            <button
              type="button"
              class="od-btn od-btn-primary"
              :disabled="!shippable(active)"
              @click="shipActive"
            >
              {{
                shippable(active)
                  ? "Mark as shipped"
                  : `Already ${statusLabel(active.status).toLowerCase()}`
              }}
            </button>
          </footer>
        </aside>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.od-line-items {
  padding: 16px 24px;
  overflow-x: auto;
}
.od-line-items table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.od-line-items caption {
  text-align: left;
  font-weight: 600;
  padding-bottom: 8px;
}
.od-line-items th,
.od-line-items td {
  text-align: left;
  padding: 8px;
  border-bottom: 1px solid var(--vp-c-divider);
  white-space: nowrap;
}
.od {
  --od-ink: var(--vp-c-text-1);
  --od-ink-2: var(--vp-c-text-2);
  --od-ink-3: var(--vp-c-text-3);
  --od-line: var(--vy-card-border);
  --od-surface: #ffffff;
  --od-raised: #faf9fd;
  --od-accent: #8a24c9;
  --od-focus: #a02de6;

  /* Status: text, dot, and tint per state. */
  --od-pending: #a1570b;
  --od-pending-dot: #f59e0b;
  --od-paid: #0b6fb0;
  --od-paid-dot: #0c93df;
  --od-shipped: #7a1fb3;
  --od-shipped-dot: #a02de6;
  --od-delivered: #177245;
  --od-delivered-dot: #22b36b;
  --od-refunded: #b0125f;
  --od-refunded-dot: #c9117f;

  position: relative;
  container-type: inline-size;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
  min-height: 520px;
  /* clip, not hidden: hidden would make this the scroll container of the sticky drawer panel. */
  overflow: clip;
  color: var(--od-ink);
  font-variant-numeric: tabular-nums;
}

.dark .od {
  --od-surface: #0f0e18;
  --od-raised: #13121e;
  --od-accent: #b35cf5;
  --od-focus: #c084fc;
  --od-pending: #fbbf5a;
  --od-paid: #6cc4fb;
  --od-shipped: #d6a2ff;
  --od-delivered: #5fdc9c;
  --od-refunded: #ff86c2;
}

.od-sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.od :is(button, input):focus-visible {
  outline: 2px solid var(--od-focus);
  outline-offset: 2px;
}

/* The table's search box draws its own ring on the whole field. */
.od-table :deep(.vt-search input:focus-visible) {
  outline: none;
}

/* ---- Head ---- */
.od-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}

.od-eyebrow {
  margin: 0;
  font-size: 12px;
  line-height: 1.4;
  letter-spacing: 0.02em;
  color: var(--od-ink-3);
}

.od-title {
  margin: 2px 0 0;
  padding: 0;
  border: 0;
  font-size: 26px;
  line-height: 1.15;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.od-head-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.od-segment {
  display: inline-flex;
  padding: 3px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--od-line);
  border-radius: 10px;
}

.od-segment button {
  padding: 4px 10px;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--od-ink-2);
  border-radius: 7px;
  transition:
    background 0.15s,
    color 0.15s;
}

.od-segment button[aria-pressed="true"] {
  color: var(--od-ink);
  background: var(--od-surface);
  box-shadow:
    0 1px 2px rgb(20 10 40 / 0.12),
    0 0 0 1px var(--od-line);
}

.od-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 34px;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 500;
  color: var(--od-ink);
  white-space: nowrap;
  background: var(--od-surface);
  border: 1px solid var(--od-line);
  border-radius: 10px;
  transition:
    background 0.15s,
    border-color 0.15s,
    opacity 0.15s;
}

.od-btn:hover:not(:disabled) {
  background: var(--od-raised);
  border-color: var(--vp-c-border);
}

.od-btn svg {
  width: 15px;
  height: 15px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.od-btn-primary {
  color: #ffffff;
  background: var(--vy-gradient-strong);
  border-color: transparent;
}

.od-btn-primary:hover:not(:disabled) {
  background: var(--vy-gradient-strong);
  border-color: transparent;
  filter: brightness(1.08);
}

.od-btn-ghost {
  background: transparent;
  border-color: transparent;
  color: var(--od-ink-2);
}

.od-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* ---- KPI tiles ---- */
.od-kpis {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

@container (min-width: 720px) {
  .od-kpis {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.od-kpi {
  position: relative;
  display: grid;
  gap: 2px;
  margin: 0;
  padding: 14px 16px 13px;
  overflow: hidden;
  background: linear-gradient(180deg, var(--od-raised), var(--od-surface));
  border: 1px solid var(--od-line);
  border-radius: 14px;
}

.od-kpi::before {
  content: "";
  position: absolute;
  inset: 0 0 auto;
  height: 2px;
  background: var(--vy-gradient);
  opacity: 0.75;
}

.od-kpi-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--od-ink-2);
}

.od-kpi-value {
  font-size: clamp(20px, 5cqi, 26px);
  font-weight: 600;
  line-height: 1.25;
  letter-spacing: -0.02em;
  color: var(--od-ink);
}

.od-kpi-note {
  font-size: 12px;
  color: var(--od-ink-3);
}

/* ---- Filters ---- */
.od-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px 16px;
}

.od-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.od-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 0 10px;
  font-size: 13px;
  font-weight: 500;
  color: var(--od-ink-2);
  background: var(--od-surface);
  border: 1px solid var(--od-line);
  border-radius: 999px;
  transition:
    background 0.15s,
    border-color 0.15s,
    color 0.15s;
}

.od-chip:hover {
  color: var(--od-ink);
  border-color: var(--vp-c-border);
}

.od-chip[aria-pressed="true"] {
  color: var(--od-ink);
  background: color-mix(in srgb, var(--od-accent) 10%, var(--od-surface));
  border-color: color-mix(in srgb, var(--od-accent) 55%, transparent);
}

.od-count {
  min-width: 22px;
  padding: 1px 6px;
  font-size: 11.5px;
  font-weight: 600;
  text-align: center;
  color: var(--od-ink-2);
  background: var(--vp-c-bg-soft);
  border-radius: 999px;
}

.od-chip[aria-pressed="true"] .od-count {
  color: #ffffff;
  background: var(--od-accent);
}

.dark .od-chip[aria-pressed="true"] .od-count {
  color: #14081f;
}

.od-range {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding: 0;
  border: 0;
}

.od-range label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 4px 0 10px;
  min-height: 32px;
  font-size: 12px;
  color: var(--od-ink-3);
  background: var(--od-surface);
  border: 1px solid var(--od-line);
  border-radius: 10px;
}

.od-range label:focus-within {
  border-color: var(--od-focus);
}

.od-range input {
  font: inherit;
  font-size: 13px;
  color: var(--od-ink);
  background: transparent;
  border: 0;
  color-scheme: light;
}

.dark .od-range input {
  color-scheme: dark;
}

.od-range input:focus-visible {
  outline: none;
}

.od-range-sep {
  color: var(--od-ink-3);
}

.od-presets {
  display: inline-flex;
  padding: 2px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--od-line);
  border-radius: 10px;
}

.od-presets button {
  padding: 3px 9px;
  font-size: 12px;
  font-weight: 500;
  color: var(--od-ink-2);
  border-radius: 7px;
}

.od-presets button[aria-pressed="true"] {
  color: var(--od-ink);
  background: var(--od-surface);
  box-shadow: 0 0 0 1px var(--od-line);
}

/* ---- Bulk bar ---- */
.od-bulk {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 8px 8px 8px 14px;
  background: color-mix(in srgb, var(--od-accent) 9%, var(--od-surface));
  border: 1px solid color-mix(in srgb, var(--od-accent) 35%, transparent);
  border-radius: 12px;
}

.od-bulk-count {
  font-size: 13px;
  color: var(--od-ink-2);
}

.od-bulk-count strong {
  color: var(--od-ink);
}

.od-bulk-spacer {
  flex: 1;
}

.od-bulk-enter-active,
.od-bulk-leave-active {
  transition:
    opacity 0.2s var(--vy-ease),
    transform 0.2s var(--vy-ease);
}

.od-bulk-enter-from,
.od-bulk-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* ---- Table cells ---- */
.od-table :deep(.vt-table tbody tr:not([data-empty])) {
  cursor: pointer;
}

.od-table :deep(.vt-table caption) {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}

.od-table :deep(.vt-table thead th) {
  font-size: 12px;
  letter-spacing: 0.01em;
}

.od-table :deep(.vt-table td) {
  white-space: nowrap;
}

.od-link {
  font-family: var(--vp-font-family-mono);
  font-size: 12.5px;
  font-weight: 500;
  color: var(--od-ink);
  border-radius: 4px;
}

.od-link:hover {
  color: var(--od-accent);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.od-customer,
.od-card {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.od-avatar {
  display: inline-grid;
  flex: none;
  place-items: center;
  width: 32px;
  height: 32px;
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: #ffffff;
  border-radius: 50%;
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.18);
  background: linear-gradient(135deg, #b04cf0, #8a24c9);
}

.od[data-density="compact"] .od-avatar {
  width: 24px;
  height: 24px;
  font-size: 9.5px;
}

.od-avatar[data-tone="1"] {
  background: linear-gradient(135deg, #e0409c, #b0127a);
}

.od-avatar[data-tone="2"] {
  background: linear-gradient(135deg, #f07a4f, #c2410c);
}

.od-avatar[data-tone="3"] {
  background: linear-gradient(135deg, #2aa8ee, #0b6fb0);
}

.od-avatar[data-tone="4"] {
  background: linear-gradient(135deg, #9a4cf0, #c9117f);
}

.od-avatar[data-tone="5"] {
  background: linear-gradient(135deg, #1fa37a, #0c6f8f);
}

.od-customer-text {
  display: grid;
  min-width: 0;
  line-height: 1.3;
}

.od-customer-name {
  font-weight: 500;
  color: var(--od-ink);
}

.od-customer-email {
  font-size: 12px;
  color: var(--od-ink-3);
  overflow: hidden;
  text-overflow: ellipsis;
}

.od[data-density="compact"] .od-customer .od-customer-text {
  display: flex;
  gap: 8px;
  align-items: baseline;
}

.od-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 9px 2px 8px;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.5;
  color: var(--od-pill);
  background: color-mix(in srgb, var(--od-pill-dot) 13%, transparent);
  border: 1px solid color-mix(in srgb, var(--od-pill-dot) 28%, transparent);
  border-radius: 999px;
}

.od-dot {
  flex: none;
  width: 6px;
  height: 6px;
  background: var(--od-pill-dot, var(--od-ink-3));
  border-radius: 50%;
}

[data-status="pending"] {
  --od-pill: var(--od-pending);
  --od-pill-dot: var(--od-pending-dot);
}

[data-status="paid"] {
  --od-pill: var(--od-paid);
  --od-pill-dot: var(--od-paid-dot);
}

[data-status="shipped"] {
  --od-pill: var(--od-shipped);
  --od-pill-dot: var(--od-shipped-dot);
}

[data-status="delivered"] {
  --od-pill: var(--od-delivered);
  --od-pill-dot: var(--od-delivered-dot);
}

[data-status="refunded"] {
  --od-pill: var(--od-refunded);
  --od-pill-dot: var(--od-refunded-dot);
}

.od-date {
  display: grid;
  line-height: 1.3;
}

.od-date time {
  font-size: 12px;
  color: var(--od-ink-3);
}

.od[data-density="compact"] .od-date {
  display: flex;
  gap: 8px;
  align-items: baseline;
}

.od-items {
  color: var(--od-ink-2);
}

.od-money {
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.od-empty {
  display: grid;
  justify-items: center;
  gap: 4px;
  padding: 36px 16px;
  text-align: center;
  color: var(--od-ink-3);
}

.od-empty svg {
  width: 36px;
  height: 36px;
  margin-bottom: 6px;
  padding: 8px;
  fill: none;
  stroke: var(--od-accent);
  stroke-width: 1.6;
  stroke-linecap: round;
  background: color-mix(in srgb, var(--od-accent) 12%, transparent);
  border-radius: 12px;
  box-sizing: content-box;
}

.od-empty p {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
}

.od-empty strong {
  color: var(--od-ink);
  font-size: 14px;
}

.od-empty .od-btn {
  margin-top: 10px;
}

/* ---- Toast ---- */
.od-toast {
  position: absolute;
  left: 50%;
  bottom: 16px;
  z-index: 8;
  margin: 0;
  transform: translateX(-50%);
  pointer-events: none;
}

.od-toast span {
  display: block;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  color: #ffffff;
  background: #1a1726;
  border-radius: 10px;
  box-shadow: 0 12px 30px -8px rgb(0 0 0 / 0.45);
}

.dark .od-toast span {
  color: #14121c;
  background: #edecf6;
}

/* ---- Drawer ---- */
.od-backdrop {
  position: absolute;
  inset: 0;
  z-index: 6;
  border-radius: 16px;
  background: rgb(20 12 35 / 0.28);
  backdrop-filter: blur(2px);
}

.dark .od-backdrop {
  background: rgb(0 0 0 / 0.5);
}

.od-drawer-rail {
  position: absolute;
  inset: 0 0 0 auto;
  z-index: 7;
  width: min(400px, 100%);
  pointer-events: none;
}

/* The panel sticks below the site's nav while the page scrolls past a long table. */
.od-drawer {
  position: sticky;
  top: calc(var(--vp-nav-height, 64px) + 12px);
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  max-height: min(100%, calc(100vh - var(--vp-nav-height, 64px) - 24px));
  pointer-events: auto;
  background: var(--od-surface);
  border: 1px solid var(--od-line);
  border-radius: 16px;
  box-shadow: 0 30px 60px -20px rgb(40 10 70 / 0.35);
}

.dark .od-drawer {
  box-shadow: 0 30px 60px -20px rgb(0 0 0 / 0.8);
}

/* Below 960px VitePress adds a second bar under the nav. */
@media (max-width: 959px) {
  .od-drawer {
    top: calc(var(--vp-nav-height, 64px) + 60px);
    max-height: min(100%, calc(100vh - var(--vp-nav-height, 64px) - 72px));
  }
}

.od-drawer-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 18px 14px;
  border-bottom: 1px solid var(--od-line);
}

.od-drawer-title {
  margin: 2px 0 0;
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.od-icon-btn {
  display: inline-grid;
  place-items: center;
  width: 32px;
  height: 32px;
  color: var(--od-ink-2);
  border: 1px solid var(--od-line);
  border-radius: 9px;
}

.od-icon-btn:hover {
  color: var(--od-ink);
  background: var(--od-raised);
}

.od-icon-btn svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
}

.od-drawer-body {
  display: grid;
  align-content: start;
  gap: 18px;
  padding: 16px 18px;
  overflow: auto;
}

.od-drawer-status {
  display: flex;
  align-items: center;
  gap: 10px;
}

.od-muted {
  font-size: 12px;
  color: var(--od-ink-3);
}

.od-card {
  padding: 12px;
  background: var(--od-raised);
  border: 1px solid var(--od-line);
  border-radius: 12px;
}

.od-avatar-lg {
  width: 40px;
  height: 40px;
  font-size: 13px;
}

.od-section-title {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--od-ink-3);
}

.od-lines {
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;
}

.od-lines li {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  padding: 10px 0;
  font-size: 13.5px;
  border-bottom: 1px dashed var(--od-line);
}

.od-thumb {
  display: inline-grid;
  flex: none;
  place-items: center;
  width: 36px;
  height: 36px;
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  font-weight: 600;
  color: var(--od-accent);
  background: color-mix(in srgb, var(--od-accent) 10%, var(--od-surface));
  border: 1px solid color-mix(in srgb, var(--od-accent) 20%, transparent);
  border-radius: 9px;
}

.od-line-text {
  display: grid;
  flex: 1;
  min-width: 0;
  line-height: 1.35;
}

.od-totals {
  display: grid;
  gap: 6px;
  margin: 0;
  font-size: 13.5px;
}

.od-totals div {
  display: flex;
  justify-content: space-between;
}

.od-totals dt {
  color: var(--od-ink-2);
}

.od-totals dd {
  margin: 0;
  font-weight: 500;
}

.od-totals .od-grand {
  margin-top: 4px;
  padding-top: 10px;
  font-size: 16px;
  border-top: 1px solid var(--od-line);
}

.od-totals .od-grand :is(dt, dd) {
  color: var(--od-ink);
  font-weight: 600;
}

.od-drawer-foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 18px;
  border-top: 1px solid var(--od-line);
}

.od-fade-enter-active,
.od-fade-leave-active {
  transition: opacity 0.2s;
}

.od-fade-enter-from,
.od-fade-leave-to {
  opacity: 0;
}

.od-drawer-enter-active,
.od-drawer-leave-active {
  pointer-events: none;
  transition:
    transform 0.28s var(--vy-ease),
    opacity 0.28s var(--vy-ease);
}

.od-drawer-enter-from,
.od-drawer-leave-to {
  opacity: 0;
  transform: translateX(24px);
}

@media (prefers-reduced-motion: reduce) {
  .od-drawer-enter-active,
  .od-drawer-leave-active,
  .od-bulk-enter-active,
  .od-bulk-leave-active {
    transition: opacity 0.01s;
  }
}
</style>
