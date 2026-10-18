<script setup lang="ts">
import { withBase } from "vitepress";

/*
 * Cards for the example pages. Each card draws a small abstract of its screen in CSS, so the
 * gallery needs no screenshots that could drift from the live pages.
 */

interface Example {
  readonly group: "start" | "workflow" | "loading" | "hierarchy";
  readonly link: string;
  readonly title: string;
  readonly summary: string;
  readonly layer: string;
  readonly tags: readonly string[];
  /** Which abstract to draw. */
  readonly art: "table" | "sheet" | "dashboard" | "cards" | "network" | "report";
  readonly hue: string;
}

const examples: readonly Example[] = [
  {
    group: "start",
    link: "/examples/table",
    title: "Full table",
    summary: "Every feature of the complete table, with its state shown live as plain data.",
    layer: "VueyeTable",
    tags: ["v-model", "state"],
    art: "table",
    hue: "#8a24c9",
  },
  {
    group: "start",
    link: "/examples/grid",
    title: "Spreadsheet",
    summary: "Order lines edited in place, with a log of every new array and A1 address.",
    layer: "VueyeGrid",
    tags: ["clipboard", "undo"],
    art: "sheet",
    hue: "#f59b4e",
  },
  {
    group: "loading",
    link: "/examples/live-logs",
    title: "Live NDJSON logs",
    summary: "Generated log bytes decoded into a virtual table, with progress and cancellation.",
    layer: "useDataTable + styled",
    tags: ["NDJSON", "stream", "abort"],
    art: "network",
    hue: "#0c93df",
  },
  {
    group: "loading",
    link: "/examples/infinite-issues",
    title: "Infinite issue tracker",
    summary: "Cursor loading over the existing issue API, with search, sorting and retry.",
    layer: "VueyeTable",
    tags: ["cursor", "virtual", "retry"],
    art: "table",
    hue: "#8a24c9",
  },
  {
    group: "hierarchy",
    link: "/examples/file-explorer",
    title: "Lazy file explorer",
    summary:
      "Project folders load on expansion, with keyboard navigation and supplied size totals.",
    layer: "VueyeTable",
    tags: ["tree", "lazy children", "selection"],
    art: "table",
    hue: "#0f9d7a",
  },
  {
    group: "hierarchy",
    link: "/examples/budget-tree",
    title: "Editable department tree",
    summary: "An adjacency grid combines child edits, virtual rows and protected local changes.",
    layer: "VueyeGrid",
    tags: ["tree", "editing", "ingestion"],
    art: "sheet",
    hue: "#e1583a",
  },
  {
    group: "workflow",
    link: "/examples/orders-dashboard",
    title: "Orders dashboard",
    summary: "An admin screen with filters, bulk actions, inline line items and a detail drawer.",
    layer: "VueyeTable",
    tags: ["filters", "slots", "selection", "CSV"],
    art: "dashboard",
    hue: "#a02de6",
  },
  {
    group: "workflow",
    link: "/examples/crm-contacts",
    title: "CRM contacts",
    summary: "One table state drawn as a table and as cards, built from headless components.",
    layer: "Headless",
    tags: ["useDataTable", "custom filter", "views"],
    art: "cards",
    hue: "#c9117f",
  },
  {
    group: "loading",
    link: "/examples/server-side",
    title: "Server-side API",
    summary:
      "Ten thousand records behind a simulated API, with aborts, retries, and a network log.",
    layer: "VueyeTable manual",
    tags: ["manual", "loading", "AbortSignal"],
    art: "network",
    hue: "#0c93df",
  },
  {
    group: "workflow",
    link: "/examples/inventory",
    title: "Inventory sheet",
    summary: "A stock spreadsheet with validation, computed columns, and conditional formatting.",
    layer: "VueyeGrid",
    tags: ["editing", "parse", "cell slots"],
    art: "sheet",
    hue: "#e1583a",
  },
  {
    group: "workflow",
    link: "/examples/financial-report",
    title: "Financial report",
    summary:
      "Budget against actuals, grouped by region with subtotals, composed over processed rows.",
    layer: "useDataTable + styled",
    tags: ["grouping", "aggregates", "format"],
    art: "report",
    hue: "#0f9d7a",
  },
];

const groups = [
  {
    id: "start",
    title: "Start with a table or spreadsheet",
    summary: "Try the full components before choosing a more specialized example.",
  },
  {
    id: "workflow",
    title: "Application workflows",
    summary: "Combine tables, editing and custom views in a complete screen.",
  },
  {
    id: "loading",
    title: "Loading data",
    summary: "Explore server paging, cursor loading and cancellable streams.",
  },
  {
    id: "hierarchy",
    title: "Trees and editing",
    summary: "Load nested records on demand or edit a department tree.",
  },
] as const;

const exampleGroups = groups.map((group) => ({
  ...group,
  examples: examples.filter((example) => example.group === group.id),
}));
</script>

<template>
  <div class="gallery-groups vp-raw">
    <section
      v-for="group in exampleGroups"
      :key="group.id"
      :aria-labelledby="`gallery-${group.id}`"
    >
      <div class="group-intro">
        <h2 :id="`gallery-${group.id}`">{{ group.title }}</h2>
        <p>{{ group.summary }}</p>
      </div>
      <div class="gallery">
        <a
          v-for="example in group.examples"
          :key="example.link"
          class="card"
          :href="withBase(example.link)"
          :style="{ '--hue': example.hue }"
        >
          <div class="art" :data-art="example.art" aria-hidden="true">
            <template v-if="example.art === 'dashboard'">
              <div class="kpis"><i /><i /><i /></div>
              <div class="chips"><b /><b /><b /><b /></div>
              <div class="rows"><i v-for="n in 4" :key="n" /></div>
            </template>
            <template v-else-if="example.art === 'cards'">
              <div class="tiles">
                <i v-for="n in 6" :key="n"><u /></i>
              </div>
            </template>
            <template v-else-if="example.art === 'network'">
              <div class="rows"><i v-for="n in 3" :key="n" /></div>
              <div class="log">
                <span v-for="n in 4" :key="n"
                  ><em /><s :style="{ width: `${30 + n * 12}%` }"
                /></span>
              </div>
            </template>
            <template v-else-if="example.art === 'sheet'">
              <div class="cells">
                <i v-for="n in 20" :key="n" :class="{ on: n === 8, range: n === 9 || n === 13 }" />
              </div>
            </template>
            <template v-else-if="example.art === 'report'">
              <div class="bars">
                <i v-for="n in 4" :key="n" :style="{ height: `${35 + n * 14}%` }" />
              </div>
              <div class="rows grouped"><i v-for="n in 4" :key="n" /></div>
            </template>
            <template v-else>
              <div class="rows"><i v-for="n in 5" :key="n" /></div>
            </template>
          </div>
          <div class="text">
            <span class="layer">{{ example.layer }}</span>
            <h3>{{ example.title }}</h3>
            <p>{{ example.summary }}</p>
            <ul class="tags">
              <li v-for="tag in example.tags" :key="tag">{{ tag }}</li>
            </ul>
          </div>
        </a>
      </div>
    </section>
  </div>
</template>

<style scoped>
.gallery-groups {
  display: grid;
  gap: 3rem;
  margin: 2rem 0;
}

.group-intro {
  display: grid;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.group-intro h2 {
  margin: 0;
  color: var(--vp-c-text-1);
  font-size: clamp(1.375rem, 3vw, 1.625rem);
  font-weight: 650;
  line-height: 1.2;
  letter-spacing: -0.02em;
  text-wrap: balance;
}

.group-intro p {
  max-width: 65ch;
}

.gallery {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr));
  gap: 18px;
}

.card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: inherit;
  text-decoration: none;
  background: var(--vy-card);
  border: 1px solid var(--vy-card-border);
  border-radius: var(--vy-radius-lg);
  box-shadow: 0 1px 1px rgb(19 18 26 / 0.04);
  transition:
    transform 0.35s var(--vy-ease),
    box-shadow 0.35s var(--vy-ease),
    border-color 0.35s var(--vy-ease);
}

.card:hover,
.card:focus-visible {
  transform: translateY(-3px);
  border-color: color-mix(in srgb, var(--hue) 45%, var(--vy-card-border));
  box-shadow: 0 24px 48px -20px color-mix(in srgb, var(--hue) 45%, transparent);
}

.art {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 150px;
  padding: 18px 18px 0;
  overflow: hidden;
  background:
    radial-gradient(
      120% 90% at 100% 0%,
      color-mix(in srgb, var(--hue) 30%, transparent),
      transparent 60%
    ),
    linear-gradient(var(--vy-grid-line) 1px, transparent 1px) 0 0 / 100% 18px,
    var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vy-card-border);
}

.art i,
.art b,
.art u,
.art em,
.art s {
  display: block;
  font-style: normal;
  text-decoration: none;
}

.rows {
  display: grid;
  gap: 6px;
  padding: 10px;
  background: var(--vy-card);
  border: 1px solid var(--vy-card-border);
  border-radius: 10px 10px 0 0;
  flex: 1;
}

.rows i {
  height: 10px;
  border-radius: 4px;
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--hue) 55%, transparent) 0 18%,
    var(--vy-grid-line) 18% 22%,
    color-mix(in srgb, var(--vp-c-text-3) 22%, transparent) 22% 70%,
    transparent 70% 78%,
    color-mix(in srgb, var(--vp-c-text-3) 30%, transparent) 78% 100%
  );
}

.rows.grouped i:nth-child(odd) {
  background: color-mix(in srgb, var(--hue) 30%, transparent);
}

.kpis {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.kpis i {
  height: 28px;
  background: var(--vy-card);
  border: 1px solid var(--vy-card-border);
  border-radius: 8px;
  box-shadow: inset 3px 0 0 var(--hue);
}

.chips {
  display: flex;
  gap: 6px;
}

.chips b {
  width: 36px;
  height: 12px;
  border-radius: 99px;
  background: color-mix(in srgb, var(--vp-c-text-3) 25%, transparent);
}

.chips b:first-child {
  background: var(--hue);
}

.tiles {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.tiles i {
  height: 50px;
  padding: 8px;
  background: var(--vy-card);
  border: 1px solid var(--vy-card-border);
  border-radius: 10px;
}

.tiles u {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--hue), #e1583a);
}

.log {
  display: grid;
  gap: 5px;
  padding: 8px 10px;
  background: #0b0a13;
  border-radius: 8px;
}

.log span {
  display: flex;
  align-items: center;
  gap: 6px;
}

.log em {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #37d399;
}

.log span:last-child em {
  background: #ff9a7a;
}

.log s {
  height: 6px;
  border-radius: 3px;
  background: rgb(255 255 255 / 0.18);
}

.cells {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0;
  background: var(--vy-card);
  border: 1px solid var(--vy-card-border);
  border-radius: 10px 10px 0 0;
  overflow: hidden;
  flex: 1;
}

.cells i {
  border-right: 1px solid var(--vy-card-border);
  border-bottom: 1px solid var(--vy-card-border);
}

.cells i.range {
  background: color-mix(in srgb, var(--hue) 18%, transparent);
}

.cells i.on {
  background: color-mix(in srgb, var(--hue) 18%, transparent);
  box-shadow: inset 0 0 0 2px var(--hue);
}

.bars {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  height: 46px;
}

.bars i {
  flex: 1;
  border-radius: 6px 6px 2px 2px;
  background: linear-gradient(180deg, var(--hue), color-mix(in srgb, var(--hue) 35%, transparent));
}

.text {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px 18px 18px;
}

.layer {
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--hue) 70%, var(--vp-c-text-1));
}

h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 650;
  letter-spacing: -0.01em;
  color: var(--vp-c-text-1);
}

p {
  margin: 0;
  font-size: 14px;
  line-height: 1.55;
  color: var(--vp-c-text-2);
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 6px 0 0;
  padding: 0;
  list-style: none;
}

.tags li {
  padding: 2px 8px;
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vy-card-border);
  border-radius: 99px;
}
</style>
