<script setup lang="ts">
import { ref } from "vue";

import { PACKAGE_VERSION } from "./utils/operations";
const dark = ref(false);
const links = [
  { to: "/", label: "Orders" },
  { to: "/inventory", label: "Inventory" },
  { to: "/locations", label: "Locations" },
  { to: "/receiving", label: "Receiving" },
];
</script>

<template>
  <div class="operations" :data-theme="dark ? 'dark' : 'light'">
    <header class="app-header">
      <NuxtLink to="/" class="brand">Operations desk</NuxtLink>
      <span class="version">Local acceptance · {{ PACKAGE_VERSION }}</span>
      <button class="quiet" @click="dark = !dark">{{ dark ? "Light mode" : "Dark mode" }}</button>
    </header>
    <nav aria-label="Workspaces">
      <NuxtLink v-for="link in links" :key="link.to" :to="link.to">{{ link.label }}</NuxtLink>
    </nav>
    <main><NuxtPage /></main>
    <footer>
      Generated warehouse data. Saves persist in local SQLite. This project tests the published
      {{ PACKAGE_VERSION }} packages.
    </footer>
  </div>
</template>
