<script setup lang="ts">
/* A variance amount or percentage: colored, with an arrow, and a bar for percentages. */
import { barFill, percent } from "./format";

const props = defineProps<{
  readonly kind: "amount" | "ratio";
  readonly value: number;
  /** The formatted absolute amount, for `amount`. */
  readonly text?: string | undefined;
  readonly ledger?: boolean | undefined;
}>();
const over = (): boolean => props.value < 0;
</script>

<template>
  <span v-if="kind === 'amount'" class="delta" :data-tone="over() ? 'neg' : 'pos'">
    <span class="arrow" aria-hidden="true">{{ over() ? "▼" : "▲" }}</span>
    <span class="sr-only">{{ over() ? "Over budget by" : "Under budget by" }}</span>
    <span :class="{ ledger }">{{ text }}</span>
  </span>
  <span v-else class="pct" :data-tone="over() ? 'neg' : 'pos'">
    <span class="diverge" :style="barFill(value)" aria-hidden="true"><i /></span>
    {{ percent(value) }}
  </span>
</template>
