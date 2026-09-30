<script setup lang="ts">
/* One cost line. Cells follow the table's visible columns, so hiding a column hides its cell. */
import type { TableColumn, TableRow } from "vueye-table";

import type { CostLine } from "./data";
import { DEPARTMENT_HUE, REGION_CODE } from "./format";
import VarianceValue from "./VarianceValue.vue";

defineProps<{
  readonly row: TableRow<CostLine>;
  readonly columns: readonly TableColumn<CostLine>[];
  readonly amount: (value: number) => string;
}>();

const numberOf = (row: TableRow<CostLine>, id: string): number => Number(row.getValue(id) ?? 0);
</script>

<template>
  <tr class="line">
    <td
      v-for="column in columns"
      :key="column.id"
      :data-column="column.id"
      :data-align="column.align"
    >
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
    </td>
  </tr>
</template>
