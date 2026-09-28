<script setup lang="ts">
import { onBeforeUnmount, ref } from "vue";

const props = defineProps<{ readonly command: string }>();

const copied = ref(false);
let timer: ReturnType<typeof setTimeout> | undefined;

async function copy(): Promise<void> {
  try {
    await navigator.clipboard.writeText(props.command);
  } catch {
    // Clipboard access can be refused; the command stays on screen to copy by hand.
    return;
  }
  copied.value = true;
  clearTimeout(timer);
  timer = setTimeout(() => {
    copied.value = false;
  }, 1800);
}

onBeforeUnmount(() => clearTimeout(timer));
</script>

<template>
  <div class="copy-command">
    <span class="prompt" aria-hidden="true">$</span>
    <code>{{ command }}</code>
    <button
      type="button"
      class="copy"
      :class="{ copied }"
      :aria-label="`Copy ${command}`"
      @click="copy"
    >
      <svg v-if="!copied" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="9" y="9" width="11" height="11" rx="2.5" />
        <path d="M5 15V6.5A2.5 2.5 0 0 1 7.5 4H15" />
      </svg>
      <svg v-else viewBox="0 0 24 24" aria-hidden="true">
        <path d="m5 12.5 4.5 4.5L19 7.5" />
      </svg>
    </button>
    <span class="status" role="status">{{ copied ? "Copied to the clipboard" : "" }}</span>
  </div>
</template>

<style scoped>
.copy-command {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 6px 6px 6px 16px;
  font-family: var(--vp-font-family-mono);
  font-size: 13.5px;
  color: var(--vp-c-text-1);
  background: var(--vy-glass);
  border: 1px solid var(--vy-glass-border);
  border-radius: 12px;
  backdrop-filter: blur(12px);
}

.prompt {
  color: var(--vp-c-brand-1);
  font-weight: 600;
}

code {
  font-family: inherit;
  white-space: nowrap;
}

.copy {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  color: var(--vp-c-text-2);
  border-radius: 8px;
  transition:
    color 0.2s,
    background-color 0.2s;
}

.copy:hover {
  color: var(--vp-c-text-1);
  background: var(--vp-c-default-soft);
}

.copy.copied {
  color: #22b573;
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
</style>
