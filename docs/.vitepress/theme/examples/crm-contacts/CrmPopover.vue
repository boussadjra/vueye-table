<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, useId } from "vue";

/*
 * A button that opens a small panel. It closes on Escape, on a click outside, and when the panel
 * calls `close`; focus returns to the button.
 */
withDefaults(
  defineProps<{
    readonly label: string;
    readonly placement?: "below" | "above";
    readonly align?: "start" | "end";
  }>(),
  { placement: "below", align: "start" },
);

defineSlots<{
  trigger(props: { open: boolean }): unknown;
  default(props: { close: () => void }): unknown;
}>();

const open = ref(false);
const root = ref<HTMLElement>();
const button = ref<HTMLButtonElement>();
const panelId = useId();

function close(refocus = true): void {
  if (!open.value) {
    return;
  }
  open.value = false;
  if (refocus) {
    button.value?.focus();
  }
}

async function toggle(): Promise<void> {
  open.value = !open.value;
  if (open.value) {
    await nextTick();
    root.value?.querySelector<HTMLElement>(".panel button, .panel input")?.focus();
  }
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape" && open.value) {
    event.stopPropagation();
    close();
  }
}

function onPointerDown(event: PointerEvent): void {
  if (open.value && root.value && !root.value.contains(event.target as Node)) {
    close(false);
  }
}

onMounted(() => {
  root.value?.ownerDocument.addEventListener("pointerdown", onPointerDown);
});
onBeforeUnmount(() => {
  root.value?.ownerDocument.removeEventListener("pointerdown", onPointerDown);
});
</script>

<template>
  <div ref="root" class="crm-popover" @keydown="onKeydown">
    <button
      ref="button"
      type="button"
      class="trigger"
      :aria-label="label"
      :aria-expanded="open"
      :aria-controls="panelId"
      @click="toggle"
    >
      <slot name="trigger" :open="open" />
    </button>
    <Transition name="pop">
      <div
        v-show="open"
        :id="panelId"
        class="panel"
        :data-placement="placement"
        :data-align="align"
      >
        <slot :close="() => close()" />
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.crm-popover {
  position: relative;
  display: inline-flex;
}

.trigger {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 34px;
  padding: 0 11px;
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  color: var(--crm-text-2);
  white-space: nowrap;
  cursor: pointer;
  background: var(--crm-control);
  border: 1px solid var(--crm-line);
  border-radius: 9px;
  transition:
    background 0.15s,
    border-color 0.15s,
    color 0.15s;
}

.trigger:hover,
.trigger[aria-expanded="true"] {
  color: var(--crm-text-1);
  background: var(--crm-control-hover);
}

.trigger:focus-visible {
  outline: 2px solid var(--crm-focus);
  outline-offset: 2px;
}

.panel {
  position: absolute;
  z-index: 30;
  min-width: 220px;
  padding: 6px;
  background: var(--crm-raised);
  border: 1px solid var(--crm-line);
  border-radius: 12px;
  box-shadow: var(--crm-shadow-pop);
}

.panel[data-placement="below"] {
  top: calc(100% + 6px);
}

.panel[data-placement="above"] {
  bottom: calc(100% + 8px);
}

.panel[data-align="start"] {
  left: 0;
}

.panel[data-align="end"] {
  right: 0;
}

.pop-enter-active,
.pop-leave-active {
  transition:
    opacity 0.14s ease,
    transform 0.14s var(--vy-ease);
}

.pop-enter-from,
.pop-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
}
</style>
