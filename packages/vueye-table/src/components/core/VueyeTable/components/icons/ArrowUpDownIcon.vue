<script setup lang="ts">
const props = defineProps({
    down: Boolean,
})

const opacities = computed(() => ({
    up: props.down ? 0.5 : 1,
    down: props.down ? 1 : 0.5,
}))
</script>

<template>
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 16 16">
        <!-- Up Arrow -->
        <path
            :opacity="opacities.up"
            fill="currentColor"
            fillRule="evenodd"
            d="M2.22 5.53a.75.75 0 0 1 0-1.06l2.25-2.25a.75.75 0 0 1 1.06 0l2.25 2.25a.75.75 0 0 1-1.06 1.06l-.97-.97v5.69a.75.75 0 0 1-1.5 0V4.56l-.97.97a.75.75 0 0 1-1.06 0"
            clipRule="evenodd"
        ></path>
        <!-- Down Arrow -->
        <path
            :opacity="opacities.down"
            fill="currentColor"
            fillRule="evenodd"
            d="M13.78 10.47a.75.75 0 0 1 0 1.06l-2.25 2.25a.75.75 0 0 1-1.06 0l-2.25-2.25a.75.75 0 1 1 1.06-1.06l.97.97V5.75a.75.75 0 0 1 1.5 0v5.69l.97-.97a.75.75 0 0 1 1.06 0"
            clipRule="evenodd"
        ></path>
    </svg>
</template>
