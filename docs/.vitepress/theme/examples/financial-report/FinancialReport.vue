<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  defineColumns,
  provideDataTable,
  useDataTable,
  VtEmpty,
  VtHeader,
  VtSearch,
  VtTable,
  type TableRow,
} from "vueye-table";

import CostLineRow from "./CostLineRow.vue";
import { DEPARTMENTS, REGIONS, makeCostLines, type CostLine, type Region } from "./data";
import { DEPARTMENT_HUE, REGION_CODE, UNITS, money, percent, signed, type Unit } from "./format";
import { MEASURES, groupRows, totalsOf, type GroupBy } from "./grouping";
import SummaryCells from "./SummaryCells.vue";

/* Columns are rebuilt when the unit changes; the table follows them and keeps its state. */

const unit = ref<Unit>("k");
const amount = (value: number): string => money(value, unit.value);
const fullYear = (line: CostLine): number => line.q1 + line.q2 + line.q3 + line.q4;

const columns = computed(() => {
  const as = unit.value;
  const format = (value: number): string => money(value, as);
  return defineColumns<CostLine>([
    { id: "item", header: "Line item" },
    { id: "department" },
    { id: "region" },
    { id: "q1", header: "Q1", align: "end", searchable: false, format },
    { id: "q2", header: "Q2", align: "end", searchable: false, format },
    { id: "q3", header: "Q3", align: "end", searchable: false, format },
    { id: "q4", header: "Q4", align: "end", searchable: false, format },
    { id: "fy", header: "FY total", accessor: fullYear, align: "end", searchable: false, format },
    { id: "budget", align: "end", searchable: false, format },
    {
      id: "variance",
      accessor: (line) => line.budget - fullYear(line),
      align: "end",
      searchable: false,
      format: (value: number) => signed(value, as),
      // This column's own filter values: "over" or "under" budget.
      filter: (value: number, wanted) =>
        wanted === "over" ? value < 0 : wanted === "under" ? value >= 0 : true,
    },
    {
      id: "variancePct",
      header: "Var %",
      accessor: (line) => (line.budget === 0 ? 0 : (line.budget - fullYear(line)) / line.budget),
      align: "end",
      searchable: false,
      format: percent,
    },
  ]);
});

const table = useDataTable<CostLine>({
  data: makeCostLines(),
  columns,
  rowKey: "id",
  // One page holds every line, so grouping sees the whole filtered set.
  // The grouped column starts hidden: its value is already in each group's header.
  initialState: { pagination: { page: 1, pageSize: 500 }, hiddenColumns: ["region"] },
});
// The search box sits outside the table element, so provide the table to it here.
provideDataTable(table);

/* Budget columns: plain column visibility. */

const BUDGET_COLUMNS = ["budget", "variance", "variancePct"] as const;
const showBudget = computed(() => !table.state.hiddenColumns.includes("budget"));
function toggleBudget(): void {
  const visible = !showBudget.value;
  for (const id of BUDGET_COLUMNS) {
    table.toggleColumn(id, visible);
  }
}

/* Filters: a one-of filter on region, and the variance column's own filter. */

const selectedRegions = computed(
  () => (table.state.filters["region"] as readonly Region[] | undefined) ?? [],
);
function toggleRegion(region: Region): void {
  const current = selectedRegions.value;
  table.filter(
    "region",
    current.includes(region) ? current.filter((item) => item !== region) : [...current, region],
  );
}

type BudgetFilter = "all" | "over" | "under";
const budgetFilters: readonly { readonly id: BudgetFilter; readonly label: string }[] = [
  { id: "all", label: "All lines" },
  { id: "over", label: "Over budget" },
  { id: "under", label: "On or under" },
];
const budgetFilter = computed(
  () => (table.state.filters["variance"] as BudgetFilter | undefined) ?? "all",
);
function setBudgetFilter(value: BudgetFilter): void {
  table.filter("variance", value === "all" ? undefined : value);
}

const narrowed = computed(
  () => table.state.search !== "" || Object.keys(table.state.filters).length > 0,
);
function clearAll(): void {
  table.search("");
  table.clearFilters();
}

/* Grouping, composed over the rows the engine has already searched, filtered, and sorted. */

const groupOptions: readonly { readonly id: GroupBy; readonly label: string }[] = [
  { id: "region", label: "Region" },
  { id: "department", label: "Department" },
  { id: "none", label: "None" },
];
const groupBy = ref<GroupBy>("region");
// The column being grouped by moves into the group headers; the other one comes back.
watch(groupBy, (next, previous) => {
  if (previous !== "none") {
    table.toggleColumn(previous, true);
  }
  if (next !== "none") {
    table.toggleColumn(next, false);
  }
});
const groups = computed(() =>
  groupBy.value === "none"
    ? []
    : groupRows(table.processedRows, groupBy.value, table.state.sorting),
);
const grand = computed(() => totalsOf(table.processedRows));

const collapsed = ref<readonly string[]>([]);
const collapseKey = (key: string): string => `${groupBy.value}:${key}`;
const isCollapsed = (key: string): boolean => collapsed.value.includes(collapseKey(key));
function toggleGroup(key: string): void {
  const id = collapseKey(key);
  collapsed.value = collapsed.value.includes(id)
    ? collapsed.value.filter((item) => item !== id)
    : [...collapsed.value, id];
}
function setAll(open: boolean): void {
  const keys: readonly string[] = groupBy.value === "department" ? DEPARTMENTS : REGIONS;
  const ids = keys.map(collapseKey);
  const others = collapsed.value.filter((id) => !ids.includes(id));
  collapsed.value = open ? others : [...others, ...ids];
}
const allOpen = computed(() => groups.value.every((group) => !isCollapsed(group.key)));
const allClosed = computed(() => groups.value.every((group) => isCollapsed(group.key)));

/* Subtotals line up under whichever columns are visible: the label spans the text columns. */

const SUMMED: readonly string[] = [...MEASURES, "variancePct"];
const labelSpan = computed(() => {
  const first = table.columns.findIndex((column) => SUMMED.includes(column.id));
  return first <= 0 ? table.columns.length : first;
});

/* The chart strip: quarterly actuals against an even quarterly share of the budget. */

const chart = computed(() => {
  const totals = grand.value;
  const runRate = totals.budget / 4;
  const values = [totals.q1, totals.q2, totals.q3, totals.q4];
  const top = Math.max(runRate, ...values) * 1.08 || 1;
  return {
    runRate,
    runRateAt: (runRate / top) * 100,
    bars: values.map((value, index) => ({
      label: `Q${index + 1}`,
      value,
      height: (value / top) * 100,
      // Where the run-rate crosses the bar, as a share of the bar's own height.
      within: value > runRate ? (runRate / value) * 100 : 100,
      over: value > runRate,
    })),
  };
});

const varianceOf = (row: TableRow<CostLine>): number => Number(row.getValue("variance") ?? 0);
const worstLine = computed(() => {
  let worst: TableRow<CostLine> | undefined;
  for (const row of table.processedRows) {
    if (!worst || varianceOf(row) < varianceOf(worst)) {
      worst = row;
    }
  }
  return worst && varianceOf(worst) < 0 ? worst : undefined;
});
</script>

<template>
  <div class="fin fin-report">
    <header class="fin-head">
      <div class="fin-title">
        <p class="fin-eyebrow">Operating expenses · FY2026</p>
        <p class="fin-heading">Budget <em>vs.</em> actual</p>
      </div>
      <div class="segmented fin-units" role="group" aria-label="Units">
        <button
          v-for="option in UNITS"
          :key="option.id"
          type="button"
          class="seg"
          :aria-pressed="unit === option.id"
          :title="option.name"
          :aria-label="option.name"
          @click="unit = option.id"
        >
          {{ option.label }}
        </button>
      </div>
    </header>

    <section class="fin-summary" aria-label="Summary of the lines shown">
      <div class="kpis">
        <div class="kpi">
          <span class="kpi-label">Actual spend</span>
          <strong class="kpi-value">{{ amount(grand.fy) }}</strong>
          <span class="kpi-note">{{ grand.count }} of {{ table.totalRowCount }} lines</span>
        </div>
        <div class="kpi">
          <span class="kpi-label">Budget</span>
          <strong class="kpi-value">{{ amount(grand.budget) }}</strong>
          <span class="kpi-note">{{ amount(chart.runRate) }} per quarter</span>
        </div>
        <div v-if="grand.count === 0" class="kpi">
          <span class="kpi-label">Variance</span>
          <strong class="kpi-value">—</strong>
          <span class="kpi-note">No lines shown</span>
        </div>
        <div v-else class="kpi" :data-tone="grand.variance < 0 ? 'neg' : 'pos'">
          <span class="kpi-label">Variance</span>
          <strong class="kpi-value tone">{{ signed(grand.variance, unit) }}</strong>
          <span class="pill tone">
            <span aria-hidden="true">{{ grand.variance < 0 ? "▼" : "▲" }}</span>
            {{ Math.abs(grand.variancePct * 100).toFixed(1) }}%
            {{ grand.variance < 0 ? "over budget" : "under budget" }}
          </span>
        </div>
        <div class="kpi" :data-tone="worstLine ? 'neg' : undefined">
          <span class="kpi-label">Largest overrun</span>
          <template v-if="worstLine">
            <strong class="kpi-value small" :title="worstLine.original.item">{{
              worstLine.original.item
            }}</strong>
            <span class="kpi-note">
              {{ worstLine.original.department }} · {{ REGION_CODE[worstLine.original.region] }} ·
              <span class="tone nowrap">{{ signed(varianceOf(worstLine), unit) }}</span>
            </span>
          </template>
          <template v-else>
            <strong class="kpi-value small">None</strong>
            <span class="kpi-note">{{
              grand.count === 0 ? "No lines shown" : "Every line shown is within budget"
            }}</span>
          </template>
        </div>
      </div>

      <figure class="chart" aria-labelledby="fin-chart-title">
        <figcaption>
          <span id="fin-chart-title" class="chart-title">Quarterly actuals, lines shown</span>
          <span class="legend" aria-hidden="true">
            <span><i class="key key-actual" />Actual</span>
            <span><i class="key key-over" />Above run-rate</span>
            <span><i class="key key-rate" />Budget ÷ 4</span>
          </span>
        </figcaption>
        <div class="plot" :data-empty="grand.count === 0 ? '' : undefined">
          <div class="plot-area">
            <div class="rate" :style="{ bottom: `${chart.runRateAt}%` }" aria-hidden="true" />
            <div
              v-for="bar in chart.bars"
              :key="bar.label"
              class="bar-col"
              role="img"
              :aria-label="`${bar.label}: ${amount(bar.value)}${bar.over ? ', above the budget run-rate' : ''}`"
            >
              <div class="bar" :style="{ height: `${bar.height}%` }">
                <span class="bar-value">{{ amount(bar.value) }}</span>
                <i v-if="bar.over" class="bar-over" :style="{ bottom: `${bar.within}%` }" />
              </div>
            </div>
          </div>
          <div class="plot-axis" aria-hidden="true">
            <span v-for="bar in chart.bars" :key="bar.label">{{ bar.label }}</span>
          </div>
          <p v-if="grand.count === 0" class="plot-empty">No lines to chart</p>
        </div>
      </figure>
    </section>

    <div class="fin-controls">
      <VtSearch placeholder="Search line items, departments, regions…" label="Search cost lines" />
      <div class="chips" role="group" aria-label="Regions">
        <button
          v-for="region in REGIONS"
          :key="region"
          type="button"
          class="chip"
          :aria-pressed="selectedRegions.includes(region)"
          @click="toggleRegion(region)"
        >
          <span class="code" aria-hidden="true">{{ REGION_CODE[region] }}</span
          >{{ region }}
        </button>
      </div>
      <div class="segmented" role="group" aria-label="Budget status">
        <button
          v-for="option in budgetFilters"
          :key="option.id"
          type="button"
          class="seg"
          :aria-pressed="budgetFilter === option.id"
          @click="setBudgetFilter(option.id)"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <div class="fin-controls secondary">
      <div class="labeled">
        <span id="fin-group-label" class="control-label">Group by</span>
        <div class="segmented" role="group" aria-labelledby="fin-group-label">
          <button
            v-for="option in groupOptions"
            :key="option.id"
            type="button"
            class="seg"
            :aria-pressed="groupBy === option.id"
            @click="groupBy = option.id"
          >
            {{ option.label }}
          </button>
        </div>
      </div>
      <div v-if="groupBy !== 'none'" class="expanders">
        <button type="button" class="ghost" :disabled="allOpen" @click="setAll(true)">
          Expand all
        </button>
        <button type="button" class="ghost" :disabled="allClosed" @click="setAll(false)">
          Collapse all
        </button>
      </div>
      <span class="spacer" />
      <button
        type="button"
        role="switch"
        class="switch"
        :aria-checked="showBudget"
        @click="toggleBudget"
      >
        <span class="track" aria-hidden="true"><span class="thumb" /></span>
        Show budget columns
      </button>
    </div>

    <VtTable :table="table" class="fin-table" density="compact" sticky-header>
      <VtHeader />
      <tbody v-if="table.rowCount === 0" class="vt-body">
        <tr data-empty>
          <td :colspan="table.columns.length">
            <VtEmpty>
              <span>No cost lines match this search and these filters.</span>
              <button type="button" class="ghost" @click="clearAll">
                Clear search and filters
              </button>
            </VtEmpty>
          </td>
        </tr>
      </tbody>
      <tbody v-else-if="groupBy === 'none'" class="vt-body">
        <CostLineRow
          v-for="row in table.processedRows"
          :key="row.key"
          :row="row"
          :columns="table.columns"
          :amount="amount"
        />
      </tbody>
      <template v-else>
        <!-- One tbody per group, so its header cell can use scope="rowgroup". -->
        <tbody
          v-for="group in groups"
          :key="group.key"
          class="vt-body group-body"
          :data-collapsed="isCollapsed(group.key) ? '' : undefined"
        >
          <tr class="group">
            <SummaryCells
              :columns="table.columns"
              :span="labelSpan"
              :totals="group.totals"
              :amount="amount"
              scope="rowgroup"
            >
              <button
                type="button"
                class="group-toggle"
                :aria-expanded="!isCollapsed(group.key)"
                @click="toggleGroup(group.key)"
              >
                <svg class="chevron" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                  <path
                    d="M6 4l4 4-4 4"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                <span
                  v-if="groupBy === 'department'"
                  class="dept"
                  :data-hue="DEPARTMENT_HUE[group.key]"
                  ><i aria-hidden="true"
                /></span>
                <span v-else class="code" aria-hidden="true">{{ REGION_CODE[group.key] }}</span>
                <span class="group-name">{{ group.label }}</span>
                <span class="count"
                  >{{ group.totals.count }} {{ group.totals.count === 1 ? "line" : "lines" }}</span
                >
              </button>
            </SummaryCells>
          </tr>
          <template v-if="!isCollapsed(group.key)">
            <CostLineRow
              v-for="row in group.rows"
              :key="row.key"
              :row="row"
              :columns="table.columns"
              :amount="amount"
            />
          </template>
        </tbody>
      </template>
      <tfoot v-if="table.rowCount > 0" class="grand">
        <tr>
          <SummaryCells
            :columns="table.columns"
            :span="labelSpan"
            :totals="grand"
            :amount="amount"
            scope="row"
            ledger
          >
            Grand total
            <span class="count">{{ grand.count }} {{ grand.count === 1 ? "line" : "lines" }}</span>
          </SummaryCells>
        </tr>
      </tfoot>
    </VtTable>

    <footer class="fin-foot">
      <p class="vt-status" role="status">
        Showing {{ table.rowCount }} of {{ table.totalRowCount }} lines<span
          v-if="groupBy !== 'none' && groups.length > 0"
        >
          in {{ groups.length }} {{ groupBy === "region" ? "regions" : "departments" }}</span
        >
      </p>
      <button v-if="narrowed" type="button" class="ghost" @click="clearAll">
        Clear search and filters
      </button>
      <p class="fin-note">
        Variance is budget minus actual: <span class="tone-pos">▲ under budget</span>,
        <span class="tone-neg">▼ over budget</span>.
      </p>
    </footer>
  </div>
</template>

<style scoped>
.fin {
  --fin-pos: #0f7a4d;
  --fin-pos-soft: rgb(15 122 77 / 0.1);
  --fin-neg: #c42b1c;
  --fin-neg-soft: rgb(196 43 28 / 0.09);
  --fin-bar: linear-gradient(180deg, #b04cf0 0%, #8a24c9 100%);
  --fin-over: linear-gradient(180deg, #ef6a45 0%, #d7208f 100%);
  --fin-rate: #55526a;
  --fin-surface: var(--vp-c-bg-alt);
  --fin-line: var(--vy-card-border);
  --fin-hue-violet: #a02de6;
  --fin-hue-blue: #0c93df;
  --fin-hue-magenta: #c9117f;
  --fin-hue-teal: #0f9d8f;
  --fin-hue-orange: #e1583a;

  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 14px;
  min-width: 0;
  container-type: inline-size;
  font-variant-numeric: tabular-nums;
}

.dark .fin {
  --fin-pos: #4ade9a;
  --fin-pos-soft: rgb(74 222 154 / 0.12);
  --fin-neg: #ff8a7a;
  --fin-neg-soft: rgb(255 138 122 / 0.12);
  --fin-rate: #c9c6da;
  --fin-surface: #13121e;
}

/* Header */

.fin-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}

.fin-eyebrow {
  margin: 0;
  font-family: var(--vp-font-family-mono);
  font-size: 11.5px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
}

.fin-heading {
  margin: 2px 0 0;
  padding: 0;
  border: 0;
  font-size: 22px;
  font-weight: 650;
  letter-spacing: -0.02em;
  line-height: 1.2;
  color: var(--vp-c-text-1);
}

.fin-title em {
  font-family: var(--vy-font-serif);
  font-style: italic;
  font-weight: 400;
  font-size: 1.12em;
  background: var(--vy-gradient);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

/* Segmented controls, chips, and buttons */

.segmented {
  display: inline-flex;
  padding: 3px;
  gap: 2px;
  background: var(--fin-surface);
  border: 1px solid var(--fin-line);
  border-radius: 10px;
}

.seg {
  padding: 4px 11px;
  min-height: 28px;
  font-size: 13px;
  font-weight: 500;
  color: var(--vp-c-text-2);
  border-radius: 7px;
  white-space: nowrap;
  transition:
    background 0.15s,
    color 0.15s;
}

.seg:hover {
  color: var(--vp-c-text-1);
}

.seg[aria-pressed="true"] {
  color: var(--vp-c-text-1);
  background: var(--vy-card);
  box-shadow:
    0 1px 2px rgb(19 18 26 / 0.12),
    0 0 0 1px var(--fin-line);
}

.dark .seg[aria-pressed="true"] {
  background: #221f33;
  box-shadow: 0 0 0 1px #34304a;
}

.fin-units .seg {
  min-width: 40px;
  font-family: var(--vp-font-family-mono);
  font-size: 12.5px;
}

.chips {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 32px;
  padding: 3px 11px 3px 5px;
  font-size: 13px;
  color: var(--vp-c-text-2);
  background: var(--vy-card);
  border: 1px solid var(--fin-line);
  border-radius: 999px;
  transition:
    border-color 0.15s,
    background 0.15s,
    color 0.15s;
}

.chip:hover {
  color: var(--vp-c-text-1);
  border-color: var(--vp-c-border);
}

.chip[aria-pressed="true"] {
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  border-color: color-mix(in srgb, var(--vp-c-brand-1) 45%, transparent);
}

.code {
  display: inline-grid;
  place-items: center;
  min-width: 24px;
  height: 20px;
  padding: 0 4px;
  font-family: var(--vp-font-family-mono);
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--fin-line);
  border-radius: 6px;
}

.chip[aria-pressed="true"] .code {
  color: #fff;
  background: var(--vy-gradient-strong);
  border-color: transparent;
}

.ghost {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 3px 10px;
  font-size: 13px;
  font-weight: 500;
  color: var(--vp-c-brand-1);
  border-radius: 8px;
}

.ghost:hover:not(:disabled) {
  background: var(--vp-c-brand-soft);
}

.ghost:disabled {
  color: var(--vp-c-text-3);
  opacity: 0.6;
  cursor: default;
}

.switch {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  min-height: 30px;
  font-size: 13px;
  font-weight: 500;
  color: var(--vp-c-text-1);
}

.track {
  position: relative;
  width: 32px;
  height: 18px;
  background: var(--vp-c-border);
  border-radius: 999px;
  transition: background 0.2s var(--vy-ease);
}

.thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.25);
  transition: transform 0.2s var(--vy-ease);
}

.switch[aria-checked="true"] .track {
  background: var(--vy-gradient-strong);
}

.switch[aria-checked="true"] .thumb {
  transform: translateX(14px);
}

:is(.seg, .chip, .ghost, .switch, .group-toggle):focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}

/* Summary: KPIs and the chart strip */

.fin-summary {
  display: grid;
  gap: 12px;
}

@container (min-width: 820px) {
  .fin-summary {
    grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
  }
}

.kpis {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.kpi {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  padding: 13px 14px;
  background: var(--fin-surface);
  border: 1px solid var(--fin-line);
  border-radius: var(--vy-radius-md);
}

.kpi-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--vp-c-text-2);
}

.kpi-value {
  font-size: 22px;
  font-weight: 650;
  letter-spacing: -0.02em;
  line-height: 1.2;
  color: var(--vp-c-text-1);
}

.kpi-value.small {
  overflow: hidden;
  font-size: 16px;
  letter-spacing: -0.01em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kpi-note {
  font-size: 12px;
  color: var(--vp-c-text-3);
}

.kpi[data-tone="pos"] .tone {
  color: var(--fin-pos);
}

.kpi[data-tone="neg"] .tone {
  color: var(--fin-neg);
}

.pill {
  align-self: flex-start;
  display: inline-flex;
  gap: 4px;
  padding: 1px 8px;
  font-size: 11.5px;
  font-weight: 600;
  border-radius: 999px;
}

.kpi[data-tone="pos"] .pill {
  background: var(--fin-pos-soft);
}

.kpi[data-tone="neg"] .pill {
  background: var(--fin-neg-soft);
}

.chart {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 13px 14px 10px;
  background: var(--fin-surface);
  border: 1px solid var(--fin-line);
  border-radius: var(--vy-radius-md);
}

.chart figcaption {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 6px 12px;
}

.chart-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--vp-c-text-2);
}

.legend {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 11px;
  color: var(--vp-c-text-3);
}

.legend > span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.key {
  display: inline-block;
  width: 9px;
  height: 9px;
  border-radius: 3px;
}

.key-actual {
  background: var(--fin-bar);
}

.key-over {
  background: var(--fin-over);
}

.key-rate {
  width: 12px;
  height: 0;
  border-top: 1.5px dashed var(--fin-rate);
  border-radius: 0;
}

.plot {
  position: relative;
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  gap: 6px;
  flex: 1;
  min-height: 156px;
}

/* Bars and the run-rate line share one box, so their percentages agree. */
.plot-area {
  position: relative;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-top: 20px;
  padding-inline: 6px;
  border-bottom: 1px solid var(--fin-line);
}

.plot-axis {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  padding-inline: 6px;
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  text-align: center;
  color: var(--vp-c-text-3);
}

.bar-col {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  min-width: 0;
}

.bar {
  position: relative;
  width: min(100%, 60px);
  min-height: 2px;
  background: var(--fin-bar);
  border-radius: 6px 6px 1px 1px;
  transition: height 0.35s var(--vy-ease);
}

.bar-over {
  position: absolute;
  inset: 0 0 auto;
  background: var(--fin-over);
  border-radius: 6px 6px 0 0;
}

.bar-value {
  position: absolute;
  bottom: calc(100% + 4px);
  left: 50%;
  transform: translateX(-50%);
  font-size: 11.5px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  white-space: nowrap;
}

.rate {
  position: absolute;
  inset-inline: 0;
  height: 0;
  border-top: 1.5px dashed var(--fin-rate);
  opacity: 0.75;
  pointer-events: none;
  z-index: 1;
}

.plot[data-empty] .plot-area {
  opacity: 0.25;
}

.plot[data-empty] .bar-value {
  visibility: hidden;
}

.plot-empty {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  margin: 0;
  font-size: 13px;
  color: var(--vp-c-text-2);
}

/* Controls */

.fin-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.fin-controls :deep(.vt-search) {
  flex: 1 1 240px;
  min-height: 34px;
  border-radius: 10px;
}

.fin-controls.secondary {
  padding-top: 12px;
  border-top: 1px dashed var(--fin-line);
}

.labeled {
  display: inline-flex;
  align-items: center;
  gap: 9px;
}

.control-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--vp-c-text-2);
}

.expanders {
  display: inline-flex;
  gap: 2px;
}

.spacer {
  flex: 1;
}

/* The table surface. Its cells come from child components, so their rules are in the block below. */

.fin-table {
  --vt-max-height: 34rem;
  --vt-font-size: 0.8125rem;
  --vt-cell-x: 0.55rem;
}

.chevron {
  color: var(--vt-muted);
  transform: rotate(90deg);
  transition: transform 0.18s var(--vy-ease);
}

.group-body[data-collapsed] .chevron {
  transform: rotate(0deg);
}

.group-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 2px 6px 2px 2px;
  margin-inline-start: -4px;
  font: inherit;
  color: var(--vt-fg);
  border-radius: 7px;
}

.group-toggle:hover {
  background: var(--vt-hover);
}

.group-name {
  font-size: 13.5px;
}

/* Footer */

.fin-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 14px;
  font-size: 12.5px;
}

.fin-foot .vt-status {
  color: var(--vp-c-text-2);
}

.fin-note {
  margin: 0 0 0 auto;
  color: var(--vp-c-text-3);
}

.nowrap {
  white-space: nowrap;
}

.tone-pos {
  color: var(--fin-pos);
}

.tone-neg {
  color: var(--fin-neg);
}

@container (max-width: 560px) {
  .kpi-value {
    font-size: 19px;
  }

  .fin-controls.secondary .spacer {
    display: none;
  }

  .fin-note {
    margin-left: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .bar,
  .chevron,
  .thumb,
  .track {
    transition: none;
  }
}
</style>

<style>
/*
 * Table cells are drawn by CostLineRow, SummaryCells, and VarianceValue, and the header by VtHeader,
 * so these rules are global and anchored on .fin-report instead of scoped.
 */
.fin-report .vt-table thead th {
  font-size: 12px;
  letter-spacing: 0.01em;
  box-shadow: inset 0 -1px 0 var(--vt-border);
  border-bottom: 0;
}

.fin-report .vt-table :is(td, th) {
  white-space: nowrap;
}

.fin-report .vt-table tr.line td[data-column="item"] {
  padding-inline-start: 34px;
  font-weight: 500;
}

.fin-report .vt-table tr.line td[data-column^="q"] {
  color: color-mix(in srgb, var(--vt-fg) 76%, transparent);
}

.fin-report .vt-table tr.line td[data-column="fy"] {
  font-weight: 600;
}

.fin-report .dept {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.fin-report .dept i {
  width: 8px;
  height: 8px;
  border-radius: 3px;
  background: var(--hue);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--hue) 18%, transparent);
}

.fin-report .dept[data-hue="violet"] {
  --hue: var(--fin-hue-violet);
}

.fin-report .dept[data-hue="blue"] {
  --hue: var(--fin-hue-blue);
}

.fin-report .dept[data-hue="magenta"] {
  --hue: var(--fin-hue-magenta);
}

.fin-report .dept[data-hue="teal"] {
  --hue: var(--fin-hue-teal);
}

.fin-report .dept[data-hue="orange"] {
  --hue: var(--fin-hue-orange);
}

.fin-report .region {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--vt-muted);
}

.fin-report .code {
  display: inline-grid;
  place-items: center;
  min-width: 24px;
  height: 20px;
  padding: 0 4px;
  font-family: var(--vp-font-family-mono);
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--fin-line);
  border-radius: 6px;
}

.fin-report .delta {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-weight: 600;
}

.fin-report .delta .arrow {
  font-size: 0.7em;
}

.fin-report .pct {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 9px;
  font-size: 12.5px;
  font-weight: 500;
}

.fin-report [data-tone="pos"]:is(.delta, .pct) {
  color: var(--fin-pos);
}

.fin-report [data-tone="neg"]:is(.delta, .pct) {
  color: var(--fin-neg);
}

/* A diverging bar: favorable variance grows right of the axis, unfavorable grows left. */
.fin-report .diverge {
  position: relative;
  flex: none;
  width: 44px;
  height: 8px;
  background: color-mix(in srgb, var(--vt-muted) 14%, transparent);
  border-radius: 999px;
}

.fin-report .diverge::before {
  content: "";
  position: absolute;
  top: -3px;
  bottom: -3px;
  left: calc(50% - 0.5px);
  width: 1px;
  background: color-mix(in srgb, var(--vt-muted) 70%, transparent);
}

.fin-report .diverge i {
  position: absolute;
  top: 0;
  bottom: 0;
  width: var(--fill);
  background: currentColor;
}

.fin-report [data-tone="pos"] > .diverge i {
  left: 50%;
  border-radius: 0 999px 999px 0;
}

.fin-report [data-tone="neg"] > .diverge i {
  right: 50%;
  border-radius: 999px 0 0 999px;
}

/* Group rows out-rank the theme's hover and stripe colors. */
.fin-report .vt-surface .vt-table tr.group > * {
  font-weight: 600;
  color: var(--vt-fg);
  background: color-mix(in srgb, var(--vt-accent) 6%, var(--vt-header-bg));
  border-top: 1px solid var(--vt-border);
  border-bottom: 1px solid var(--vt-border);
}

.fin-report .vt-table tbody.group-body:first-of-type tr.group > * {
  border-top: 0;
}

.fin-report .vt-table tbody.group-body[data-collapsed] tr.group > * {
  border-bottom: 0;
}

.fin-report .vt-table .count {
  margin-inline-start: 2px;
  padding: 1px 7px;
  font-size: 11px;
  font-weight: 500;
  color: var(--vt-muted);
  background: color-mix(in srgb, var(--vt-muted) 13%, transparent);
  border-radius: 999px;
}

/* Grand total: stays in view at the bottom, ruled like a ledger. */
.fin-report .vt-table tfoot :is(th, td) {
  position: sticky;
  bottom: 0;
  z-index: 1;
  padding-block: 12px;
  font-weight: 700;
  color: var(--vt-fg);
  background: color-mix(in srgb, var(--vt-accent) 10%, var(--vt-bg));
  border-top: 1.5px solid color-mix(in srgb, var(--vt-fg) 50%, transparent);
  border-bottom: 0;
}

.fin-report .vt-table tfoot th {
  font-size: 13.5px;
}

.fin-report .vt-table tfoot th .count {
  margin-inline-start: 8px;
}

.fin-report .ledger {
  text-decoration: underline double;
  text-decoration-color: color-mix(in srgb, currentColor 50%, transparent);
  text-underline-offset: 4px;
}

.fin-report .vt-table tbody tr[data-empty] td {
  white-space: normal;
}

.fin-report .vt-table tr[data-empty] .vt-empty {
  position: sticky;
  left: 0;
  width: min(100cqi, 100%);
  box-sizing: border-box;
}

.fin-report .sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
</style>
