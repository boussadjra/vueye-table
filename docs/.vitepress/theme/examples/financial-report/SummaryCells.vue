<script setup lang="ts">
/*
 * The label cell and the aggregate cells of a subtotal or total row. The label spans every column
 * before the first summed one; each later column gets its own total, or stays empty.
 */
import type { TableColumn } from "vueye-table";

import type { CostLine } from "./data";
import type { Totals } from "./grouping";
import VarianceValue from "./VarianceValue.vue";

const props = defineProps<{
  readonly columns: readonly TableColumn<CostLine>[];
  readonly span: number;
  readonly totals: Totals;
  readonly amount: (value: number) => string;
  readonly scope: "row" | "rowgroup";
  readonly ledger?: boolean | undefined;
}>();

function total(id: string): number | undefined {
  const { totals } = props;
  switch (id) {
    case "q1":
    case "q2":
    case "q3":
    case "q4":
    case "fy":
    case "budget":
    case "variance":
    case "variancePct":
      return totals[id];
    default:
      return undefined;
  }
}
</script>

<template>
  <th :scope="scope" :colspan="span">
    <slot />
  </th>
  <td
    v-for="column in columns.slice(span)"
    :key="column.id"
    :data-column="column.id"
    :data-align="column.align"
  >
    <template v-if="total(column.id) === undefined" />
    <VarianceValue
      v-else-if="column.id === 'variance'"
      kind="amount"
      :value="totals.variance"
      :text="amount(totals.variance)"
      :ledger="ledger"
    />
    <VarianceValue
      v-else-if="column.id === 'variancePct'"
      kind="ratio"
      :value="totals.variancePct"
    />
    <span v-else :class="{ ledger }">{{ amount(total(column.id) ?? 0) }}</span>
  </td>
</template>
