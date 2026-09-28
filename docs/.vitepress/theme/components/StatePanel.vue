<script setup lang="ts">
import { computed, reactive, watch } from "vue";

import { tokenize } from "../json";

/*
 * Shows a plain object as JSON, one line per key, and briefly lights up the keys whose value
 * changed. Used to show that a table's state is plain, serializable data.
 */

const props = defineProps<{
  readonly value: object;
  readonly label: string;
  /** How many updates arrived so far, shown in the header. */
  readonly count?: number | undefined;
}>();

const slots = defineSlots<{ default?(): unknown }>();

const entries = computed(() =>
  Object.entries(props.value).map(([key, value]) => ({
    key,
    json: JSON.stringify(value) ?? "undefined",
  })),
);

const versions = reactive<Record<string, number>>({});

watch(entries, (next, previous) => {
  const before = new Map(previous.map((entry) => [entry.key, entry.json]));
  for (const entry of next) {
    if (before.has(entry.key) && before.get(entry.key) !== entry.json) {
      versions[entry.key] = (versions[entry.key] ?? 0) + 1;
    }
  }
});
</script>

<template>
  <div class="state-panel">
    <div class="state-head">
      <span class="state-label">
        <span class="state-dot" aria-hidden="true" />
        {{ label }}
      </span>
      <span v-if="count !== undefined" class="state-count">{{ count }} updates</span>
    </div>
    <div class="state-code">
      <div class="line"><span class="punctuation">{</span></div>
      <div
        v-for="(entry, index) in entries"
        :key="`${entry.key}:${versions[entry.key] ?? 0}`"
        class="line entry"
        :class="{ changed: versions[entry.key] }"
      >
        <span class="key">"{{ entry.key }}"</span><span class="punctuation">: </span
        ><span
          v-for="(token, position) in tokenize(entry.json)"
          :key="position"
          :class="token.kind"
          >{{ token.text }}</span
        ><span v-if="index < entries.length - 1" class="punctuation">,</span>
      </div>
      <div class="line"><span class="punctuation">}</span></div>
    </div>
    <div v-if="slots.default" class="state-foot"><slot /></div>
  </div>
</template>

<style scoped>
.state-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  color: #d9d7e8;
  background:
    radial-gradient(120% 60% at 100% 0%, rgb(160 45 230 / 0.16), transparent 60%), #0b0a13;
  font-family: var(--vp-font-family-mono);
}

.state-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid rgb(255 255 255 / 0.07);
  font-size: 12px;
}

.state-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #f3f1ff;
}

.state-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #37d399;
  box-shadow: 0 0 0 3px rgb(55 211 153 / 0.18);
}

.state-count {
  padding: 2px 8px;
  font-size: 11px;
  color: #b7b3cc;
  background: rgb(255 255 255 / 0.06);
  border-radius: 999px;
  font-variant-numeric: tabular-nums;
}

.state-code {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 14px 16px;
  font-size: 12px;
  line-height: 1.8;
}

.line {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.entry {
  margin: 0 -16px;
  padding-inline: calc(16px + 2ch) 16px;
  border-left: 2px solid transparent;
}

.entry.changed {
  animation: flash 1.4s var(--vy-ease);
}

@keyframes flash {
  0% {
    background: rgb(160 45 230 / 0.32);
    border-left-color: #e1583a;
  }

  100% {
    background: transparent;
    border-left-color: transparent;
  }
}

.key {
  color: #c9a6ff;
}

.string {
  color: #ffb38a;
}

.number {
  color: #6fd0ff;
}

.literal {
  color: #ff7ac3;
}

.punctuation {
  color: #7f7b96;
}

.state-foot {
  padding: 12px 16px;
  border-top: 1px solid rgb(255 255 255 / 0.07);
  font-family: var(--vp-font-family-base);
  font-size: 12.5px;
  line-height: 1.55;
  color: #a9a5c0;
}

.state-foot :deep(code) {
  font-family: var(--vp-font-family-mono);
  white-space: nowrap;
  font-size: 0.92em;
  color: #e9e4ff;
}
</style>
