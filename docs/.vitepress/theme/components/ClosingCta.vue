<script setup lang="ts">
import { withBase } from "vitepress";

import CopyCommand from "./CopyCommand.vue";
</script>

<template>
  <section class="vy-section vy-cta" aria-labelledby="vy-cta-title">
    <div class="card">
      <div class="grid" aria-hidden="true" />
      <img class="logo" :src="withBase('/logo.svg')" alt="" width="96" height="96" />
      <h2 id="vy-cta-title" class="vy-h2">Start with <em>one</em> tag.</h2>
      <p class="vy-section-lede">
        Drop down a layer whenever you need more control. Columns, state, and data stay the same.
      </p>
      <div class="actions">
        <a class="vy-button primary" :href="withBase('/guide/getting-started')">
          Get started
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11m-4-4 4 4-4 4" /></svg>
        </a>
        <a class="vy-button ghost" href="https://github.com/boussadjra/vueye-table">
          <svg viewBox="0 0 24 24" aria-hidden="true" class="github">
            <path
              d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.1-1.46-1.1-1.46-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.08.63-1.33-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.58 9.58 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z"
            />
          </svg>
          View on GitHub
        </a>
      </div>
      <CopyCommand command="pnpm add vueye-table" />
      <p class="fine">
        3.0.0-alpha: the API is provisional and may change between alpha releases. The 2.x component
        lives on the
        <a href="https://github.com/boussadjra/vueye-table/tree/legacy">legacy branch</a>.
      </p>
    </div>
  </section>
</template>

<style scoped>
.vy-cta {
  padding-bottom: clamp(96px, 12vw, 144px);
}

.card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: clamp(56px, 8vw, 96px) 24px;
  overflow: hidden;
  text-align: center;
  background:
    radial-gradient(70% 90% at 50% 0%, rgb(160 45 230 / 0.2), transparent 70%),
    radial-gradient(50% 60% at 85% 100%, rgb(225 88 58 / 0.14), transparent 70%),
    radial-gradient(50% 60% at 10% 100%, rgb(12 147 223 / 0.14), transparent 70%), var(--vy-card);
  border: 1px solid var(--vy-card-border);
  border-radius: 28px;
  isolation: isolate;
}

.grid {
  position: absolute;
  inset: 0;
  z-index: -1;
  background-image:
    linear-gradient(to right, var(--vy-grid-line) 1px, transparent 1px),
    linear-gradient(to bottom, var(--vy-grid-line) 1px, transparent 1px);
  background-size: 56px 56px;
  background-position: center top;
  mask-image: radial-gradient(ellipse 70% 80% at 50% 0%, #000 20%, transparent 80%);
}

.logo {
  width: 96px;
  height: 96px;
  filter: drop-shadow(0 18px 40px rgb(160 45 230 / 0.45));
  animation: float 7s ease-in-out infinite;
}

@keyframes float {
  50% {
    transform: translateY(-8px) rotate(4deg);
  }
}

.vy-h2 {
  margin-top: 28px;
}

.vy-section-lede {
  max-width: 34rem;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  margin: 36px 0 20px;
}

.github {
  fill: currentcolor !important;
  stroke: none !important;
}

.fine {
  max-width: 36rem;
  margin-top: 32px;
  font-size: 13.5px;
  line-height: 1.6;
  color: var(--vp-c-text-3);
}

.fine a {
  color: var(--vp-c-text-2);
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
}

.fine a:hover {
  color: var(--vp-c-brand-1);
}

@media (max-width: 639px) {
  .actions .vy-button {
    flex: 1 1 auto;
  }
}
</style>
