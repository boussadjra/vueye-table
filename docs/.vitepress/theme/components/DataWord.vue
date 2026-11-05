<script setup lang="ts">
// Each filled square is a cell in a small, lowercase bitmap alphabet.
const glyphs = {
  d: ["00001", "00001", "01111", "10001", "10001", "10001", "01111"],
  a: ["00000", "00000", "01110", "00001", "01111", "10001", "01111"],
  t: ["00100", "00100", "11111", "00100", "00100", "00100", "00111"],
} as const;

const letters = ["d", "a", "t", "a"] as const;
const cells = letters.flatMap((letter, index) =>
  glyphs[letter].flatMap((row, y) =>
    Array.from(row).flatMap((filled, x) => (filled === "1" ? [{ x: index * 6 + x, y }] : [])),
  ),
);
</script>

<template>
  <span class="data-word">
    <span class="label">data</span>
    <svg viewBox="0 0 23 7" aria-hidden="true" focusable="false" shape-rendering="crispEdges">
      <rect
        v-for="cell in cells"
        :key="`${cell.x}-${cell.y}`"
        :x="cell.x"
        :y="cell.y"
        width="0.86"
        height="0.86"
        fill="currentColor"
      />
    </svg>
  </span>
</template>

<style scoped>
.data-word {
  position: relative;
  display: inline-block;
  width: 2.5em;
  height: 0.76em;
  margin-inline: 0.025em;
  vertical-align: 0.015em;
  color: var(--vp-c-brand-1);
}

svg {
  display: block;
  width: 100%;
  height: 100%;
}

.label {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  white-space: nowrap;
  clip-path: inset(50%);
}
</style>
