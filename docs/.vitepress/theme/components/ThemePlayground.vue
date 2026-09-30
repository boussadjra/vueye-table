<script setup lang="ts">
import { computed, ref } from "vue";
import { defineColumns, type Density } from "vueye-table";

import { makeEmployees, type Employee } from "../data";

/*
 * A table next to the handful of custom properties that theme it. Every control writes a custom
 * property, and the panel prints the CSS that reproduces the look in an application.
 */

interface Swatch {
  readonly name: string;
  /** For light surfaces. */
  readonly light: string;
  /** For dark surfaces. */
  readonly dark: string;
}

const swatches: readonly Swatch[] = [
  { name: "Violet", light: "#8a24c9", dark: "#9333ea" },
  { name: "Magenta", light: "#b0127a", dark: "#db2790" },
  { name: "Ember", light: "#c2410c", dark: "#ea6a3c" },
  { name: "Ocean", light: "#0a6fb0", dark: "#1e9be8" },
  { name: "Teal", light: "#0f766e", dark: "#14a394" },
];

const employees = makeEmployees(24);
const columns = defineColumns<Employee>([
  { id: "name.first", header: "First name" },
  { id: "name.last", header: "Last name" },
  { id: "department" },
  { id: "salary", align: "end", format: (salary) => `$${salary.toLocaleString("en-US")}` },
]);

const swatch = ref<Swatch>(swatches[0] as Swatch);
const radius = ref(14);
const fontSize = ref(14);
const density = ref<Density>("comfortable");
const striped = ref(true);
const bordered = ref(false);

const wrapperStyle = computed(() => ({
  "--vy-accent-light": swatch.value.light,
  "--vy-accent-dark": swatch.value.dark,
  "--vy-focus-light": swatch.value.light,
  "--vy-focus-dark": swatch.value.dark,
}));

const tableStyle = computed(() => ({
  "--vt-radius": `${radius.value}px`,
  "--vt-control-radius": `${Math.max(2, Math.round(radius.value * 0.64))}px`,
  "--vt-font-size": `${fontSize.value / 16}rem`,
}));

const css = computed(() =>
  [
    ".vt-surface,",
    ".vt-theme {",
    `  --vt-accent: ${swatch.value.light};`,
    `  --vt-focus: ${swatch.value.light};`,
    `  --vt-radius: ${radius.value}px;`,
    `  --vt-control-radius: ${Math.max(2, Math.round(radius.value * 0.64))}px;`,
    `  --vt-font-size: ${fontSize.value / 16}rem;`,
    "}",
    "",
    "@media (prefers-color-scheme: dark) {",
    "  :is(.vt-surface, .vt-theme):not([data-vt-theme='light']) {",
    `    --vt-accent: ${swatch.value.dark};`,
    `    --vt-focus: ${swatch.value.dark};`,
    "  }",
    "}",
  ].join("\n"),
);

const attributes = computed(() =>
  [`density="${density.value}"`, striped.value ? "striped" : "", bordered.value ? "bordered" : ""]
    .filter(Boolean)
    .join(" "),
);
</script>

<template>
  <DemoFrame title="ThemePlayground.vue">
    <div class="playground" :style="wrapperStyle">
      <VueyeTable
        :data="employees"
        :columns="columns"
        :density="density"
        :striped="striped"
        :bordered="bordered"
        :style="tableStyle"
        :page-size-options="[5, 10]"
        selectable
        caption="Team"
      />
    </div>
    <template #side>
      <div class="panel">
        <fieldset class="group">
          <legend>Accent</legend>
          <div class="swatches">
            <button
              v-for="option in swatches"
              :key="option.name"
              type="button"
              class="swatch"
              :aria-label="option.name"
              :aria-pressed="option.name === swatch.name"
              :style="{ '--light': option.light, '--dark': option.dark }"
              @click="swatch = option"
            />
          </div>
        </fieldset>
        <label class="group range">
          <span
            >Radius <output>{{ radius }}px</output></span
          >
          <input v-model.number="radius" type="range" min="0" max="24" step="1" />
        </label>
        <label class="group range">
          <span
            >Font size <output>{{ fontSize }}px</output></span
          >
          <input v-model.number="fontSize" type="range" min="12" max="16" step="1" />
        </label>
        <fieldset class="group">
          <legend>Density</legend>
          <div class="segmented">
            <button
              v-for="option in ['compact', 'comfortable', 'spacious'] as const"
              :key="option"
              type="button"
              :aria-pressed="density === option"
              @click="density = option"
            >
              {{ option }}
            </button>
          </div>
        </fieldset>
        <div class="group toggles">
          <label><input v-model="striped" type="checkbox" /> Striped</label>
          <label><input v-model="bordered" type="checkbox" /> Bordered</label>
        </div>
        <pre class="code"><span class="code-label">theme.css</span>{{ css }}</pre>
        <pre
          class="code"
        ><span class="code-label">template</span>&lt;VueyeTable {{ attributes }} … /&gt;</pre>
      </div>
    </template>
  </DemoFrame>
</template>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  padding: 16px;
  overflow: auto;
  color: #d9d7e8;
  background:
    radial-gradient(120% 60% at 100% 0%, rgb(12 147 223 / 0.14), transparent 60%), #0b0a13;
  font-size: 13px;
}

.group {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  border: 0;
}

.group legend,
.range > span {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  padding: 0;
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #8f8ba8;
}

.range > span {
  margin-bottom: 0;
}

output {
  color: #f3f1ff;
  text-transform: none;
  letter-spacing: 0;
}

.swatches {
  display: flex;
  gap: 10px;
}

.swatch {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--light) 0 50%, var(--dark) 50% 100%);
  border: 2px solid transparent;
  box-shadow: 0 0 0 1px rgb(255 255 255 / 0.12);
  cursor: pointer;
  transition: transform 0.2s var(--vy-ease);
}

.swatch:hover {
  transform: scale(1.08);
}

.swatch[aria-pressed="true"] {
  border-color: #0b0a13;
  box-shadow: 0 0 0 2px #f3f1ff;
}

input[type="range"] {
  width: 100%;
  accent-color: #c084fc;
}

.segmented {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  padding: 3px;
  background: rgb(255 255 255 / 0.05);
  border: 1px solid rgb(255 255 255 / 0.08);
  border-radius: 10px;
}

.segmented button {
  padding: 6px 4px;
  font-size: 12px;
  color: #b7b3cc;
  text-transform: capitalize;
  border-radius: 7px;
  transition: background 0.2s var(--vy-ease);
}

.segmented button[aria-pressed="true"] {
  color: #fff;
  background: var(--vy-gradient-strong);
}

.toggles {
  display: flex;
  gap: 18px;
}

.toggles label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.toggles input {
  accent-color: #c084fc;
}

.code {
  margin: 0;
  padding: 10px 12px;
  overflow-x: auto;
  font-family: var(--vp-font-family-mono);
  font-size: 11.5px;
  line-height: 1.6;
  white-space: pre;
  color: #ffb38a;
  background: rgb(255 255 255 / 0.03);
  border: 1px dashed rgb(255 255 255 / 0.12);
  border-radius: 9px;
}

.code-label {
  display: block;
  margin-bottom: 4px;
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7f7b96;
}
</style>
