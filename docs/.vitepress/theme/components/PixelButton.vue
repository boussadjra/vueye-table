<script setup lang="ts">
defineProps<{ href: string }>();

function trackPointer(event: PointerEvent): void {
  if (event.type === "pointermove" && event.pointerType === "touch") return;

  const link = event.currentTarget as HTMLAnchorElement;
  const bounds = link.getBoundingClientRect();
  link.style.setProperty("--vy-button-x", `${event.clientX - bounds.left}px`);
  link.style.setProperty("--vy-button-y", `${event.clientY - bounds.top}px`);
}
</script>

<template>
  <a
    class="vy-button primary"
    :href="href"
    @pointerenter="trackPointer"
    @pointermove="trackPointer"
    @pointerdown="trackPointer"
  >
    <span class="vy-button-label"><slot /></span>
  </a>
</template>

<style scoped>
/* Pixel ripple inspired by https://github.com/wesbos/button-challenge. */
.vy-button.primary {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  color: #fff;
  background: linear-gradient(rgb(0 0 0 / 0.24), rgb(0 0 0 / 0.24)), var(--vy-gradient-strong);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.24),
    inset 0 -2px 3px rgb(40 8 62 / 0.24),
    0 10px 30px -10px rgb(160 45 230 / 0.75);
  transition: transform 160ms var(--vy-ease);
}

.vy-button.primary::before,
.vy-button.primary::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background: url("../assets/button-pixels.svg") repeat;
}

.vy-button.primary::before {
  opacity: 0.06;
}

.vy-button.primary::after {
  opacity: 0;
  mask-image: radial-gradient(
    ellipse 72px 52px at var(--vy-button-x, 50%) var(--vy-button-y, 50%),
    #000 10%,
    transparent 100%
  );
  transition: opacity 200ms var(--vy-ease);
}

.vy-button-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: inherit;
}

@media (hover: hover) and (pointer: fine) {
  .vy-button.primary:hover::after {
    opacity: 0.18;
  }
}

.vy-button.primary:focus-visible::after,
.vy-button.primary:active::after {
  opacity: 0.18;
}

.vy-button.primary:focus-visible::after {
  mask-image: radial-gradient(ellipse 72px 52px at center, #000 10%, transparent 100%);
}

@media (prefers-reduced-motion: reduce) {
  .vy-button.primary::after {
    mask-image: none;
  }

  .vy-button.primary:active {
    transform: none;
  }
}
</style>
