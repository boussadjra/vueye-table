<script setup lang="ts">
import { computed } from "vue";
/* One cost line. Cells follow the table's visible columns, so hiding a column hides its cell. */
import type { TableColumn, TableRow } from "vueye-table";
import { DataTableRow, DataTableCell } from "vueye-table";

import type { CostLine } from "./data";
import { DEPARTMENT_HUE, REGION_CODE } from "./format";
import { ALL_LINES_KEY } from "./report";
import SummaryCells from "./SummaryCells.vue";
import { MEASURES } from "./totals";
import VarianceValue from "./VarianceValue.vue";

const props = defineProps<{
  readonly row: TableRow<CostLine>;
  readonly columns: readonly TableColumn<CostLine>[];
  readonly amount: (value: number) => string;
}>();

const numberOf = (row: TableRow<CostLine>, id: string): number => Number(row.getValue(id) ?? 0);
const summarySpan = computed(() => {
  const first = props.columns.findIndex((column) =>
    (MEASURES as readonly string[]).includes(column.id),
  );
  return first <= 0 ? props.columns.length : first;
});
</script>

<template>
  <DataTableRow :row="row" class="line">
    <SummaryCells
      v-if="row.key === ALL_LINES_KEY"
      :row="row"
      :columns="columns"
      :span="summarySpan"
      :amount="amount"
      ledger
    >
      All-line total <span class="count">All source lines</span>
    </SummaryCells>
    <template v-else>
      <DataTableCell v-for="column in columns" :key="column.id" :row="row" :column="column">
        <span
          v-if="column.id === 'department'"
          class="dept"
          :data-hue="DEPARTMENT_HUE[row.original.department]"
          ><i aria-hidden="true" />{{ row.original.department }}</span
        >
        <span v-else-if="column.id === 'region'" class="region"
          ><span class="code" aria-hidden="true">{{ REGION_CODE[row.original.region] }}</span
          >{{ row.original.region }}</span
        >
        <VarianceValue
          v-else-if="column.id === 'variance'"
          kind="amount"
          :value="numberOf(row, 'variance')"
          :text="amount(numberOf(row, 'variance'))"
        />
        <VarianceValue
          v-else-if="column.id === 'variancePct'"
          kind="ratio"
          :value="numberOf(row, 'variancePct')"
        />
        <template v-else>{{ row.getDisplay(column.id) }}</template>
      </DataTableCell>
    </template>
  </DataTableRow>
</template>
