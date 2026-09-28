<script setup lang="ts">
import { withBase } from "vitepress";

import CopyCommand from "./CopyCommand.vue";
import HeroGrid from "./HeroGrid.vue";
import LiveShowcase from "./LiveShowcase.vue";

const facts = [
  "TypeScript-first",
  "SSR-safe",
  "Accessible markup",
  "Zero-dependency engine",
  "MIT licensed",
];
</script>

<template>
  <section class="vy-hero" aria-labelledby="vy-hero-title">
    <div class="aurora" aria-hidden="true">
      <span class="blob violet" />
      <span class="blob magenta" />
      <span class="blob blue" />
    </div>
    <HeroGrid />

    <div class="inner">
      <a class="eyebrow" :href="withBase('/guide/upgrading-from-2')">
        <span class="badge">v3 alpha</span>
        <span>Rebuilt from the ground up</span>
        <span class="arrow" aria-hidden="true">→</span>
      </a>

      <h1 id="vy-hero-title" class="title">The <em>data</em> framework for&nbsp;Vue.</h1>

      <p class="lede">
        A framework-independent engine searches, sorts, pages, selects, edits, and undoes. Headless
        components, a styled theme, and a full spreadsheet sit on top. Take one layer, or all of
        them.
      </p>

      <div class="actions">
        <a class="vy-button primary" :href="withBase('/guide/getting-started')">
          Get started
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11m-4-4 4 4-4 4" /></svg>
        </a>
        <a class="vy-button ghost" href="#layers">Explore the layers</a>
        <CopyCommand command="pnpm add vueye-table" />
      </div>

      <div class="showcase">
        <LiveShowcase />
      </div>

      <ul class="facts" aria-label="At a glance">
        <li v-for="fact in facts" :key="fact">{{ fact }}</li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.vy-hero {
  --vy-grid-top: var(--vp-nav-height);

  position: relative;
  isolation: isolate;
  margin-top: calc(var(--vp-nav-height) * -1);
  padding: calc(var(--vp-nav-height) + clamp(48px, 9vh, 104px)) 24px 0;
}

.aurora {
  position: absolute;
  inset: 0 0 auto;
  z-index: -1;
  height: 1000px;
  pointer-events: none;
}

.blob {
  position: absolute;
  left: 50%;
  border-radius: 50%;
  filter: blur(96px);
  opacity: 0.2;
}

.dark .blob {
  opacity: 0.34;
}

.violet {
  top: -160px;
  width: 640px;
  height: 480px;
  margin-left: -600px;
  background: #a02de6;
  animation: drift-a 24s ease-in-out infinite alternate;
}

.magenta {
  top: -40px;
  width: 540px;
  height: 420px;
  margin-left: 60px;
  background: #c9117f;
  animation: drift-b 28s ease-in-out infinite alternate;
}

.blue {
  top: 300px;
  width: 620px;
  height: 360px;
  margin-left: -300px;
  background: #0c93df;
  animation: drift-c 32s ease-in-out infinite alternate;
}

.dark .blue {
  opacity: 0.24;
}

@keyframes drift-a {
  to {
    transform: translate3d(120px, 60px, 0) scale(1.12);
  }
}

@keyframes drift-b {
  to {
    transform: translate3d(-100px, 90px, 0) scale(0.92);
  }
}

@keyframes drift-c {
  to {
    transform: translate3d(80px, -70px, 0) scale(1.08);
  }
}

.inner {
  position: relative;
  z-index: 1;
  max-width: 1200px;
  margin: 0 auto;
  text-align: center;
}

.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 4px 14px 4px 4px;
  font-size: 13.5px;
  font-weight: 500;
  color: var(--vp-c-text-2);
  background: var(--vy-glass);
  border: 1px solid var(--vy-glass-border);
  border-radius: 999px;
  backdrop-filter: blur(14px);
  transition:
    color 0.2s,
    border-color 0.2s;
}

.eyebrow:hover {
  color: var(--vp-c-text-1);
  border-color: rgb(160 45 230 / 0.45);
}

.badge {
  padding: 3px 10px;
  font-family: var(--vp-font-family-mono);
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: #fff;
  background: var(--vy-gradient-strong);
  border-radius: 999px;
}

.arrow {
  transition: transform 0.25s var(--vy-ease);
}

.eyebrow:hover .arrow {
  transform: translateX(3px);
}

.title {
  max-width: 11em;
  margin: 28px auto 0;
  font-size: clamp(3rem, 8.2vw, 6.5rem);
  font-weight: 700;
  line-height: 0.96;
  letter-spacing: -0.052em;
  color: var(--vp-c-text-1);
  text-wrap: balance;
}

.title em {
  padding: 0 0.1em 0 0.02em;
  font-family: var(--vy-font-serif);
  font-size: 1.14em;
  font-style: italic;
  font-weight: 400;
  letter-spacing: -0.02em;
  color: transparent;
  background: var(--vy-gradient) 0 0 / 200% 100%;
  background-clip: text;
  animation: shimmer 9s ease-in-out infinite alternate;
}

@keyframes shimmer {
  to {
    background-position: 100% 0;
  }
}

.lede {
  max-width: 40rem;
  margin: 26px auto 0;
  font-size: clamp(1.0625rem, 1.5vw, 1.25rem);
  line-height: 1.6;
  color: var(--vp-c-text-2);
  text-wrap: pretty;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 36px;
}

.showcase {
  position: relative;
  margin-top: clamp(56px, 8vw, 88px);
  animation: rise 0.9s var(--vy-ease) both;
}

.showcase::before {
  content: "";
  position: absolute;
  inset: 6% 8% -2%;
  z-index: -1;
  background: var(--vy-gradient);
  border-radius: 50%;
  filter: blur(90px);
  opacity: 0.22;
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(24px);
  }
}

.facts {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px 28px;
  margin-top: 40px;
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
}

.facts li {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.facts li::before {
  content: "";
  width: 6px;
  height: 6px;
  background: var(--vy-gradient);
  border-radius: 1.5px;
  transform: rotate(45deg);
}

@media (max-width: 639px) {
  .vy-hero {
    padding-inline: 16px;
  }

  .title {
    font-size: clamp(2.625rem, 12.5vw, 3.25rem);
  }

  .actions .vy-button {
    flex: 1 1 auto;
  }
}
</style>
