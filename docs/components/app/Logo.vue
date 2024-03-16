<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const colors = ref(['#E1583A', '#C9117F', '#A02DE6', '#0C93DF'])
const shuffle = (array: string[]) => array.sort(() => Math.random() - 0.5)
let interval: NodeJS.Timeout
onMounted(() => {
    interval = setInterval(() => {
        colors.value = shuffle(colors.value)
    }, 400)
})
onUnmounted(() => {
    clearInterval(interval)
})
</script>
<template>
    <svg class="" width="1132" height="1132" viewBox="0 0 1132 1132" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect y="565.685" width="173.913" height="173.913" transform="rotate(-45 0 565.685)" :fill="colors[0]" />
        <path
            d="M147.57 713.255L270.545 590.28L393.52 713.255L341.256 765.52C302.204 804.572 238.887 804.572 199.835 765.52L147.57 713.255Z"
            :fill="colors[1]"
        />
        <path
            d="M147.57 418.115L199.835 365.851C238.887 326.798 302.204 326.799 341.256 365.851L393.52 418.115L270.545 541.09L147.57 418.115Z"
            :fill="colors[2]"
        />
        <rect
            x="295.14"
            y="565.685"
            width="173.913"
            height="173.913"
            transform="rotate(-45 295.14 565.685)"
            :fill="colors[3]"
        />
        <path
            d="M365.851 341.256C326.798 302.203 326.798 238.887 365.851 199.834L418.115 147.57L541.09 270.545L418.115 393.52L365.851 341.256Z"
            :fill="colors[0]"
        />
        <rect
            x="442.71"
            y="418.115"
            width="173.913"
            height="173.913"
            transform="rotate(-45 442.71 418.115)"
            :fill="colors[1]"
        />
        <rect
            x="442.71"
            y="122.975"
            width="173.913"
            height="173.913"
            transform="rotate(-45 442.71 122.975)"
            :fill="colors[2]"
        />
        <path
            d="M590.28 270.545L713.255 147.57L765.52 199.835C804.572 238.887 804.572 302.203 765.52 341.256L713.255 393.52L590.28 270.545Z"
            :fill="colors[3]"
        />
        <rect
            x="590.28"
            y="565.685"
            width="173.913"
            height="173.913"
            transform="rotate(-45 590.28 565.685)"
            :fill="colors[2]"
        />
        <path
            d="M737.851 713.255L860.826 590.28L983.801 713.255L931.536 765.52C892.484 804.572 829.167 804.572 790.115 765.52L737.851 713.255Z"
            :fill="colors[3]"
        />
        <path
            d="M737.851 418.115L790.115 365.851C829.167 326.798 892.484 326.799 931.536 365.851L983.801 418.115L860.826 541.09L737.851 418.115Z"
            :fill="colors[0]"
        />
        <rect
            x="885.421"
            y="565.685"
            width="173.913"
            height="173.913"
            transform="rotate(-45 885.421 565.685)"
            :fill="colors[1]"
        />
        <path
            d="M365.851 931.536C326.798 892.484 326.798 829.167 365.851 790.115L418.115 737.851L541.09 860.826L418.115 983.801L365.851 931.536Z"
            :fill="colors[2]"
        />
        <rect
            x="442.71"
            y="1008.4"
            width="173.913"
            height="173.913"
            transform="rotate(-45 442.71 1008.4)"
            :fill="colors[3]"
        />
        <rect
            x="442.71"
            y="713.255"
            width="173.913"
            height="173.913"
            transform="rotate(-45 442.71 713.255)"
            :fill="colors[0]"
        />
        <path
            d="M590.28 860.826L713.255 737.851L765.52 790.115C804.572 829.167 804.572 892.484 765.52 931.536L713.255 983.801L590.28 860.826Z"
            :fill="colors[1]"
        />
    </svg>
</template>

<style scoped>
rect,
path {
    transition: fill 0.3s;
}
</style>
