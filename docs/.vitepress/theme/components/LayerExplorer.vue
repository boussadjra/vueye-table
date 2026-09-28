<script setup lang="ts">
import { withBase } from "vitepress";
import { computed, ref } from "vue";

/*
 * The five packages as an exploded stack. Each plane is a tab; its panel shows the layer's code,
 * which the home page passes in as a named slot so the markdown pipeline highlights it.
 */

type LayerId = "full" | "styled" | "headless" | "composables" | "engine";

interface Layer {
  readonly id: LayerId;
  readonly name: string;
  readonly pkg: string;
  readonly summary: string;
  readonly when: string;
  readonly base: string;
  readonly link: string;
}

const layers: readonly Layer[] = [
  {
    id: "full",
    name: "Full UI",
    pkg: "vueye-table",
    summary:
      "<VueyeTable> and <VueyeGrid> give you a complete table or spreadsheet in one tag, with a v-model for every piece of state.",
    when: "you want a complete table or spreadsheet in one tag.",
    base: "Builds on the styled layer and re-exports every layer.",
    link: "/guide/getting-started",
  },
  {
    id: "styled",
    name: "Styled components",
    pkg: "@vueye-table/styled",
    summary:
      "Vt* components and a theme of CSS custom properties, with dark mode and three densities, arranged your own way.",
    when: "you want the look, arranged your own way.",
    base: "Builds on the headless layer.",
    link: "/guide/layers",
  },
  {
    id: "headless",
    name: "Headless components",
    pkg: "@vueye-table/headless",
    summary:
      "DataTable* and DataGrid* render accessible markup with aria and data attributes, and no styles at all.",
    when: "you want accessible behavior with your own markup and CSS.",
    base: "Builds on the composables.",
    link: "/guide/layers#headless",
  },
  {
    id: "composables",
    name: "Vue composables",
    pkg: "@vueye-table/vue",
    summary:
      "useDataTable and useDataGrid turn the engine into reactive state for your own components, and render nothing.",
    when: "you want reactive state and nothing rendered.",
    base: "Builds on the engine.",
    link: "/guide/layers",
  },
  {
    id: "engine",
    name: "Engine",
    pkg: "@vueye-table/core",
    summary:
      "Searches, filters, sorts, pages, selects, edits with undo, copies, pastes, and exports. It knows nothing about Vue and runs on a server.",
    when: "you are outside Vue, on a server, or writing a binding.",
    base: "No framework and no runtime dependencies.",
    link: "/guide/layers#engine",
  },
];

const active = ref<LayerId>("full");
const activeIndex = computed(() => layers.findIndex((layer) => layer.id === active.value));

function onKey(event: KeyboardEvent): void {
  const index = layers.findIndex((layer) => layer.id === active.value);
  const moves: Record<string, number> = {
    ArrowUp: index - 1,
    ArrowLeft: index - 1,
    ArrowDown: index + 1,
    ArrowRight: index + 1,
    Home: 0,
    End: layers.length - 1,
  };
  const target = moves[event.key];
  if (target === undefined) {
    return;
  }
  event.preventDefault();
  const next = layers[(target + layers.length) % layers.length];
  if (next) {
    active.value = next.id;
    const stack = (event.currentTarget as HTMLElement).parentElement;
    stack?.querySelector<HTMLElement>(`[data-layer="${next.id}"]`)?.focus();
  }
}
</script>

<template>
  <section id="layers" class="vy-section vy-layers" aria-labelledby="vy-layers-title">
    <header class="vy-section-head">
      <p class="vy-kicker">Architecture</p>
      <h2 id="vy-layers-title" class="vy-h2">Five layers. <em>One</em> engine.</h2>
      <p class="vy-section-lede">
        Each package depends only on the layers beneath it. Start at the top with one tag, and drop
        down a layer whenever you need more control. Columns, state, and data stay the same.
      </p>
    </header>

    <div class="explorer">
      <div class="stack-wrap">
        <div class="stack" role="tablist" aria-label="Layers" aria-orientation="vertical">
          <button
            v-for="(layer, index) in layers"
            :id="`layer-tab-${layer.id}`"
            :key="layer.id"
            type="button"
            role="tab"
            class="plane"
            :class="[layer.id, { active: index === activeIndex, above: index < activeIndex }]"
            :style="{ '--level': layers.length - 1 - index }"
            :data-layer="layer.id"
            :aria-selected="layer.id === active"
            :aria-controls="`layer-panel-${layer.id}`"
            :tabindex="layer.id === active ? 0 : -1"
            @click="active = layer.id"
            @keydown="onKey"
          >
            <span class="face">
              <span class="plane-pkg">{{ layer.pkg }}</span>
              <span class="plane-name">{{ layer.name }}</span>
            </span>
          </button>
        </div>
      </div>

      <div class="panels">
        <div
          v-for="(layer, index) in layers"
          :id="`layer-panel-${layer.id}`"
          :key="layer.id"
          class="panel"
          :class="[layer.id, { current: layer.id === active }]"
          role="tabpanel"
          :aria-labelledby="`layer-tab-${layer.id}`"
        >
          <p class="panel-kicker">
            <span class="level">{{ String(index + 1).padStart(2, "0") }} / 05</span>
            {{ layer.base }}
          </p>
          <h3 class="panel-title">{{ layer.name }}</h3>
          <code class="panel-pkg">{{ layer.pkg }}</code>
          <p class="panel-summary">{{ layer.summary }}</p>
          <p class="panel-when"><span>Use it when</span> {{ layer.when }}</p>
          <div class="panel-code vp-doc">
            <slot :name="layer.id" />
          </div>
          <a class="panel-link" :href="withBase(layer.link)">
            Read the guide <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </div>

    <a class="nuxt" :href="withBase('/guide/nuxt')">
      <span class="nuxt-badge">Nuxt 4</span>
      <span class="nuxt-text">
        <code>@vueye-table/nuxt</code> auto-imports the components and composables and adds the
        stylesheet.
      </span>
      <span class="nuxt-arrow" aria-hidden="true">→</span>
    </a>
  </section>
</template>

<style scoped>
.explorer {
  display: grid;
  grid-template-columns: minmax(0, 0.86fr) minmax(0, 1.14fr);
  align-items: center;
  gap: clamp(24px, 5vw, 64px);
}

/* The exploded stack. */

.stack-wrap {
  position: relative;
}

.stack-wrap::before {
  content: "";
  position: absolute;
  inset: 20% 10% 0;
  background: radial-gradient(closest-side, rgb(160 45 230 / 0.28), transparent);
  filter: blur(30px);
  pointer-events: none;
}

.stack {
  --plane-w: 330px;
  --plane-h: 206px;
  --gap: 66px;

  position: relative;
  height: 540px;
}

/*
 * Planes above the chosen one rise to open a gap over it, like an exploded drawing, and the
 * chosen one lifts a little into that gap.
 */
.plane {
  --raise: 0px;
  --hover: 0px;
  --c: #a02de6;

  position: absolute;
  top: calc(100% - 132px);
  left: 50%;
  z-index: var(--level);
  width: var(--plane-w);
  height: var(--plane-h);
  margin: calc(var(--plane-h) / -2) 0 0 calc(var(--plane-w) / -2);
  border-radius: 20px;
  transform: rotateX(57deg) rotateZ(-43deg)
    translateZ(calc(var(--level) * var(--gap) + var(--raise) + var(--hover)));
  transition:
    transform 0.55s var(--vy-ease),
    opacity 0.3s;
}

.plane.full {
  --c: #c9117f;
}

.plane.styled {
  --c: #e1583a;
}

.plane.headless {
  --c: #d7208f;
}

.plane.composables {
  --c: #a02de6;
}

.plane.engine {
  --c: #0c93df;
}

.plane:hover {
  --hover: 10px;
}

.plane.above {
  --raise: 48px;
}

.plane.active {
  --raise: 22px;
}

.plane:not(.active, :hover) {
  opacity: 0.6;
}

.plane:focus-visible {
  outline: none;
}

.face {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 4px;
  padding: 22px 24px;
  text-align: left;
  border: 1px solid color-mix(in srgb, var(--c) 55%, transparent);
  border-radius: inherit;
  background:
    linear-gradient(color-mix(in srgb, var(--c) 16%, transparent) 1px, transparent 1px) 0 0 / 100%
      40px,
    linear-gradient(90deg, color-mix(in srgb, var(--c) 16%, transparent) 1px, transparent 1px) 0 0 /
      66px 100%,
    color-mix(in srgb, var(--c) 12%, color-mix(in srgb, var(--vp-c-bg) 82%, transparent));
  box-shadow:
    inset 0 0 0 1px rgb(255 255 255 / 0.04),
    -18px 22px 40px -18px rgb(10 5 20 / 0.45);
  transition:
    background-color 0.3s,
    border-color 0.3s,
    box-shadow 0.3s;
}

.plane.full .face {
  background:
    linear-gradient(rgb(255 255 255 / 0.1) 1px, transparent 1px) 0 0 / 100% 40px,
    linear-gradient(90deg, rgb(255 255 255 / 0.1) 1px, transparent 1px) 0 0 / 66px 100%,
    linear-gradient(135deg, #8a24c9, #b0127a 55%, #c2410c);
}

.plane.active .face {
  border-color: var(--c);
  box-shadow:
    inset 0 0 0 1px rgb(255 255 255 / 0.08),
    0 0 0 1px var(--c),
    0 0 60px -6px color-mix(in srgb, var(--c) 70%, transparent),
    -24px 30px 50px -20px rgb(10 5 20 / 0.5);
}

.plane:focus-visible .face {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 4px;
}

.plane-pkg {
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  font-weight: 500;
  color: color-mix(in srgb, var(--c) 70%, var(--vp-c-text-1));
}

.plane-name {
  font-size: 23px;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--vp-c-text-1);
}

.plane.full .plane-pkg,
.plane.full .plane-name {
  color: #fff;
}

/* The panel. */

/* Every panel sits in the same cell, so switching layers never moves the stack. */
.panels {
  display: grid;
  min-width: 0;
}

.panel {
  --c: #a02de6;

  grid-area: 1 / 1;
  min-width: 0;
  transition:
    opacity 0.35s var(--vy-ease),
    transform 0.35s var(--vy-ease),
    visibility 0.35s;
}

.panel:not(.current) {
  visibility: hidden;
  opacity: 0;
  transform: translateY(8px);
}

.panel.full {
  --c: #c9117f;
}

.panel.styled {
  --c: #e1583a;
}

.panel.headless {
  --c: #d7208f;
}

.panel.engine {
  --c: #0c93df;
}

.panel-kicker {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  font-size: 14px;
  color: var(--vp-c-text-2);
}

.level {
  padding: 2px 9px;
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  background: color-mix(in srgb, var(--c) 16%, transparent);
  border: 1px solid color-mix(in srgb, var(--c) 40%, transparent);
  border-radius: 999px;
}

.panel-title {
  margin-top: 18px;
  font-size: clamp(1.75rem, 3vw, 2.25rem);
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.04em;
}

.panel-pkg {
  display: inline-block;
  margin-top: 10px;
  font-family: var(--vp-font-family-mono);
  font-size: 14px;
  color: var(--vp-c-brand-1);
}

.panel-summary {
  margin-top: 16px;
  font-size: 16px;
  line-height: 1.65;
  color: var(--vp-c-text-2);
}

.panel-when {
  margin-top: 10px;
  font-size: 15px;
  line-height: 1.6;
  color: var(--vp-c-text-1);
}

.panel-when span {
  font-weight: 600;
}

.panel-code {
  margin-top: 22px;
}

.panel-code :deep(div[class*="language-"]) {
  margin: 0;
  border: 1px solid var(--vy-card-border);
  border-radius: var(--vy-radius-md);
  box-shadow: var(--vy-elevation);
}

.panel-code :deep(div[class*="language-"] + div[class*="language-"]) {
  margin-top: 12px;
}

.panel-code :deep(code) {
  font-size: 13px;
}

.panel-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 20px;
  font-size: 15px;
  font-weight: 600;
  color: var(--vp-c-brand-1);
}

.panel-link span {
  transition: transform 0.25s var(--vy-ease);
}

.panel-link:hover span {
  transform: translateX(3px);
}

/* Nuxt. */

.nuxt {
  display: flex;
  align-items: center;
  gap: 16px;
  max-width: 760px;
  margin: clamp(40px, 6vw, 72px) auto 0;
  padding: 14px 20px 14px 14px;
  font-size: 15px;
  line-height: 1.5;
  color: var(--vp-c-text-2);
  background: var(--vy-card);
  border: 1px solid var(--vy-card-border);
  border-radius: 16px;
  transition:
    border-color 0.2s,
    transform 0.25s var(--vy-ease);
}

.nuxt:hover {
  border-color: rgb(0 220 130 / 0.45);
  transform: translateY(-1px);
}

.nuxt-badge {
  flex: none;
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 700;
  color: #04331f;
  background: #00dc82;
  border-radius: 10px;
}

.nuxt-text code {
  font-family: var(--vp-font-family-mono);
  font-size: 0.9em;
  color: var(--vp-c-text-1);
}

.nuxt-arrow {
  margin-left: auto;
  color: var(--vp-c-text-3);
}

@media (max-width: 959px) {
  .explorer {
    grid-template-columns: minmax(0, 1fr);
  }

  .stack {
    height: 440px;
  }
}

@media (max-width: 639px) {
  .stack {
    --plane-w: 248px;
    --plane-h: 156px;
    --gap: 46px;

    height: 360px;
  }

  .plane {
    top: calc(100% - 100px);
  }

  .face {
    padding: 16px 18px;
  }

  .plane-pkg {
    font-size: 11px;
  }

  .plane-name {
    font-size: 18px;
  }

  .nuxt {
    align-items: flex-start;
  }

  .nuxt-arrow {
    display: none;
  }
}
</style>
