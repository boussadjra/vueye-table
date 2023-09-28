<script setup lang="ts"></script>
<template>
  <kbd class="kbd">
    <slot></slot>
  </kbd>
</template>

<style scoped>
.kbd {
  @apply bg-slate-300 dark:bg-slate-800   px-1 flex items-center text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-50 focus:ring-slate-500 transition duration-500 ease-in-out;
}
</style>
