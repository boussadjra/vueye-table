<script setup lang="ts">
/* A live demo in window chrome, with an optional panel beside it for what the demo reports. */
defineProps<{ readonly title: string }>();
const slots = defineSlots<{
  default(): unknown;
  side?(): unknown;
}>();
</script>

<template>
  <figure class="vy-demo vp-raw">
    <div class="chrome">
      <span class="dots" aria-hidden="true"><i /><i /><i /></span>
      <span class="title">{{ title }}</span>
      <span class="live"><i aria-hidden="true" />Live</span>
    </div>
    <div class="body" :class="{ 'has-side': slots.side }">
      <div class="main"><slot /></div>
      <div v-if="slots.side" class="side"><slot name="side" /></div>
    </div>
  </figure>
</template>

<style scoped>
.vy-demo {
  container-type: inline-size;
  margin: 28px 0;
  overflow: hidden;
  background: var(--vy-card);
  border: 1px solid var(--vy-card-border);
  border-radius: var(--vy-radius-lg);
  box-shadow: var(--vy-elevation);
}

.chrome {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--vy-card-border);
}

.dots {
  display: inline-flex;
  gap: 7px;
}

.dots i {
  width: 11px;
  height: 11px;
  border-radius: 50%;
}

.dots i:nth-child(1) {
  background: #e1583a;
}

.dots i:nth-child(2) {
  background: #f2b34a;
}

.dots i:nth-child(3) {
  background: #3dbb7b;
}

.title {
  font-family: var(--vp-font-family-mono);
  font-size: 12.5px;
  color: var(--vp-c-text-2);
}

.live {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-left: auto;
  font-size: 12px;
  color: var(--vp-c-text-3);
}

.live i {
  width: 7px;
  height: 7px;
  background: #37d399;
  border-radius: 50%;
  box-shadow: 0 0 0 3px rgb(55 211 153 / 0.18);
}

.body {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
}

.main {
  min-width: 0;
  padding: 18px;
}

.side {
  min-width: 0;
  height: 280px;
  border-top: 1px solid var(--vy-card-border);
}

@container (min-width: 900px) {
  .body.has-side {
    grid-template-columns: minmax(0, 1fr) 340px;
  }

  .side {
    height: auto;
    border-top: 0;
    border-left: 1px solid var(--vy-card-border);
  }
}

@media (max-width: 639px) {
  .vy-demo {
    margin-inline: -24px;
    border-inline: 0;
    border-radius: 0;
  }

  .main {
    padding: 12px;
  }
}
</style>
