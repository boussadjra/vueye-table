<script setup lang="ts">
import { Badge } from '@/components/ui/badge'
import { ref, onMounted, onUnmounted, computed } from 'vue'

const colors = ref(['#E1583A', '#C9117F', '#A02DE6'])
const shuffle = (array: string[]) => array.sort(() => Math.random() - 0.5)

const style = computed(() => {
    return {
        background: `linear-gradient(to right, ${colors.value.join(', ')})`,
        '-webkit-background-clip': 'text',
        '-webkit-text-fill-color': 'transparent',
        transition: 'background 1s',
    }
})

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
    <div class="py-20 sm:py-24 md:py-32 dark:bg-gradient-to-b from-vprimary-950 to-slate-900">
        <div class="flex flex-col items-center justify-center">
            <Badge class="mb-4" subtle>v2.0.0</Badge>
            <AppLogo class="w-32 h-32" />
            <h1
                class="gradient-text text-4xl sm:text-5xl md:text-6xl font-extrabold text-center text-slate-600 dark:text-slate-200 mt-4 uppercase"
                :style="style"
            >
                Vueye Table
            </h1>
            <p class="text-lg font-light">A Vue/Nuxt table component with a simple API and powerful features</p>
            <div class="mt-8 gap-2 flex">
                <Button to="/docs/getting-started">
                    <span>Get Started</span>
                    <span class="i-solar-rocket-linear ms-1"></span>
                </Button>
                <Button variant="secondary" to="/docs/installation">
                    <span>Installation</span>
                    <span class="i-solar-download-linear ms-1"></span>
                </Button>
            </div>
        </div>
        <AppDemo />
        <AppFeatures />
    </div>
</template>
<style scoped>
.gradient-text {
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    transition: background 1s;
}
</style>
