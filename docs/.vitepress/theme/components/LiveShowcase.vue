<script setup lang="ts">
import { computed, ref, shallowRef } from "vue";
import { defineColumns, type TableState } from "vueye-table";

import { makeEmployees, type Employee } from "../data";
import { useEditLog } from "../edit-log";
import EditLog from "./EditLog.vue";
import StatePanel from "./StatePanel.vue";

type Tab = "table" | "grid";
type Density = "compact" | "comfortable" | "spacious";

interface Line {
  readonly id: number;
  readonly item: string;
  readonly quantity: number;
  readonly price: number;
}

const tabs: readonly { readonly id: Tab; readonly label: string }[] = [
  { id: "table", label: "Data table" },
  { id: "grid", label: "Spreadsheet" },
];
const tab = ref<Tab>("table");

function onTabKey(event: KeyboardEvent): void {
  if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") {
    return;
  }
  event.preventDefault();
  const index = tabs.findIndex((item) => item.id === tab.value);
  const next = tabs[(index + (event.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
  if (next) {
    tab.value = next.id;
    const target = event.currentTarget as HTMLElement;
    target.parentElement?.querySelector<HTMLElement>(`[data-tab="${next.id}"]`)?.focus();
  }
}

/* The data table, and the state it reports on every operation. */

const employees = makeEmployees(64);
const employeeColumns = defineColumns<Employee>([
  { id: "name", header: "Name", accessor: (row) => `${row.name.first} ${row.name.last}` },
  { id: "department" },
  { id: "salary", align: "end", format: (salary) => `$${salary.toLocaleString("en-US")}` },
  { id: "active", header: "Status", searchable: false },
]);

const initialState: TableState = {
  sorting: [],
  search: "",
  filters: {},
  pagination: { page: 1, pageSize: 5 },
  selection: [],
  expanded: [],
  hiddenColumns: [],
  columnOrder: [],
};
const tableState = shallowRef<TableState>(initialState);
const updates = ref(0);

function onStateChange(state: TableState): void {
  tableState.value = state;
  updates.value += 1;
}

/* The spreadsheet, over a frozen array that it can only replace, never change. */

const originalLines: readonly Line[] = Object.freeze(
  [
    { id: 1, item: "Mechanical keyboard", quantity: 2, price: 129 },
    { id: 2, item: "27-inch monitor", quantity: 1, price: 349.5 },
    { id: 3, item: "Support plan", quantity: 12, price: 15 },
    { id: 4, item: "USB-C cables", quantity: 6, price: 9.25 },
  ].map((line) => Object.freeze(line)),
);
const lineColumns = defineColumns<Line>([
  { id: "item", sortable: false },
  { id: "quantity", align: "end", sortable: false },
  { id: "price", align: "end", sortable: false, format: (price) => price.toFixed(2) },
  {
    id: "total",
    accessor: (line) => line.quantity * line.price,
    format: (total) => (total as number).toFixed(2),
    align: "end",
    sortable: false,
  },
]);
const {
  rows: lines,
  edits,
  arrays,
  csv,
  onData,
  onEdit,
  onExport,
} = useEditLog(
  originalLines,
  lineColumns.map((column) => column.id),
);

/* Theme controls: the styled layer is custom properties, so recoloring is a style binding. */

const accents = [
  {
    name: "Violet",
    swatch: "#a02de6",
    light: "#8a24c9",
    dark: "#9333ea",
    focusLight: "#a02de6",
    focusDark: "#c084fc",
  },
  {
    name: "Magenta",
    swatch: "#c9117f",
    light: "#c9117f",
    dark: "#c9117f",
    focusLight: "#c9117f",
    focusDark: "#ff7ac3",
  },
  {
    name: "Orange",
    swatch: "#e1583a",
    light: "#c2410c",
    dark: "#c2410c",
    focusLight: "#c2410c",
    focusDark: "#ff9a7a",
  },
  {
    name: "Blue",
    swatch: "#0c93df",
    light: "#0a6fb0",
    dark: "#0a6fb0",
    focusLight: "#0a6fb0",
    focusDark: "#5cc0ff",
  },
] as const;
const accentName = ref<(typeof accents)[number]["name"]>("Violet");
const densities: readonly Density[] = ["compact", "comfortable", "spacious"];
const density = ref<Density>("comfortable");

const themeStyle = computed(() => {
  const accent = accents.find((item) => item.name === accentName.value) ?? accents[0];
  return {
    "--vy-accent-light": accent.light,
    "--vy-accent-dark": accent.dark,
    "--vy-focus-light": accent.focusLight,
    "--vy-focus-dark": accent.focusDark,
  };
});
</script>

<template>
  <div class="vy-showcase vp-raw" data-grid-ignore :style="themeStyle">
    <div class="chrome">
      <span class="dots" aria-hidden="true"><i /><i /><i /></span>
      <div class="tabs" role="tablist" aria-label="Live demo">
        <button
          v-for="item in tabs"
          :id="`showcase-tab-${item.id}`"
          :key="item.id"
          type="button"
          role="tab"
          :data-tab="item.id"
          :aria-selected="tab === item.id"
          :aria-controls="`showcase-panel-${item.id}`"
          :tabindex="tab === item.id ? 0 : -1"
          @click="tab = item.id"
          @keydown="onTabKey"
        >
          {{ item.label }}
        </button>
      </div>
      <span class="live"><i aria-hidden="true" />Live, and rendered on the server</span>
    </div>

    <div
      v-show="tab === 'table'"
      id="showcase-panel-table"
      class="stage"
      role="tabpanel"
      aria-labelledby="showcase-tab-table"
    >
      <div class="main">
        <VueyeTable
          :data="employees"
          :columns="employeeColumns"
          :page-size-options="[5, 10, 20]"
          :density="density"
          search-placeholder="Search 64 people…"
          selectable
          striped
          @state-change="onStateChange"
        >
          <template #cell.active="{ value }">
            <span class="status" :class="{ away: !value }">{{ value ? "Active" : "Away" }}</span>
          </template>
        </VueyeTable>
      </div>
      <aside class="side" aria-label="Table state">
        <StatePanel label="@state-change" :value="tableState" :count="updates">
          Search, sort, select, or page. The whole state is plain data you can save, restore, or
          keep in the URL.
        </StatePanel>
      </aside>
    </div>

    <div
      v-show="tab === 'grid'"
      id="showcase-panel-grid"
      class="stage"
      role="tabpanel"
      aria-labelledby="showcase-tab-grid"
    >
      <div class="main">
        <VueyeGrid
          :data="lines"
          :columns="lineColumns"
          :density="density"
          label="Order lines"
          column-letters
          @update:data="onData"
          @edit="onEdit"
          @export="onExport"
        />
      </div>
      <aside class="side" aria-label="Edits">
        <EditLog :edits="edits" :arrays="arrays" :csv="csv" />
      </aside>
    </div>

    <div class="controls">
      <div class="control" role="group" aria-label="Accent color">
        <span class="control-label">Accent</span>
        <button
          v-for="accent in accents"
          :key="accent.name"
          type="button"
          class="swatch"
          :style="{ '--swatch': accent.swatch }"
          :aria-pressed="accentName === accent.name"
          :aria-label="accent.name"
          :title="accent.name"
          @click="accentName = accent.name"
        />
      </div>
      <div class="control" role="group" aria-label="Density">
        <span class="control-label">Density</span>
        <div class="segmented">
          <button
            v-for="option in densities"
            :key="option"
            type="button"
            :aria-pressed="density === option"
            @click="density = option"
          >
            {{ option }}
          </button>
        </div>
      </div>
      <span class="hint">
        Both are one custom property and one prop: <code>--vt-accent</code>, <code>density</code>.
      </span>
    </div>
  </div>
</template>

<style scoped>
.vy-showcase {
  position: relative;
  text-align: left;
  background: var(--vy-card);
  border: 1px solid var(--vy-card-border);
  border-radius: var(--vy-radius-lg);
  box-shadow: var(--vy-elevation);
  font-family: var(--vp-font-family-base);
  color: var(--vp-c-text-1);
}

.vy-showcase::before {
  content: "";
  position: absolute;
  inset: -1px;
  z-index: -1;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(
    140deg,
    rgb(160 45 230 / 0.7),
    rgb(201 17 127 / 0.25) 30%,
    transparent 55%,
    rgb(12 147 223 / 0.45)
  );
  mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  mask-composite: exclude;
}

.chrome {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--vy-card-border);
}

.dots {
  display: inline-flex;
  gap: 7px;
}

.dots i {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: var(--vp-c-default-soft);
}

.dots i:nth-child(1) {
  background: #e1583a;
}

.dots i:nth-child(2) {
  background: #f2b34a;
}

.dots i:nth-child(3) {
  background: #3dbb7b;
}

.tabs {
  display: inline-flex;
  padding: 3px;
  gap: 2px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vy-card-border);
  border-radius: 11px;
}

.tabs button {
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 550;
  color: var(--vp-c-text-2);
  border-radius: 8px;
  transition:
    color 0.2s,
    background-color 0.2s,
    box-shadow 0.2s;
}

.tabs button:hover {
  color: var(--vp-c-text-1);
}

.tabs button[aria-selected="true"] {
  color: var(--vp-c-text-1);
  background: var(--vy-card);
  box-shadow:
    0 1px 2px rgb(0 0 0 / 0.12),
    0 0 0 1px var(--vy-card-border);
}

.live {
  justify-self: end;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--vp-c-text-3);
}

.live i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #37d399;
  box-shadow: 0 0 0 0 rgb(55 211 153 / 0.5);
  animation: pulse 2.4s infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgb(55 211 153 / 0.45);
  }

  70% {
    box-shadow: 0 0 0 8px rgb(55 211 153 / 0);
  }

  100% {
    box-shadow: 0 0 0 0 rgb(55 211 153 / 0);
  }
}

.stage {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 372px;
  min-height: 430px;
}

.main {
  min-width: 0;
  padding: 18px;
}

.side {
  min-width: 0;
  border-left: 1px solid var(--vy-card-border);
  overflow: hidden;
  border-bottom-right-radius: 0;
}

.main :deep(.vt-surface) {
  box-shadow: none;
}

.status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 9px 2px 7px;
  font-size: 12px;
  font-weight: 550;
  color: #138a5b;
  background: rgb(55 211 153 / 0.12);
  border-radius: 999px;
}

.status::before {
  content: "";
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentcolor;
}

.status.away {
  color: var(--vp-c-text-2);
  background: var(--vp-c-default-soft);
}

.dark .status:not(.away) {
  color: #4fe0a8;
}

.controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 24px;
  padding: 12px 18px;
  border-top: 1px solid var(--vy-card-border);
  font-size: 13px;
}

.control {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.control-label {
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
}

.swatch {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--swatch);
  box-shadow:
    0 0 0 2px var(--vy-card),
    0 0 0 3px transparent;
  transition:
    box-shadow 0.2s,
    transform 0.2s var(--vy-ease);
}

.swatch:hover {
  transform: scale(1.1);
}

.swatch[aria-pressed="true"] {
  box-shadow:
    0 0 0 2px var(--vy-card),
    0 0 0 4px var(--swatch);
}

.segmented {
  display: inline-flex;
  padding: 2px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vy-card-border);
  border-radius: 9px;
}

.segmented button {
  padding: 3px 10px;
  font-size: 12.5px;
  color: var(--vp-c-text-2);
  text-transform: capitalize;
  border-radius: 7px;
}

.segmented button[aria-pressed="true"] {
  color: var(--vp-c-text-1);
  background: var(--vy-card);
  box-shadow: 0 0 0 1px var(--vy-card-border);
}

.hint {
  margin-left: auto;
  color: var(--vp-c-text-3);
}

.hint code {
  font-family: var(--vp-font-family-mono);
  white-space: nowrap;
  font-size: 12px;
  color: var(--vp-c-text-2);
}

@media (max-width: 959px) {
  .stage {
    grid-template-columns: minmax(0, 1fr);
    min-height: 0;
  }

  .side {
    height: 300px;
    border-left: 0;
    border-top: 1px solid var(--vy-card-border);
  }

  .hint {
    margin-left: 0;
  }
}

@media (max-width: 639px) {
  .chrome {
    grid-template-columns: auto 1fr;
  }

  .live {
    display: none;
  }

  .tabs {
    justify-self: end;
  }

  .main {
    padding: 12px;
  }
}
</style>
