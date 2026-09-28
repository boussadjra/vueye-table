<script setup lang="ts">
import ClosingCta from "./ClosingCta.vue";
import FeatureBento from "./FeatureBento.vue";
import HeroSection from "./HeroSection.vue";
import LayerExplorer from "./LayerExplorer.vue";

/* The code for each layer comes from index.md, so the markdown pipeline highlights it. */
defineSlots<{
  full(): unknown;
  styled(): unknown;
  headless(): unknown;
  composables(): unknown;
  engine(): unknown;
}>();
</script>

<template>
  <div class="vy-home">
    <HeroSection />
    <LayerExplorer>
      <template #full><slot name="full" /></template>
      <template #styled><slot name="styled" /></template>
      <template #headless><slot name="headless" /></template>
      <template #composables><slot name="composables" /></template>
      <template #engine><slot name="engine" /></template>
    </LayerExplorer>
    <FeatureBento />
    <ClosingCta />
  </div>
</template>
