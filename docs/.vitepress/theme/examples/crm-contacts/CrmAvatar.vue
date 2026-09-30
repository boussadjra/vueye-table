<script setup lang="ts">
import { computed } from "vue";

import { avatarGradient, initials } from "./data";

/* Initials on a gradient chosen from the name, so a person keeps the same colors everywhere. */
const props = withDefaults(defineProps<{ readonly name: string; readonly size?: number }>(), {
  size: 32,
});

const style = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
  fontSize: `${Math.round(props.size * 0.38)}px`,
  backgroundImage: avatarGradient(props.name),
}));
</script>

<template>
  <span class="crm-avatar" :style="style" aria-hidden="true">{{ initials(name) }}</span>
</template>

<style scoped>
.crm-avatar {
  display: inline-grid;
  flex: none;
  place-items: center;
  font-weight: 600;
  line-height: 1;
  letter-spacing: 0.02em;
  color: #fff;
  border-radius: 50%;
  box-shadow:
    inset 0 0 0 1px rgb(255 255 255 / 0.22),
    0 1px 2px rgb(20 10 40 / 0.18);
  text-shadow: 0 1px 1px rgb(0 0 0 / 0.18);
  user-select: none;
}
</style>
