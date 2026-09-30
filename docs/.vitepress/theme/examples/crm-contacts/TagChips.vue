<script setup lang="ts">
import { computed } from "vue";

/* Tag chips, showing at most `max` and a "+n" for the rest. */
const props = withDefaults(
  defineProps<{ readonly tags: readonly string[]; readonly max?: number }>(),
  {
    max: 3,
  },
);

const shown = computed(() => props.tags.slice(0, props.max));
const rest = computed(() => props.tags.slice(props.max));
</script>

<template>
  <span v-if="tags.length > 0" class="tags">
    <span v-for="tag in shown" :key="tag" class="chip">{{ tag }}</span>
    <span v-if="rest.length > 0" class="chip more" :title="rest.join(', ')"
      >+{{ rest.length }}</span
    >
  </span>
  <span v-else class="none">—</span>
</template>

<style scoped>
.tags {
  display: inline-flex;
  flex-wrap: nowrap;
  gap: 4px;
}

.chip {
  display: inline-flex;
  align-items: center;
  height: 20px;
  padding: 0 7px;
  font-size: 11.5px;
  font-weight: 500;
  color: var(--crm-text-2);
  white-space: nowrap;
  background: var(--crm-chip);
  border: 1px solid var(--crm-line-soft);
  border-radius: 6px;
}

.more {
  color: var(--crm-text-3);
}

.none {
  color: var(--crm-text-3);
}
</style>
