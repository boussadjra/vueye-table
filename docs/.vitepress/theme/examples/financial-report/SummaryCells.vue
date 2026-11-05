<script setup lang="ts">
/*
 * The label cell and the aggregate cells of a subtotal or total row. The label spans every column
 * before the first summed one; each later column gets its own total, or stays empty.
 */
import { DataTableCell, type TableColumn, type TableRow } from "vueye-table";

import type { CostLine } from "./data";
import VarianceValue from "./VarianceValue.vue";

const props = defineProps<{
  readonly columns: readonly TableColumn<CostLine>[];
  readonly span: number;
  readonly row: TableRow<CostLine>;
  readonly amount: (value: number) => string;
  readonly ledger?: boolean | undefined;
}>();

function total(id: string): number | undefined {
  switch (id) {
    case "q1":
    case "q2":
    case "q3":
    case "q4":
    case "fy":
    case "budget":
    case "variance":
    case "variancePct":
      return Number(props.row.getValue(id) ?? 0);
    default:
      return undefined;
  }
}
</script>

<template>
  <DataTableCell
    v-if="columns.length"
    :row="row"
    :column="columns[0]!"
    as="th"
    scope="row"
    :colspan="span"
    :style="{ width: 'auto' }"
  >
    <slot />
  </DataTableCell>
  <DataTableCell v-for="column in columns.slice(span)" :key="column.id" :row="row" :column="column">
    <template v-if="total(column.id) === undefined" />
    <VarianceValue
      v-else-if="column.id === 'variance'"
      kind="amount"
      :value="total('variance') ?? 0"
      :text="amount(total('variance') ?? 0)"
      :ledger="ledger"
    />
    <VarianceValue
      v-else-if="column.id === 'variancePct'"
      kind="ratio"
      :value="total('variancePct') ?? 0"
    />
    <span v-else :class="{ ledger }">{{ amount(total(column.id) ?? 0) }}</span>
  </DataTableCell>
</template>
