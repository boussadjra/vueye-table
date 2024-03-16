<script setup lang="ts">
defineProps({
    rate: {
        type: Number,
        default: 0,
    },
})
</script>
<template>
    <div class="flex gap-1">
        <span v-for="i in 5" :key="i" class="text-xs">
            <span
                class="i-tabler-star"
                :class="{
                    'text-yellow-500': i <= rate,
                    'text-slate-300': i > rate,
                }"
            ></span>
        </span>
    </div>
</template>

<style scoped></style>
