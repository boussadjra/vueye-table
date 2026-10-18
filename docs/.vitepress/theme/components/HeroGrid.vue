<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from "vue";
import { columnLabel, toA1 } from "vueye-table";

/*
 * The hero's backdrop: a spreadsheet whose cell cursor follows the pointer, names the cell it is
 * on with the engine's own toA1. It stays still until the reader moves the pointer.
 */

const CELL_WIDTH = 112;
const CELL_HEIGHT = 44;
const COLUMNS = 26;
const ROWS = 40;

const columnLabels = Array.from({ length: COLUMNS }, (_, index) => columnLabel(index));
const rowLabels = Array.from({ length: ROWS }, (_, index) => index + 1);

const root = ref<HTMLElement>();
const cells = ref<HTMLElement>();
const cursor = shallowRef({ row: 2, column: 3 });
const reference = computed(() => toA1(cursor.value));
const cursorStyle = computed(() => ({
  transform: `translate(${cursor.value.column * CELL_WIDTH}px, ${cursor.value.row * CELL_HEIGHT}px)`,
}));
const columnBandStyle = computed(() => ({
  transform: `translateX(${cursor.value.column * CELL_WIDTH}px)`,
}));
const rowBandStyle = computed(() => ({
  transform: `translateY(${cursor.value.row * CELL_HEIGHT}px)`,
}));

let host: HTMLElement | null = null;
let frame = 0;
let motionQuery: MediaQueryList | undefined;
let reducedMotion = false;

function place(column: number, row: number): void {
  if (column === cursor.value.column && row === cursor.value.row) {
    return;
  }
  cursor.value = { row, column };
}

function onPointerMove(event: PointerEvent): void {
  if (
    reducedMotion ||
    event.pointerType === "touch" ||
    (event.target instanceof Element && event.target.closest("[data-grid-ignore]"))
  ) {
    return;
  }
  const { clientX, clientY } = event;
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(() => {
    const rect = cells.value?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    const column = Math.floor((clientX - rect.left) / CELL_WIDTH);
    const row = Math.floor((clientY - rect.top) / CELL_HEIGHT);
    if (column >= 0 && row >= 0 && column < COLUMNS && row < ROWS) {
      place(column, row);
    }
  });
}

function onMotionChange(event: MediaQueryListEvent): void {
  reducedMotion = event.matches;
  cancelAnimationFrame(frame);
}

onMounted(() => {
  motionQuery = matchMedia("(prefers-reduced-motion: reduce)");
  reducedMotion = motionQuery.matches;
  motionQuery.addEventListener("change", onMotionChange);
  host = root.value?.parentElement ?? null;
  host?.addEventListener("pointermove", onPointerMove, { passive: true });
});

onBeforeUnmount(() => {
  host?.removeEventListener("pointermove", onPointerMove);
  cancelAnimationFrame(frame);
  motionQuery?.removeEventListener("change", onMotionChange);
});
</script>

<template>
  <div ref="root" class="hero-grid" aria-hidden="true">
    <div class="corner">
      <span class="name-box">{{ reference }}</span>
    </div>
    <div class="column-header">
      <span
        v-for="(label, index) in columnLabels"
        :key="label"
        :class="{ active: index === cursor.column }"
        >{{ label }}</span
      >
    </div>
    <div class="row-header">
      <span
        v-for="(label, index) in rowLabels"
        :key="label"
        :class="{ active: index === cursor.row }"
        >{{ label }}</span
      >
    </div>
    <div ref="cells" class="cells">
      <div class="band column-band" :style="columnBandStyle" />
      <div class="band row-band" :style="rowBandStyle" />
      <div class="cursor" :style="cursorStyle">
        <span class="tag">{{ reference }}</span>
        <span class="handle" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.hero-grid {
  --cell-w: 112px;
  --cell-h: 44px;
  --head-h: 30px;
  --gutter-w: 46px;

  position: absolute;
  inset: var(--vy-grid-top, 0px) 0 0;
  overflow: hidden;
  pointer-events: none;
  user-select: none;
  font-family: var(--vp-font-family-mono);
  mask-image: radial-gradient(ellipse 85% 75% at 50% 30%, #000 35%, transparent 100%);
}

.corner {
  position: absolute;
  top: 0;
  left: 0;
  width: var(--gutter-w);
  height: var(--head-h);
  border-right: 1px solid var(--vy-grid-line);
  border-bottom: 1px solid var(--vy-grid-line);
}

.name-box {
  position: absolute;
  inset: 6px 6px 6px 8px;
  display: grid;
  place-items: center start;
  font-size: 10px;
  font-weight: 600;
  color: var(--vp-c-brand-1);
}

.column-header,
.row-header {
  position: absolute;
  display: flex;
  font-size: 11px;
  color: var(--vp-c-text-3);
  background: color-mix(in srgb, var(--vp-c-bg-alt) 55%, transparent);
}

.column-header {
  top: 0;
  left: var(--gutter-w);
  right: 0;
  height: var(--head-h);
  border-bottom: 1px solid var(--vy-grid-line);
}

.column-header span {
  flex: 0 0 var(--cell-w);
  display: grid;
  place-items: center;
  border-right: 1px solid var(--vy-grid-line);
  transition:
    color 0.2s,
    background-color 0.2s;
}

.row-header {
  top: var(--head-h);
  left: 0;
  bottom: 0;
  width: var(--gutter-w);
  flex-direction: column;
  border-right: 1px solid var(--vy-grid-line);
}

.row-header span {
  flex: 0 0 var(--cell-h);
  display: grid;
  place-items: center;
  border-bottom: 1px solid var(--vy-grid-line);
  transition:
    color 0.2s,
    background-color 0.2s;
}

.column-header span.active,
.row-header span.active {
  color: var(--vp-c-brand-1);
  background: rgb(160 45 230 / 0.1);
}

.cells {
  position: absolute;
  top: var(--head-h);
  left: var(--gutter-w);
  right: 0;
  bottom: 0;
  background-image:
    linear-gradient(to right, var(--vy-grid-line) 1px, transparent 1px),
    linear-gradient(to bottom, var(--vy-grid-line) 1px, transparent 1px);
  background-size: var(--cell-w) var(--cell-h);
  background-position: -1px -1px;
}

.band {
  position: absolute;
  top: 0;
  left: 0;
  background: rgb(160 45 230 / 0.035);
  transition: transform 0.22s var(--vy-ease);
}

.column-band {
  width: var(--cell-w);
  height: 100%;
}

.row-band {
  width: 100%;
  height: var(--cell-h);
}

.cursor {
  position: absolute;
  top: 0;
  left: 0;
  width: calc(var(--cell-w) + 1px);
  height: calc(var(--cell-h) + 1px);
  margin: -1px 0 0 -1px;
  border: 2px solid transparent;
  border-image: var(--vy-gradient) 1;
  background: rgb(160 45 230 / 0.07);
  box-shadow:
    0 0 28px rgb(160 45 230 / 0.35),
    0 0 80px rgb(201 17 127 / 0.18);
  transition: transform 0.22s var(--vy-ease);
}

.tag {
  position: absolute;
  top: -22px;
  left: -2px;
  padding: 2px 7px;
  font-size: 10px;
  font-weight: 600;
  line-height: 16px;
  letter-spacing: 0.02em;
  color: #fff;
  background: var(--vy-gradient-strong);
  border-radius: 5px 5px 5px 0;
}

/* On phones the row numbers would sit under the text, so only the column letters remain. */
@media (max-width: 639px) {
  .hero-grid {
    --gutter-w: 0px;
  }

  .corner,
  .row-header {
    display: none;
  }
}

.handle {
  position: absolute;
  right: -5px;
  bottom: -5px;
  width: 8px;
  height: 8px;
  background: var(--vy-orange);
  border: 2px solid var(--vp-c-bg);
}
</style>
