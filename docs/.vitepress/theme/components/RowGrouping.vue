<script setup lang="ts">
import { computed, useId } from "vue";
import { defineColumns, useDataTable, type RowKey } from "vueye-table";

import DemoFrame from "./DemoFrame.vue";

interface Project {
  id: number;
  project: string;
  region: string;
  team: string;
  budget: number;
  actual: number;
}
const id = useId();
const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const money = (value: unknown): string => currency.format(Number(value));
const percent = (value: unknown): string => `${(Number(value) * 100).toFixed(1)}%`;
const projects: readonly Project[] = [
  {
    id: 1,
    project: "Warehouse planning",
    region: "Europe",
    team: "Operations",
    budget: 18000,
    actual: 16400,
  },
  {
    id: 2,
    project: "Delivery routing",
    region: "Europe",
    team: "Operations",
    budget: 12000,
    actual: 13800,
  },
  {
    id: 3,
    project: "Customer portal",
    region: "Europe",
    team: "Product",
    budget: 24000,
    actual: 22500,
  },
  {
    id: 4,
    project: "Supplier onboarding",
    region: "North Africa",
    team: "Operations",
    budget: 16000,
    actual: 14200,
  },
  {
    id: 5,
    project: "Inventory forecast",
    region: "North Africa",
    team: "Product",
    budget: 20000,
    actual: 21800,
  },
  {
    id: 6,
    project: "Order tracking",
    region: "North Africa",
    team: "Product",
    budget: 14000,
    actual: 12800,
  },
  {
    id: 7,
    project: "Returns workflow",
    region: "Asia Pacific",
    team: "Operations",
    budget: 10000,
    actual: 9400,
  },
  {
    id: 8,
    project: "Mobile checkout",
    region: "Asia Pacific",
    team: "Product",
    budget: 22000,
    actual: 24100,
  },
];
let nextId = projects.length + 1;
const table = useDataTable<Project>({
  data: projects,
  columns: defineColumns<Project>([
    { id: "project" },
    { id: "region" },
    { id: "team" },
    { id: "budget", aggregate: "sum", format: money, formatAggregate: money },
    {
      id: "actual",
      aggregate: "sum",
      format: money,
      formatAggregate: money,
      editable: true,
      type: "number",
      validate: (value) => value >= 0 || "Enter a positive cost or zero.",
    },
    {
      id: "variance",
      header: "Variance",
      accessor: (row) => (row.budget === 0 ? 0 : (row.actual - row.budget) / row.budget),
      format: percent,
      aggregate: (_values, rows) => {
        const budget = rows.reduce((sum, row) => sum + row.budget, 0);
        return budget === 0
          ? 0
          : (rows.reduce((sum, row) => sum + row.actual, 0) - budget) / budget;
      },
      formatAggregate: percent,
    },
  ]),
  initialState: { grouping: ["region", "team"], pagination: { page: 1, pageSize: 2 } },
});
const grouping = computed(() =>
  table.state.grouping.length === 2 ? "nested" : (table.state.grouping[0] ?? "none"),
);
function changeGrouping(event: Event): void {
  const value = (event.target as HTMLSelectElement).value;
  table.groupBy(value === "nested" ? ["region", "team"] : value === "none" ? [] : [value]);
}
function search(event: Event): void {
  table.search((event.target as HTMLInputElement).value);
}
function edit(key: RowKey, event: Event): void {
  const input = event.target as HTMLInputElement;
  const result = table.edit({ rowKey: key, column: "actual", input: input.value });
  input.setCustomValidity(result.issues[0]?.message ?? "");
  input.reportValidity();
  input.value = String(table.getRow(key)?.original.actual ?? "");
}
function append(): void {
  const key = nextId++;
  table.appendData([
    {
      id: key,
      project: `Capacity review ${key}`,
      region: "Europe",
      team: "Operations",
      budget: 8000,
      actual: 7600,
    },
  ]);
}
</script>

<template>
  <DemoFrame title="RowGrouping.vue">
    <div class="grouping-demo">
      <div class="controls">
        <label :for="`${id}-groups`"
          >Group by
          <select
            :id="`${id}-groups`"
            aria-label="Group by"
            :value="grouping"
            @change="changeGrouping"
          >
            <option value="nested">Region, then team</option>
            <option value="region">Region</option>
            <option value="team">Team</option>
            <option value="none">No grouping</option>
          </select>
        </label>
        <label :for="`${id}-search`"
          >Find a project
          <input
            :id="`${id}-search`"
            type="search"
            :value="table.state.search"
            placeholder="Search projects, regions or teams"
            @input="search"
          />
        </label>
      </div>
      <div class="actions">
        <button type="button" @click="table.expandAllGroups">Expand all</button>
        <button type="button" @click="table.collapseAllGroups">Collapse all</button>
        <button type="button" @click="append">Add a project</button>
        <button type="button" @click="table.reset">Reset view</button>
      </div>
      <div class="table-scroll" role="region" aria-label="Project budgets" tabindex="0">
        <table>
          <caption>
            Illustrative project budgets · edit actual costs to update subtotals
          </caption>
          <thead>
            <tr>
              <th scope="col">Project</th>
              <th
                scope="col"
                :aria-sort="
                  table.getSort('region')?.direction === 'asc'
                    ? 'ascending'
                    : table.getSort('region')?.direction === 'desc'
                      ? 'descending'
                      : 'none'
                "
              >
                <button type="button" @click="table.toggleSort('region')">Region</button>
              </th>
              <th scope="col">Team</th>
              <th scope="col" class="number">Budget</th>
              <th scope="col" class="number">Actual</th>
              <th scope="col" class="number">Variance</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="item in table.renderItems" :key="item.key">
              <tr
                v-if="item.kind === 'group'"
                class="group-row"
                :class="{ nested: item.depth > 0 }"
              >
                <th
                  colspan="3"
                  scope="row"
                  :style="{ paddingInlineStart: `${1 + item.depth * 1.25}rem` }"
                >
                  <input
                    type="checkbox"
                    :checked="item.selection === 'all'"
                    :indeterminate="item.selection === 'some'"
                    :aria-label="`Select all projects in ${item.value}`"
                    @change="table.toggleGroupSelection(item.key)"
                  />
                  <button
                    type="button"
                    :aria-expanded="item.isExpanded"
                    @click="table.toggleGroup(item.key)"
                  >
                    <svg
                      viewBox="0 0 16 16"
                      width="16"
                      height="16"
                      aria-hidden="true"
                      :class="{ open: item.isExpanded }"
                    >
                      <path d="m6 3 5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.5" />
                    </svg>
                    {{ item.value }}
                    <span class="count"
                      >{{ item.leafCount }}
                      {{ item.leafCount === 1 ? "project" : "projects" }}</span
                    >
                  </button>
                </th>
                <td class="number">{{ item.getAggregateDisplay("budget") }}</td>
                <td class="number">{{ item.getAggregateDisplay("actual") }}</td>
                <td class="number">{{ item.getAggregateDisplay("variance") }}</td>
              </tr>
              <tr
                v-else-if="item.kind === 'row'"
                :class="{ selected: table.isSelected(item.row.key) }"
              >
                <th scope="row">
                  <label
                    ><input
                      type="checkbox"
                      :checked="table.isSelected(item.row.key)"
                      @change="table.toggleRow(item.row.key)"
                    />{{ item.row.original.project }}</label
                  >
                </th>
                <td>{{ item.row.original.region }}</td>
                <td>{{ item.row.original.team }}</td>
                <td class="number">{{ item.row.getDisplay("budget") }}</td>
                <td class="number">
                  <input
                    class="cost"
                    type="number"
                    min="0"
                    step="100"
                    :aria-label="`Actual cost for ${item.row.original.project}`"
                    :value="item.row.original.actual"
                    @change="edit(item.row.key, $event)"
                  />
                </td>
                <td class="number">{{ item.row.getDisplay("variance") }}</td>
              </tr>
            </template>
            <tr v-if="table.renderItems.length === 0">
              <td colspan="6" class="empty">No matching projects. Try another search.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="footer">
        <p role="status">
          {{ table.loadedRowCount }} projects · {{ table.selectedCount }} selected · Page
          {{ table.page }} of {{ table.pageCount }}
        </p>
        <div class="actions">
          <button type="button" :disabled="!table.canPreviousPage" @click="table.previousPage">
            Previous</button
          ><button type="button" :disabled="!table.canNextPage" @click="table.nextPage">
            Next
          </button>
        </div>
      </div>
      <details>
        <summary>Preview grouped CSV</summary>
        <pre>{{ table.exportRows({ groups: true }) }}</pre>
      </details>
    </div>
  </DemoFrame>
</template>

<style scoped>
.grouping-demo {
  color: var(--vp-c-text-1);
  font-size: 0.875rem;
}
.controls,
.actions,
.footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}
.controls {
  align-items: end;
  margin-block-end: 1rem;
}
.controls label {
  display: grid;
  gap: 0.375rem;
  font-weight: 600;
}
.controls label:last-child {
  flex: 1;
  min-width: min(100%, 15rem);
}
select,
input[type="search"],
.cost {
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: inherit;
  padding: 0.5rem 0.625rem;
  font: inherit;
}
input[type="checkbox"] {
  accent-color: var(--vp-c-brand-1);
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
}
button {
  font: inherit;
  cursor: pointer;
}
.actions button {
  padding: 0.45rem 0.75rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
}
.actions button:hover:not(:disabled) {
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
.table-scroll {
  overflow-x: auto;
  margin-block: 1rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
}
table {
  width: 100%;
  min-width: 810px;
  margin: 0;
  display: table;
  border-collapse: collapse;
  white-space: nowrap;
}
caption {
  text-align: start;
  padding: 0.75rem 1rem;
  color: var(--vp-c-text-2);
  font-size: 0.8rem;
}
th,
td {
  border: 0;
  border-block-start: 1px solid var(--vp-c-divider);
  padding: 0.7rem 1rem;
  text-align: start;
}
thead th {
  background: var(--vp-c-bg-soft);
  font-weight: 600;
}
tbody th {
  font-weight: 400;
}
tr:nth-child(2n) {
  background: transparent;
}
.number {
  text-align: end;
  font-variant-numeric: tabular-nums;
}
.cost {
  width: 6.5rem;
  text-align: end;
  font-variant-numeric: tabular-nums;
}
.group-row {
  background: var(--vp-c-bg-soft) !important;
}
.group-row th,
.group-row td {
  font-weight: 600;
}
.group-row.nested {
  background: var(--vp-c-bg) !important;
}
.group-row button,
tbody label {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}
.group-row input {
  vertical-align: middle;
  margin-inline-end: 0.625rem;
}
.group-row svg {
  flex-shrink: 0;
}
.group-row svg.open {
  transform: rotate(90deg);
}
.count {
  color: var(--vp-c-text-2);
  font-size: 0.75rem;
  font-weight: 400;
}
.selected {
  background: var(--vp-c-brand-soft) !important;
}
.footer {
  justify-content: space-between;
}
.footer p {
  margin: 0;
  color: var(--vp-c-text-2);
  font-size: 0.8rem;
}
.empty {
  text-align: center;
  padding: 2rem;
  color: var(--vp-c-text-2);
}
details {
  margin-block-start: 1rem;
}
summary {
  cursor: pointer;
  font-weight: 600;
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
  .footer {
    align-items: start;
  }
  .actions {
    gap: 0.5rem;
  }
}
</style>
