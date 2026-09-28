<script setup lang="ts">
import type { EditEntry } from "../edit-log";

defineProps<{
  readonly edits: readonly EditEntry[];
  /** How many new arrays `update:data` has emitted. */
  readonly arrays: number;
  readonly csv: string;
}>();
</script>

<template>
  <div class="edit-log">
    <div class="log-head">
      <span class="log-label"><span class="log-dot" aria-hidden="true" />@edit</span>
      <span class="log-count">{{ arrays }} new arrays</span>
    </div>
    <div class="log-body">
      <p v-if="edits.length === 0 && !csv" class="log-empty">
        Click a cell and type a number, or paste a range. Each change lands here with its A1
        address.
      </p>
      <TransitionGroup v-else name="log" tag="ol" class="log-list">
        <li v-for="edit in edits" :key="edit.id">
          <span class="ref">{{ edit.reference }}</span>
          <span class="column">{{ edit.column }}</span>
          <span class="change">
            <span class="previous">{{ edit.previous }}</span>
            <span class="arrow" aria-hidden="true">→</span>
            <span class="sr-only">to</span>
            <span class="value">{{ edit.value }}</span>
          </span>
        </li>
      </TransitionGroup>
      <pre v-if="csv" class="csv"><span class="csv-label">export</span>{{ csv }}</pre>
    </div>
    <div class="log-foot">
      The array passed in is frozen and never touched. Every edit, undo, and redo arrives as a new
      array through <code>v-model:data</code>.
    </div>
  </div>
</template>

<style scoped>
.edit-log {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  color: #d9d7e8;
  background: radial-gradient(120% 60% at 100% 0%, rgb(225 88 58 / 0.14), transparent 60%), #0b0a13;
  font-family: var(--vp-font-family-mono);
}

.log-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid rgb(255 255 255 / 0.07);
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
  background: #ff9a7a;
  box-shadow: 0 0 0 3px rgb(255 154 122 / 0.18);
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
  font-size: 12.5px;
}

.log-empty {
  margin: 0;
  font-family: var(--vp-font-family-base);
  font-size: 13px;
  line-height: 1.6;
  color: #a9a5c0;
}

.log-list {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.log-list li {
  display: grid;
  grid-template-columns: auto auto 1fr;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  background: rgb(255 255 255 / 0.035);
  border: 1px solid rgb(255 255 255 / 0.06);
  border-radius: 9px;
}

.ref {
  padding: 1px 7px;
  font-weight: 600;
  color: #fff;
  background: var(--vy-gradient-strong);
  border-radius: 5px;
}

.column {
  color: #c9a6ff;
}

.change {
  justify-self: end;
  display: inline-flex;
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

.csv {
  margin: 12px 0 0;
  padding: 10px 12px;
  white-space: pre;
  overflow-x: auto;
  font-size: 11.5px;
  line-height: 1.6;
  color: #ffb38a;
  background: rgb(255 255 255 / 0.03);
  border: 1px dashed rgb(255 255 255 / 0.12);
  border-radius: 9px;
}

.csv-label {
  display: block;
  margin-bottom: 4px;
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7f7b96;
}

.log-foot {
  padding: 12px 16px;
  border-top: 1px solid rgb(255 255 255 / 0.07);
  font-family: var(--vp-font-family-base);
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
