<script setup lang="ts">
import { stageLabel, type Stage } from "./data";

/* A lifecycle stage as a tinted pill. Colors come from `--crm-stage-*` on the example root. */
defineProps<{ readonly stage: Stage }>();
</script>

<template>
  <span class="stage-pill" :data-stage="stage"
    ><i aria-hidden="true" />{{ stageLabel(stage) }}</span
  >
</template>

<style scoped>
.stage-pill {
  --tone: var(--crm-stage-lead);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 22px;
  padding: 0 9px 0 8px;
  font-size: 12px;
  font-weight: 550;
  line-height: 1;
  color: var(--tone);
  white-space: nowrap;
  background: color-mix(in srgb, var(--tone) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--tone) 22%, transparent);
  border-radius: 999px;
}

.stage-pill i {
  width: 6px;
  height: 6px;
  background: currentcolor;
  border-radius: 50%;
}

.stage-pill[data-stage="qualified"] {
  --tone: var(--crm-stage-qualified);
}

.stage-pill[data-stage="proposal"] {
  --tone: var(--crm-stage-proposal);
}

.stage-pill[data-stage="customer"] {
  --tone: var(--crm-stage-customer);
}

.stage-pill[data-stage="churned"] {
  --tone: var(--crm-stage-churned);
}
</style>
