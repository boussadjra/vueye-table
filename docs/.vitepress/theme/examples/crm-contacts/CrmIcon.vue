<script setup lang="ts">
/* Small stroke icons for the CRM example, drawn at 16px on a 24px grid. */
const props = withDefaults(
  defineProps<{
    readonly name: IconName;
    readonly size?: number;
    readonly filled?: boolean;
  }>(),
  { size: 16, filled: false },
);
</script>

<script lang="ts">
export type IconName =
  | "search"
  | "table"
  | "cards"
  | "star"
  | "tag"
  | "columns"
  | "sort"
  | "chevron"
  | "left"
  | "right"
  | "close"
  | "check"
  | "user"
  | "mail"
  | "arrowUp"
  | "arrowDown"
  | "filterOff";

const PATHS: Record<IconName, string> = {
  search: "M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm10 2-4.35-4.35",
  table: "M3 5h18v14H3zM3 10h18M3 15h18M9 5v14",
  cards: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  star: "m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9Z",
  tag: "M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8ZM7.5 7.5h.01",
  columns: "M4 4h16v16H4zM10 4v16M15 4v16",
  sort: "M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4",
  chevron: "m6 9 6 6 6-6",
  left: "m15 18-6-6 6-6",
  right: "m9 18 6-6-6-6",
  close: "M18 6 6 18M6 6l12 12",
  check: "M20 6 9 17l-5-5",
  user: "M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z",
  mail: "M3 6h18v12H3zM3 7l9 6 9-6",
  arrowUp: "M12 19V5M5 12l7-7 7 7",
  arrowDown: "M12 5v14M19 12l-7 7-7-7",
  filterOff: "M3 5h18l-7 8v6l-4 2v-8z",
};
</script>

<template>
  <svg
    class="crm-icon"
    :width="props.size"
    :height="props.size"
    viewBox="0 0 24 24"
    :fill="props.filled ? 'currentColor' : 'none'"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path :d="PATHS[props.name]" />
  </svg>
</template>

<style scoped>
.crm-icon {
  flex: none;
}
</style>
