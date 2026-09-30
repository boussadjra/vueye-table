<script setup lang="ts">
/* The side panel: every accepted edit with its A1 address, newest first. */
import type { ChangeEntry } from "./inventory";

defineProps<{
  readonly entries: readonly ChangeEntry[];
  readonly total: number;
  readonly exports: number;
}>();
</script>

<template>
  <section class="change-log" aria-label="Change log">
    <header class="log-head">
      <span class="log-label"><span class="log-dot" aria-hidden="true" />Change log</span>
      <span class="log-count">
        {{ total }} {{ total === 1 ? "cell" : "cells" }}
        <template v-if="exports > 0"> · {{ exports }} CSV</template>
      </span>
    </header>
    <div class="log-body">
      <div v-if="entries.length === 0" class="log-empty">
        <p class="empty-title">No changes yet</p>
        <p>
          Select an <b>On hand</b> cell, type a new count, and press Enter. Each accepted edit lands
          here with its address; rejected input goes to the validation panel instead.
        </p>
      </div>
      <TransitionGroup v-else name="log" tag="ol" class="log-list">
        <li v-for="entry in entries" :key="entry.id">
          <div class="line-top">
            <span class="ref">{{ entry.reference || "—" }}</span>
            <span class="product">{{ entry.product }}</span>
          </div>
          <div class="line-bottom">
            <span class="column">{{ entry.column }}</span>
            <span class="change">
              <span class="previous">{{ entry.previous || "empty" }}</span>
              <span class="arrow" aria-hidden="true">→</span>
              <span class="sr-only">to</span>
              <span class="value">{{ entry.value || "empty" }}</span>
              <span v-if="entry.delta" class="delta" :data-direction="entry.delta.direction">
                {{ entry.delta.text }}
              </span>
            </span>
          </div>
        </li>
      </TransitionGroup>
    </div>
    <footer class="log-foot">
      The seed array is frozen. Every edit, paste, undo, and redo arrives as a new array through
      <code>v-model:data</code>, and the totals above are plain computeds over it.
    </footer>
  </section>
</template>

<style scoped>
.change-log {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  color: #d9d7e8;
  background:
    radial-gradient(120% 60% at 100% 0%, rgb(12 147 223 / 0.16), transparent 60%),
    radial-gradient(90% 50% at 0% 100%, rgb(160 45 230 / 0.12), transparent 60%), #0b0a13;
}

.log-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid rgb(255 255 255 / 0.07);
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
}

.log-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #f3f1ff;
}

.log-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #6fd0ff;
  box-shadow: 0 0 0 3px rgb(111 208 255 / 0.18);
}

.log-count {
  padding: 2px 8px;
  font-size: 11px;
  color: #b7b3cc;
  background: rgb(255 255 255 / 0.06);
  border-radius: 999px;
  font-variant-numeric: tabular-nums;
}

.log-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 14px 16px;
}

.log-empty {
  font-size: 13px;
  line-height: 1.6;
  color: #a9a5c0;
}

.log-empty p {
  margin: 0;
}

.log-empty b {
  color: #e9e4ff;
  font-weight: 600;
}

.log-empty .empty-title {
  margin-bottom: 6px;
  font-family: var(--vy-font-serif);
  font-style: italic;
  font-size: 20px;
  color: #f3f1ff;
}

.log-list {
  display: grid;
  gap: 7px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.log-list li {
  display: grid;
  gap: 5px;
  padding: 8px 10px;
  background: rgb(255 255 255 / 0.035);
  border: 1px solid rgb(255 255 255 / 0.06);
  border-radius: 10px;
}

.line-top,
.line-bottom {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.line-bottom {
  justify-content: space-between;
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
}

.ref {
  flex: none;
  padding: 1px 7px;
  font-family: var(--vp-font-family-mono);
  font-size: 11.5px;
  font-weight: 600;
  color: #fff;
  background: var(--vy-gradient-strong);
  border-radius: 5px;
}

.product {
  overflow: hidden;
  font-size: 13px;
  font-weight: 500;
  color: #f3f1ff;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.column {
  color: #c9a6ff;
}

.change {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-variant-numeric: tabular-nums;
}

.previous {
  color: #7f7b96;
  text-decoration: line-through;
}

.arrow {
  color: #7f7b96;
}

.value {
  color: #6fd0ff;
}

.delta {
  padding: 0 6px;
  font-size: 11px;
  border-radius: 999px;
}

.delta[data-direction="up"] {
  color: #7ee2a8;
  background: rgb(126 226 168 / 0.12);
}

.delta[data-direction="down"] {
  color: #ffb38a;
  background: rgb(255 179 138 / 0.12);
}

.log-foot {
  padding: 12px 16px;
  border-top: 1px solid rgb(255 255 255 / 0.07);
  font-size: 12.5px;
  line-height: 1.55;
  color: #a9a5c0;
}

.log-foot code {
  font-family: var(--vp-font-family-mono);
  white-space: nowrap;
  font-size: 0.92em;
  color: #e9e4ff;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.log-enter-active {
  transition:
    opacity 0.35s var(--vy-ease),
    transform 0.35s var(--vy-ease);
}

.log-enter-from {
  opacity: 0;
  transform: translateY(-6px);
}

.log-move {
  transition: transform 0.35s var(--vy-ease);
}
</style>
