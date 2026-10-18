<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";

const props = defineProps<{ readonly command: string }>();

type CopyState = "idle" | "copying" | "copied" | "error";

const copyState = ref<CopyState>("idle");
const commandElement = ref<HTMLElement>();
const message = computed(() => {
  if (copyState.value === "copying") return "Copying command…";
  if (copyState.value === "copied") return "Copied to the clipboard";
  if (copyState.value === "error") return "Couldn't copy. Select the command and copy it manually.";
  return "";
});
let timer: ReturnType<typeof setTimeout> | undefined;
let request = 0;

async function copy(): Promise<void> {
  if (copyState.value === "copying") return;
  const currentRequest = ++request;
  const command = props.command;
  clearTimeout(timer);
  copyState.value = "copying";
  try {
    await navigator.clipboard.writeText(command);
  } catch {
    if (currentRequest === request) copyState.value = "error";
    return;
  }
  if (currentRequest !== request) return;
  copyState.value = "copied";
  timer = setTimeout(() => {
    copyState.value = "idle";
  }, 1800);
}

function selectCommand(): void {
  const element = commandElement.value;
  if (!element) return;
  element.focus();
  const selection = element.ownerDocument.getSelection();
  if (!selection) return;
  const range = element.ownerDocument.createRange();
  range.selectNodeContents(element);
  selection.removeAllRanges();
  selection.addRange(range);
}

watch(
  () => props.command,
  () => {
    request += 1;
    clearTimeout(timer);
    copyState.value = "idle";
  },
);

onBeforeUnmount(() => {
  request += 1;
  clearTimeout(timer);
});
</script>

<template>
  <div class="copy-command">
    <div class="command-line">
      <span class="prompt" aria-hidden="true">$</span>
      <code ref="commandElement" :tabindex="copyState === 'error' ? 0 : undefined">{{
        command
      }}</code>
      <button
        type="button"
        class="copy"
        :class="{ copied: copyState === 'copied' }"
        :aria-label="copyState === 'copying' ? 'Copying command' : `Copy ${command}`"
        :aria-busy="copyState === 'copying'"
        :disabled="copyState === 'copying'"
        @click="copy"
      >
        <svg v-if="copyState !== 'copied'" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="9" y="9" width="11" height="11" rx="2.5" />
          <path d="M5 15V6.5A2.5 2.5 0 0 1 7.5 4H15" />
        </svg>
        <svg v-else viewBox="0 0 24 24" aria-hidden="true">
          <path d="m5 12.5 4.5 4.5L19 7.5" />
        </svg>
      </button>
    </div>
    <span
      class="status"
      :class="{ visible: copyState === 'error' }"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      >{{ message }}</span
    >
    <button v-if="copyState === 'error'" type="button" class="select" @click="selectCommand">
      Select command
    </button>
  </div>
</template>

<style scoped>
.copy-command {
  display: inline-grid;
  max-width: 100%;
  padding: 6px 6px 6px 16px;
  font-family: var(--vp-font-family-mono);
  font-size: 13.5px;
  color: var(--vp-c-text-1);
  background: var(--vy-glass);
  border: 1px solid var(--vy-glass-border);
  border-radius: 12px;
  backdrop-filter: var(--vy-surface-filter);
}

.command-line {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
}

.prompt {
  color: var(--vp-c-brand-1);
  font-weight: 600;
}

code {
  font-family: inherit;
  overflow-wrap: anywhere;
  white-space: normal;
  user-select: all;
}

.copy {
  display: grid;
  place-items: center;
  width: 2.75rem;
  height: 2.75rem;
  color: var(--vp-c-text-2);
  border-radius: 8px;
  transition:
    color 0.2s,
    background-color 0.2s;
}

.copy:active:not(:disabled) {
  background: var(--vp-c-default-soft);
  transform: scale(0.94);
  transition: none;
}

.copy:disabled {
  opacity: 0.6;
  cursor: progress;
}

.copy:focus-visible,
.select:focus-visible,
code:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 3px;
}

.copy:hover {
  color: var(--vp-c-text-1);
  background: var(--vp-c-default-soft);
}

.copy.copied {
  color: var(--vp-c-brand-1);
}

.copy svg {
  width: 17px;
  height: 17px;
  fill: none;
  stroke: currentcolor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.status {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.status.visible {
  position: static;
  width: auto;
  height: auto;
  padding-block-start: 8px;
  padding-inline-end: 10px;
  overflow: visible;
  clip-path: none;
  white-space: normal;
  font-family: var(--vp-font-family-base);
  font-size: 0.8125rem;
  line-height: 1.5;
  color: var(--vp-c-text-1);
}

.select {
  justify-self: start;
  min-height: 2.75rem;
  padding-inline: 2px;
  font-family: var(--vp-font-family-base);
  font-size: 0.8125rem;
  color: var(--vp-c-brand-1);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.select:active {
  color: var(--vp-c-text-1);
}
</style>
