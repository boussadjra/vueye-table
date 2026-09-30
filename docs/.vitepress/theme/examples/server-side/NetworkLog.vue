<script setup lang="ts">
import { computed } from "vue";

import type { RequestEntry, RequestStatus } from "./use-issue-query";

/* A devtools-style log of the requests the table sends, newest first. */

const props = defineProps<{ readonly requests: readonly RequestEntry[] }>();

const lines = computed(() =>
  props.requests.map((entry) => {
    const [path = "", query = ""] = entry.url.split("?");
    return {
      ...entry,
      path,
      params: query
        .split("&")
        .filter(Boolean)
        .map((pair) => {
          const [key = "", value = ""] = pair.split("=");
          return { key, value: decodeURIComponent(value) };
        }),
    };
  }),
);

const counts = computed(() => {
  let done = 0;
  let aborted = 0;
  for (const entry of props.requests) {
    if (entry.status === "aborted") {
      aborted += 1;
    } else if (entry.status !== "pending") {
      done += 1;
    }
  }
  return { done, aborted };
});

function statusText(status: RequestStatus): string {
  return status === "pending" ? "pending" : status === "aborted" ? "aborted" : String(status);
}

function statusTone(status: RequestStatus): string {
  return status === 200 ? "ok" : status === 500 ? "error" : String(status);
}

/** The waterfall bar spans 0 to 800 ms. */
function barWidth(entry: RequestEntry): string {
  return `${Math.min(100, Math.max(3, ((entry.duration ?? 0) / 800) * 100))}%`;
}
</script>

<template>
  <div class="network">
    <div class="net-head">
      <span class="net-label"><span class="net-dot" aria-hidden="true" />Network</span>
      <span class="net-count">
        {{ counts.done }} answered<template v-if="counts.aborted">
          · {{ counts.aborted }} aborted</template
        >
      </span>
    </div>
    <div class="net-columns" aria-hidden="true">
      <span>Request</span>
      <span>Status</span>
      <span>Time</span>
    </div>
    <div class="net-body">
      <p v-if="lines.length === 0" class="net-empty">
        Waiting for the first request. Page, sort, search, or filter and each request lands here.
      </p>
      <TransitionGroup
        v-else
        name="net"
        tag="ol"
        class="net-list"
        aria-label="Requests, newest first"
      >
        <li v-for="line in lines" :key="line.id" :class="`is-${statusTone(line.status)}`">
          <span class="request">
            <span class="method">GET</span>
            <span class="path">{{ line.path }}</span>
          </span>
          <span class="status" :class="`tone-${statusTone(line.status)}`">
            <span class="status-dot" aria-hidden="true" />{{ statusText(line.status) }}
          </span>
          <span class="time">
            <template v-if="line.duration !== undefined"
              >{{ Math.round(line.duration) }} ms</template
            >
            <template v-else>…</template>
          </span>
          <span class="url"
            ><template v-for="(param, index) in line.params" :key="param.key"
              ><wbr v-if="index > 0" /><span class="pair"
                ><span class="sep">{{ index === 0 ? "?" : "&" }}</span
                ><span class="param">{{ param.key }}</span
                ><span class="sep">=</span><span class="value">{{ param.value }}</span></span
              ></template
            ></span
          >
          <span class="bar" aria-hidden="true">
            <i :style="line.duration !== undefined ? { width: barWidth(line) } : undefined" />
          </span>
        </li>
      </TransitionGroup>
    </div>
    <div class="net-foot">
      Each change to the table's state sends one <code>GET</code>. A newer request aborts the one in
      flight, and search waits for a 300 ms pause.
    </div>
  </div>
</template>

<style scoped>
.network {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  color: #d9d7e8;
  background:
    radial-gradient(120% 60% at 100% 0%, rgb(12 147 223 / 0.16), transparent 60%), #0b0a13;
  font-family: var(--vp-font-family-mono);
}

.net-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid rgb(255 255 255 / 0.07);
  font-size: 12px;
}

.net-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #f3f1ff;
}

.net-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #6fd0ff;
  box-shadow: 0 0 0 3px rgb(111 208 255 / 0.18);
}

.net-count {
  padding: 2px 8px;
  font-size: 11px;
  color: #b7b3cc;
  background: rgb(255 255 255 / 0.06);
  border-radius: 999px;
  font-variant-numeric: tabular-nums;
}

.net-columns {
  display: grid;
  grid-template-columns: 1fr auto 56px;
  gap: 12px;
  padding: 6px 16px;
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7f7b96;
  border-bottom: 1px solid rgb(255 255 255 / 0.05);
}

.net-columns span:nth-child(3) {
  text-align: right;
}

.net-body {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.net-empty {
  margin: 0;
  padding: 14px 16px;
  font-family: var(--vp-font-family-base);
  font-size: 13px;
  line-height: 1.6;
  color: #a9a5c0;
}

.net-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.net-list li {
  position: relative;
  display: grid;
  grid-template-columns: 1fr auto 56px;
  gap: 3px 12px;
  align-items: start;
  padding: 8px 16px 9px;
  font-size: 11.5px;
  line-height: 1.5;
  border-bottom: 1px solid rgb(255 255 255 / 0.045);
  border-left: 2px solid transparent;
}

.net-list li.is-pending {
  background: rgb(111 208 255 / 0.05);
  border-left-color: #6fd0ff;
}

.net-list li.is-error {
  background: rgb(255 107 107 / 0.07);
  border-left-color: #ff6b6b;
}

.net-list li.is-aborted :is(.url, .path) {
  opacity: 0.55;
  text-decoration: line-through;
  text-decoration-color: rgb(255 255 255 / 0.25);
}

.request {
  min-width: 0;
  display: flex;
  gap: 7px;
}

.method {
  flex: none;
  font-weight: 700;
  color: #37d399;
}

.url {
  grid-column: 1 / -1;
  min-width: 0;
  padding-left: calc(3ch + 7px);
  color: #a9a5c0;
}

.pair {
  white-space: nowrap;
}

.path {
  min-width: 0;
  color: #f3f1ff;
  overflow-wrap: anywhere;
}

.sep {
  color: #7f7b96;
}

.param {
  color: #c9a6ff;
}

.value {
  color: #ffb38a;
  white-space: normal;
  overflow-wrap: anywhere;
}

.status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.status-dot {
  width: 6px;
  height: 6px;
  flex: none;
  border-radius: 50%;
  background: currentColor;
}

.tone-ok {
  color: #37d399;
}

.tone-error {
  color: #ff8a8a;
}

.tone-aborted {
  color: #8f8ba6;
}

.tone-pending {
  color: #6fd0ff;
}

.tone-pending .status-dot {
  animation: pulse 1s ease-in-out infinite;
}

.time {
  text-align: right;
  color: #b7b3cc;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.bar {
  grid-column: 1 / -1;
  position: relative;
  height: 3px;
  overflow: hidden;
  background: rgb(255 255 255 / 0.05);
  border-radius: 2px;
}

.bar i {
  position: absolute;
  inset: 0 auto 0 0;
  width: 3%;
  border-radius: inherit;
  background: #6fd0ff;
  transition: width 0.3s var(--vy-ease);
}

.is-ok .bar i {
  background: linear-gradient(90deg, #0c93df, #37d399);
}

.is-error .bar i {
  background: #ff6b6b;
}

.is-aborted .bar i {
  background: #5d5972;
}

.is-pending .bar i {
  width: 30%;
  animation: sweep 1.1s ease-in-out infinite;
}

.net-foot {
  padding: 12px 16px;
  border-top: 1px solid rgb(255 255 255 / 0.07);
  font-family: var(--vp-font-family-base);
  font-size: 12.5px;
  line-height: 1.55;
  color: #a9a5c0;
}

.net-foot code {
  font-family: var(--vp-font-family-mono);
  font-size: 0.92em;
  color: #e9e4ff;
}

.net-enter-active {
  transition:
    opacity 0.3s var(--vy-ease),
    transform 0.3s var(--vy-ease);
}

.net-enter-from {
  opacity: 0;
  transform: translateY(-6px);
}

.net-move {
  transition: transform 0.3s var(--vy-ease);
}

@keyframes pulse {
  50% {
    opacity: 0.35;
  }
}

@keyframes sweep {
  from {
    transform: translateX(-100%);
  }

  to {
    transform: translateX(340%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .is-pending .bar i,
  .tone-pending .status-dot {
    animation: none;
  }
}
</style>
