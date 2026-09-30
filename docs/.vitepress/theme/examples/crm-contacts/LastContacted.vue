<script setup lang="ts">
import { formatDay, recency, relativeDay } from "./data";

/* "3 days ago" with a dot for how fresh the relationship is; the exact day is in the tooltip. */
defineProps<{ readonly day: string }>();
</script>

<template>
  <span class="last" :data-recency="recency(day)" :title="formatDay(day)">
    <i aria-hidden="true" />
    <time :datetime="day">{{ relativeDay(day) }}</time>
  </span>
</template>

<style scoped>
.last {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--crm-text-2);
  white-space: nowrap;
}

.last i {
  width: 7px;
  height: 7px;
  background: var(--crm-fresh);
  border-radius: 50%;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--crm-fresh) 18%, transparent);
}

.last[data-recency="warm"] i {
  background: var(--crm-warm);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--crm-warm) 18%, transparent);
}

.last[data-recency="stale"] i {
  background: var(--crm-stale);
  box-shadow: none;
}
</style>
