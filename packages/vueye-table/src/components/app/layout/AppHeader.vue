<script setup lang="ts">
import DarkModeToggle from '../DarkModeToggle.vue'
import coloredLogo from '../../../assets/imgs/colored-logo.png'
</script>
<template>
    <header
        class="sticky top-0 z-50 flex flex-none flex-wrap items-center justify-between bg-primary-50 px-4 py-2 shadow-md shadow-indigo-900/5 transition duration-500 dark:shadow-none sm:px-6 lg:px-8 dark:bg-primary-950"
    >
        <div class="mr-6 flex lg:hidden">
            <button type="button" class="relative" aria-label="Open navigation">
                <Icon name="solar:hamburger-menu-broken" size="24" />
            </button>
        </div>
        <div class="relative flex flex-grow basis-0 items-center">
            <a aria-label="Home page" href="/">
                <span class="sr-only">Vueye table logo</span>
                <img :src="coloredLogo" alt="Vueye logo" class="h-12 w-auto"
            /></a>
        </div>

        <div class="relative flex basis-0 justify-end items-center gap-4 sm:gap-6 md:flex-grow text-slate-400">
            <DarkModeToggle />

            <a
                class="group flex items-center justify-center"
                aria-label="GitHub"
                href="https://github.com/boussadjra/vueye-table"
            >
                <span class="sr-only">GitHub repo</span>
                <span class="i-tabler-brand-github-filled" />
            </a>
        </div>
    </header>
</template>

<style scoped>
.centered {
    display: grid;
    place-items: center;
}
</style>
