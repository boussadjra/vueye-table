<script setup lang="ts">
import { toggleDark, isDark } from '../../composables'
</script>

<template>
    <button class="h-6 w-6" @click="() => toggleDark()">
        <span v-if="isDark">🌞</span>
        <span v-else>🌚</span>
    </button>
</template>

<style></style>
