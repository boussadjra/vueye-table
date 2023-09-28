<script setup lang="ts">
import coloredLogo from '../assets/colored-logo.png';
import AppBtn from './AppBtn.vue';
</script>

<template>
  <section class="flex justify-center gap-8 pt-28 items-center text-slate-700 dark:text-slate-300 mx-auto overflow-hidden pb-24">
    <div class="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
      <div class="w-full h-full">
        <div class="absolute w-full h-48 rounded bg-[#0c93df] blur-3xl opacity-30 left-0"></div>
      </div>
    </div>

    <div class="left text-left">
      <h1 class="text-7xl font-extrabold">Vueye Table</h1>
      <p class="text-2xl mt-3 max-w-lg dark:text-slate-400 text-slate-500">Unleash Data Brilliance with Vueye Table: Elevate Your Data Presentation</p>
      <div class="mt-10 gap-5 flex">
        <AppBtn size="lg" color="primary" tag="a" href="/guide/quick-start">
          <span>Quick Start</span>
          <span class="i-solar-rocket-broken" />
        </AppBtn>
        <AppBtn size="lg" outline tag="a" href="https://github.com/boussadjra/vueye-table" target="_blank">
          <span>GitHub</span>
          <span class="i-tabler-brand-github" />
        </AppBtn>
      </div>
    </div>
    <div class="right">
      <img :src="coloredLogo" alt="Vueye logo" class="h-80 w-auto" />
    </div>
  </section>
</template>
