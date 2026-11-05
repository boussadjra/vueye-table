<script setup lang="ts">
import { computed, ref } from "vue";
import { defineColumns, VueyeTable, VueyeGrid, type TableState } from "vueye-table";

type Line = {
  id: string;
  name: string;
  team: string;
  actual: number;
  budget: number;
};
const teams = ["North", "South", "East", "West"] as const;
const leaves: readonly Line[] = Array.from({ length: 2000 }, (_, index) => ({
  id: `line-${index + 1}`,
  name: `Line ${index + 1}`,
  team: teams[index % teams.length]!,
  actual: ((index % 20) + 1) * 10,
  budget: ((index % 20) + 2) * 10,
}));
const reference: Line = {
  id: "reference",
  name: "All-line total",
  team: "All source lines",
  actual: leaves.reduce((sum, line) => sum + line.actual, 0),
  budget: leaves.reduce((sum, line) => sum + line.budget, 0),
};
const rows = [
  { id: "priority", name: "Priority reference", team: "Reference", actual: 0, budget: 0 },
  ...leaves,
  reference,
];
const columns = defineColumns<Line>([
  { id: "name", header: "Item", width: 200, minWidth: 140, maxWidth: 300, editable: false },
  { id: "team", header: "Team", width: 140, editable: false },
  { id: "actual", header: "Actual", width: 120, type: "number", aggregate: "sum", editable: false },
  { id: "budget", header: "Budget", width: 120, type: "number", aggregate: "sum", editable: false },
  {
    id: "used",
    header: "Budget used",
    width: 140,
    accessor: (line) => (line.budget === 0 ? 0 : line.actual / line.budget),
    format: (value) => `${(value * 100).toFixed(1)}%`,
    aggregate: (_values, lines) => {
      const actual = lines.reduce((sum, line) => sum + line.actual, 0);
      const budget = lines.reduce((sum, line) => sum + line.budget, 0);
      return budget === 0 ? 0 : actual / budget;
    },
    formatAggregate: (value) => `${(Number(value) * 100).toFixed(1)}%`,
    editable: false,
  },
  ...Array.from({ length: 8 }, (_, index) => ({
    id: `period-${index + 1}`,
    header: `Period ${index + 1}`,
    width: 120,
    accessor: (line: Line) => (line.id === "reference" ? "All source lines" : line.actual + index),
    editable: false,
  })),
]);
const grid = ref(false);
const rtl = ref(false);
const footers = ref(false);
const sizing = ref<TableState["columnSizing"]>({});
const pins = ref<TableState["columnPinning"]>({ start: ["name"], end: ["period-8"] });
const rowPins = ref<TableState["rowPinning"]>({ top: ["priority"], bottom: ["reference"] });
const grouping = ref<TableState["grouping"]>(["team"]);
const expanded = ref<TableState["expandedGroups"]>(true);
const search = ref("");
const surface = computed(() => (grid.value ? VueyeGrid : VueyeTable));
function reset(): void {
  sizing.value = {};
  pins.value = { start: ["name"], end: ["period-8"] };
  rowPins.value = { top: ["priority"], bottom: ["reference"] };
  grouping.value = ["team"];
  expanded.value = true;
  search.value = "";
}
const rowAttributes = (line: Line) => ({ "data-record": line.id });
</script>

<template>
  <section>
    <h1>RC layout acceptance</h1>
    <p>
      2,000 centre lines, two reference rows and 13 columns. Group totals follow filtered centre
      lines. The bottom All-line total always covers all 2,000 source lines: Actual 210,000 and
      Budget 230,000. Both reference rows stay outside groups and filters.
    </p>
    <div class="controls">
      <label><input v-model="grid" type="checkbox" /> Spreadsheet grid</label>
      <label><input v-model="rtl" type="checkbox" /> Right-to-left layout</label>
      <label><input v-model="footers" type="checkbox" /> Aggregate footers</label>
      <button @click="reset">Reset layout</button>
    </div>
    <p>
      Tab to a header separator and use arrow keys, Home or End to resize. Columns and Group by
      expose native keyboard controls. In grid mode, Ctrl+End reaches the bottom reference row. With
      NVDA, switch to focus mode with NVDA+Space before operating the separator or grid.
    </p>
    <div class="table-panel" :dir="rtl ? 'rtl' : 'ltr'">
      <component
        :is="surface"
        :key="grid ? 'grid' : 'table'"
        :data="rows"
        :columns="columns"
        :row-attrs="rowAttributes"
        v-model:column-sizing="sizing"
        v-model:column-pinning="pins"
        v-model:row-pinning="rowPins"
        v-model:grouping="grouping"
        v-model:expanded-groups="expanded"
        v-model:search="search"
        :aggregate-position="footers ? 'footer' : 'group'"
        resizable-columns
        groupable
        :selectable="!grid"
        :row-pinning-controls="!grid"
        :editable="false"
        virtual
        virtual-columns
        :paginate="false"
        :pagination="false"
        height="420px"
        max-height="420px"
        :row-height="36"
        theme="inherit"
        v-bind="grid ? { label: 'RC grouped layout' } : { caption: 'RC grouped layout' }"
        search-placeholder="Filter layout lines"
      />
    </div>
    <p role="status">
      Item width {{ sizing.name ?? 200 }} pixels. {{ grouping.length }} grouping levels.
      {{ rowPins.top.length }} top references, {{ rowPins.bottom.length }} bottom references.
    </p>
  </section>
</template>
