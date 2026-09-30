<script setup lang="ts">
import { computed } from "vue";

import { companyOf } from "./data";

/* A company name beside a small logo square in the company's own colors. */
const props = defineProps<{ readonly name: string }>();

const background = computed(() => {
  const colors = companyOf(props.name)?.colors ?? ["#6e6b82", "#a4a1b8"];
  return `linear-gradient(140deg, ${colors[0]}, ${colors[1]})`;
});
</script>

<template>
  <span class="company">
    <span class="logo" :style="{ backgroundImage: background }" aria-hidden="true">{{
      name.charAt(0)
    }}</span>
    <span class="name">{{ name }}</span>
  </span>
</template>

<style scoped>
.company {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.logo {
  display: inline-grid;
  flex: none;
  place-items: center;
  width: 20px;
  height: 20px;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  border-radius: 6px;
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.2);
}

.name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
