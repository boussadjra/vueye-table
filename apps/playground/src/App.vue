<script setup lang="ts">
import { ref, type Component } from "vue";

import FullTable from "./demos/FullTable.vue";
import HeadlessList from "./demos/HeadlessList.vue";
import ServerTable from "./demos/ServerTable.vue";
import Spreadsheet from "./demos/Spreadsheet.vue";
import StyledComposition from "./demos/StyledComposition.vue";

const demos: { id: string; label: string; component: Component }[] = [
  { id: "full", label: "Full table", component: FullTable },
  { id: "server", label: "Server data", component: ServerTable },
  { id: "styled", label: "Styled components", component: StyledComposition },
  { id: "headless", label: "Headless", component: HeadlessList },
  { id: "grid", label: "Spreadsheet", component: Spreadsheet },
];
const active = ref("full");
</script>

<template>
  <main>
    <h1>vueye-table</h1>
    <p class="lead">One engine, four layers: core, headless, styled, and the full table.</p>
    <nav class="tabs" aria-label="Demos">
      <button
        v-for="demo in demos"
        :key="demo.id"
        type="button"
        :aria-pressed="active === demo.id"
        @click="active = demo.id"
      >
        {{ demo.label }}
      </button>
    </nav>
    <template v-for="demo in demos" :key="demo.id">
      <component :is="demo.component" v-if="active === demo.id" />
    </template>
  </main>
</template>
