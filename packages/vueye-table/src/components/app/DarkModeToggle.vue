<script setup lang="ts">
import { toggleDark, isDark } from '../../composables'
</script>

<template>
    <button class="h-6 w-6" @click="() => toggleDark()">
        <span :class="isDark ? 'i-tabler-sun' : 'i-tabler-moon'" class="text-2xl" />
    </button>
</template>

<style scoped></style>
